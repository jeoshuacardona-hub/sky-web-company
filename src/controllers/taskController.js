const Task = require('../models/Task');
const User = require('../models/User');

const mapToEnglish = (task) => {
    const statusMap = {
        'pendiente': 'todo',
        'en_proceso': 'in-progress',
        'completada': 'done',
        'todo': 'todo',
        'in-progress': 'in-progress',
        'done': 'done'
    };
    const priorityMap = {
        'baja': 'low',
        'media': 'medium',
        'alta': 'high',
        'low': 'low',
        'medium': 'medium',
        'high': 'high'
    };
    
    const doc = task.toObject ? task.toObject() : { ...task };
    doc.status = statusMap[doc.status] || 'todo';
    doc.priority = priorityMap[doc.priority] || 'medium';
    return doc;
};

const mapToSpanish = (data) => {
    const statusMap = {
        'todo': 'pendiente',
        'in-progress': 'en_proceso',
        'done': 'completada',
        'pendiente': 'pendiente',
        'en_proceso': 'en_proceso',
        'completada': 'completada'
    };
    const priorityMap = {
        'low': 'baja',
        'medium': 'media',
        'high': 'alta',
        'baja': 'baja',
        'media': 'media',
        'alta': 'alta'
    };
    
    const result = { ...data };
    if (data.status) result.status = statusMap[data.status] || 'pendiente';
    if (data.priority) result.priority = priorityMap[data.priority] || 'media';
    return result;
};

exports.getTasks = async (req, res, next) => {
    try {
        const isAdmin = req.session.user && req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        const rawTasks = await Task.find(filter).populate('assignedTo').populate('customer').sort({ createdAt: -1 });
        
        // Map raw database tasks (Spanish) to the format expected by the view (English)
        const tasks = rawTasks.map(mapToEnglish);
        
        const users = isAdmin ? await User.find() : [];
        res.render('pages/tasks', { title: 'Tareas', tasks, users, isAdmin });
    } catch (error) { next(error); }
};

exports.createTask = async (req, res, next) => {
    try {
        const taskData = mapToSpanish({
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            dueDate: req.body.dueDate || null,
            assignedTo: req.body.assignedTo || req.session.userId,
            status: 'todo',
            createdBy: req.session.userId
        });
        
        await Task.create(taskData);
        res.redirect('/tasks');
    } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const taskData = mapToSpanish(req.body);
        await Task.findByIdAndUpdate(req.params.id, taskData);
        res.redirect('/tasks');
    } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const taskData = mapToSpanish({ status: req.body.status });
        const update = { status: taskData.status };
        if (taskData.status === 'completada') update.completedAt = new Date();
        await Task.findByIdAndUpdate(req.params.id, update);
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.redirect('/tasks');
    } catch (error) { next(error); }
};

