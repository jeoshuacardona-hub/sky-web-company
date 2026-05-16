const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');

router.get('/calendar', authMiddleware, async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        
        // Filtrar por usuario: Admin ve todo, comercial solo lo suyo
        const callFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const taskFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        // Obtener llamadas agendadas
        const scheduledCalls = await CallLog.find({
            ...callFilter,
            outcome: 'scheduled',
            callbackDate: { $ne: null }
        })
        .populate('lead', 'name phone')
        .populate('calledBy', 'username fullName')
        .sort({ callbackDate: 1 });
        
        // Obtener tareas
        const tasks = await Task.find(taskFilter)
            .populate('assignedTo', 'username fullName')
            .populate('customer', 'name')
            .sort({ dueDate: 1, createdAt: -1 });
        
        // Combinar y ordenar por fecha
        const events = [
            ...scheduledCalls.map(call => ({
                _id: call._id,
                type: 'call',
                title: `Llamada: ${call.lead?.name || 'Sin nombre'}`,
                date: call.callbackDate,
                description: call.notes || '',
                outcome: call.outcome,
                lead: call.lead,
                user: call.calledBy
            })),
            ...tasks.map(task => ({
                _id: task._id,
                type: 'task',
                title: task.title,
                date: task.dueDate || task.createdAt,
                description: task.description || '',
                status: task.status,
                priority: task.priority,
                assignedTo: task.assignedTo,
                customer: task.customer
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.render('pages/calendar', {
            title: 'Calendario',
            events,
            scheduledCalls,
            tasks,
            currentUser: req.session.user,
            isAdmin
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
