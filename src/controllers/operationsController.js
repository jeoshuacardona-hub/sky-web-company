const Ticket = require('../models/Ticket');
const InternalMessage = require('../models/InternalMessage');
const Task = require('../models/Task');
const User = require('../models/User');
const Lead = require('../models/Lead');

// ============ DASHBOARD ============
exports.dashboard = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const isAdmin = req.session.user.role === 'admin';
        
        // Stats de tickets
        const openTickets = await Ticket.countDocuments({ status: 'abierto' });
        const urgentTickets = await Ticket.countDocuments({ priority: 'urgente', status: { $ne: 'cerrado' } });
        const myTickets = await Ticket.countDocuments({ assignedTo: userId, status: { $in: ['abierto', 'en_proceso'] } });
        
        // Stats de mensajes
        const unreadMessages = await InternalMessage.countDocuments({ receiver: userId, read: false });
        
        // Stats de tareas
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: 'pendiente' });
        const overdueTasks = await Task.countDocuments({ 
            assignedTo: userId, 
            status: { $ne: 'completada' },
            dueDate: { $lt: new Date() }
        });
        
        res.render('pages/operations/index', {
            title: 'Back Office',
            stats: {
                openTickets,
                urgentTickets,
                myTickets,
                unreadMessages,
                pendingTasks,
                overdueTasks
            },
            isAdmin,
            currentUser: req.session.user
        });
    } catch (error) {
        next(error);
    }
};

// ============ TICKETS ============
exports.tickets = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const tickets = await Ticket.find(filter)
            .populate('reportedBy', 'fullName username')
            .populate('assignedTo', 'fullName username')
            .sort({ createdAt: -1 });
        
        const users = await User.find({}).select('fullName username');
        
        res.render('pages/operations/tickets', {
            title: 'Tickets',
            tickets,
            users,
            isAdmin,
            currentUser: req.session.user
        });
    } catch (error) {
        next(error);
    }
};

exports.createTicket = async (req, res) => {
    try {
        const { title, description, category, priority, clientName, clientContact, assignedTo } = req.body;
        
        if (!title || !description || !clientName) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }
        
        const ticket = await Ticket.create({
            title,
            description,
            category: category || 'consulta',
            priority: priority || 'media',
            clientName,
            clientContact: clientContact || '',
            reportedBy: req.session.userId,
            assignedTo: assignedTo || null
        });
        
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('createTicket error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.respondTicket = async (req, res) => {
    try {
        const { message, isInternal } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        }
        
        ticket.responses.push({
            from: req.session.userId,
            message,
            isInternal: isInternal !== false
        });
        
        if (ticket.status === 'abierto') {
            ticket.status = 'en_proceso';
        }
        
        await ticket.save();
        res.json({ success: true });
    } catch (error) {
        console.error('respondTicket error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
        }
        
        ticket.status = status;
        if (status === 'resuelto') ticket.resolvedAt = new Date();
        if (status === 'cerrado') ticket.closedAt = new Date();
        
        await ticket.save();
        res.json({ success: true });
    } catch (error) {
        console.error('updateTicketStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ MENSAJES ============
exports.messages = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        
        // Obtener conversaciones únicas
        const messages = await InternalMessage.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 });
        
        // Agrupar por usuario
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    messages: [],
                    unread: 0
                };
            }
            conversations[otherUserId].messages.push(msg);
            if (msg.receiver.toString() === userId && !msg.read) {
                conversations[otherUserId].unread++;
            }
        });
        
        // Obtener info de usuarios
        const users = await User.find({ _id: { $ne: userId } }).select('fullName username');
        
        res.render('pages/operations/messages', {
            title: 'Mensajes',
            conversations,
            users,
            currentUser: req.session.user
        });
    } catch (error) {
        next(error);
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;
        
        if (!receiver || !message) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }
        
        // Validar que no se envíe a sí mismo
        if (receiver === req.session.userId.toString()) {
            return res.status(400).json({ success: false, message: 'No puedes enviarte mensajes a ti mismo' });
        }
        
        // Validar que el receptor exista
        const receiverUser = await User.findById(receiver);
        if (!receiverUser) {
            return res.status(404).json({ success: false, message: 'Usuario receptor no encontrado' });
        }
        
        await InternalMessage.create({
            sender: req.session.userId,
            receiver,
            message
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConversation = async (req, res) => {
    try {
        const userId = req.session.userId;
        const otherUserId = req.params.userId;
        
        const messages = await InternalMessage.find({
            $or: [
                { sender: userId, receiver: otherUserId },
                { sender: otherUserId, receiver: userId }
            ]
        }).sort({ createdAt: 1 });
        
        // Marcar como leídos
        await InternalMessage.updateMany(
            { sender: otherUserId, receiver: userId, read: false },
            { $set: { read: true } }
        );
        
        res.json({ success: true, messages });
    } catch (error) {
        console.error('getConversation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ TAREAS ============
exports.tasks = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'fullName username')
            .populate('createdBy', 'fullName username')
            .populate('relatedLead', 'name')
            .sort({ dueDate: 1 });
        
        const users = await User.find({}).select('fullName username');
        const leads = await Lead.find({ status: { $ne: 'converted' } }).select('name');
        
        res.render('pages/operations/tasks', {
            title: 'Tareas',
            tasks,
            users,
            leads,
            isAdmin,
            currentUser: req.session.user
        });
    } catch (error) {
        next(error);
    }
};

exports.createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, priority, dueDate, relatedLead } = req.body;
        
        if (!title || !assignedTo) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }
        
        await Task.create({
            title,
            description: description || '',
            assignedTo,
            createdBy: req.session.userId,
            priority: priority || 'media',
            dueDate: dueDate ? new Date(dueDate) : null,
            relatedLead: relatedLead || null
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('createTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        }
        
        task.status = status;
        if (status === 'completada') task.completedAt = new Date();
        
        await task.save();
        res.json({ success: true });
    } catch (error) {
        console.error('updateTaskStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
        }
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('deleteTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
