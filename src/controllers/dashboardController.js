const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');

exports.getDashboard = async (req, res, next) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const isAdmin = req.session.user.role === 'admin';
        
        // Filtros según rol
        const leadFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        const taskFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        const callFilter = isAdmin ? { createdAt: { $gte: today } } : { 
            createdAt: { $gte: today },
            calledBy: req.session.userId 
        };
        
        // Leads
        const newLeads = await Lead.countDocuments({ ...leadFilter, status: 'new' });
        const contactedLeads = await Lead.countDocuments({ ...leadFilter, status: 'contacted' });
        const convertedLeads = await Lead.countDocuments({ ...leadFilter, status: 'converted' });
        const lostLeads = await Lead.countDocuments({ ...leadFilter, status: 'lost' });
        const totalLeads = isAdmin ? await Lead.countDocuments() : await Lead.countDocuments({ assignedTo: req.session.userId });
        
        // Pipeline
        const pipelineFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        const pipelineValue = await Customer.aggregate([
            { $match: { ...pipelineFilter, status: { $in: ['prospect', 'qualified', 'proposal', 'negotiation'] } } },
            { $group: { _id: null, total: { $sum: '$value' } } }
        ]);
        
        // Llamadas
        const callsToday = await CallLog.countDocuments(callFilter);
        const scheduledToday = await CallLog.countDocuments({ 
            outcome: 'scheduled',
            createdAt: { $gte: today },
            ...(isAdmin ? {} : { calledBy: req.session.userId })
        });
        
        // Tareas - Mostrar TODAS las tareas asignadas al usuario
        const pendingTasks = await Task.countDocuments({ ...taskFilter, status: { $in: ['todo', 'in-progress'] } });
        const completedTasks = await Task.countDocuments({ ...taskFilter, status: 'done' });
        
        // Obtener tareas recientes asignadas
        const myTasks = await Task.find(taskFilter)
            .populate('assignedTo', 'username fullName')
            .populate('customer', 'name')
            .sort({ dueDate: 1, createdAt: -1 })
            .limit(5);
        
        // Actividad reciente
        const recentCalls = isAdmin ? 
            await CallLog.find().populate('lead', 'name').sort({ createdAt: -1 }).limit(5) :
            await CallLog.find({ calledBy: req.session.userId }).populate('lead', 'name').sort({ createdAt: -1 }).limit(5);
        
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: {
                totalLeads,
                newLeads,
                contactedLeads,
                convertedLeads,
                lostLeads,
                qualifiedLeads: 0,
                pipelineValue: pipelineValue[0] ? pipelineValue[0].total : 0,
                callsToday,
                scheduledToday,
                pendingTasks,
                completedTasks,
                conversionRate
            },
            recentCalls,
            myTasks,
            currentUser: req.session.user,
            isAdmin
        });
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const isAdmin = req.session.user.role === 'admin';
        
        const leadFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        const totalLeads = isAdmin ? await Lead.countDocuments() : await Lead.countDocuments({ assignedTo: req.session.userId });
        const newLeads = await Lead.countDocuments({ ...leadFilter, status: 'new' });
        const contactedLeads = await Lead.countDocuments({ ...leadFilter, status: 'contacted' });
        const convertedLeads = await Lead.countDocuments({ ...leadFilter, status: 'converted' });
        
        const callsToday = await CallLog.countDocuments({
            createdAt: { $gte: today },
            ...(isAdmin ? {} : { calledBy: req.session.userId })
        });
        
        const scheduledToday = await CallLog.countDocuments({
            outcome: 'scheduled',
            createdAt: { $gte: today },
            ...(isAdmin ? {} : { calledBy: req.session.userId })
        });
        
        res.json({
            success: true,
            stats: {
                totalLeads,
                newLeads,
                contactedLeads,
                convertedLeads,
                callsToday,
                scheduledToday
            }
        });
    } catch (error) {
        next(error);
    }
};
