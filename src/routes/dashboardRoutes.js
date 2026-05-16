const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Customer = require('../models/Customer');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        // Filtros
        const leadFilter = isAdmin ? {} : { assignedTo: userId };
        const callFilter = isAdmin ? {} : { calledBy: userId };
        const taskFilter = isAdmin ? {} : { assignedTo: userId };
        const meetingFilter = isAdmin ? {} : { createdBy: userId };
        
        // Stats del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalLeads = await Lead.countDocuments(leadFilter);
        const newLeads = await Lead.countDocuments({ ...leadFilter, status: 'new', createdAt: { $gte: today } });
        const callsToday = await CallLog.countDocuments({ ...callFilter, createdAt: { $gte: today } });
        const pendingTasks = await Task.countDocuments({ ...taskFilter, status: { $ne: 'done' } });
        
        // Actividad reciente (últimas 5 acciones)
        const recentLeads = await Lead.find(leadFilter).sort({ createdAt: -1 }).limit(3).populate('assignedTo', 'username');
        const recentCalls = await CallLog.find(callFilter).sort({ createdAt: -1 }).limit(3).populate('lead', 'name');
        const recentMeetings = await Meeting.find(meetingFilter).sort({ createdAt: -1 }).limit(3).populate('createdBy', 'username');
        
        // Combinar y ordenar por fecha
        const recentActivity = [
            ...recentLeads.map(l => ({ type: 'lead', title: 'Nuevo lead agregado', desc: l.name || 'Lead sin nombre', date: l.createdAt })),
            ...recentCalls.map(c => ({ type: 'call', title: 'Llamada completada', desc: c.lead?.name || 'Sin lead', date: c.createdAt })),
            ...recentMeetings.map(m => ({ type: 'meeting', title: 'Reunión programada', desc: m.title, date: m.date }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        // Pipeline stats
        const pipelineStats = {
            prospectos: await Customer.countDocuments({ ...leadFilter, status: 'prospect' }),
            calificados: await Customer.countDocuments({ ...leadFilter, status: 'qualified' }),
            propuesta: await Customer.countDocuments({ ...leadFilter, status: 'proposal' }),
            negociacion: await Customer.countDocuments({ ...leadFilter, status: 'negotiation' }),
            ganados: await Customer.countDocuments({ ...leadFilter, status: 'won' }),
            perdidos: await Customer.countDocuments({ ...leadFilter, status: 'lost' })
        };
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: { totalLeads, newLeads, callsToday, pendingTasks },
            recentActivity,
            pipelineStats,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: { totalLeads: 0, newLeads: 0, callsToday: 0, pendingTasks: 0 },
            recentActivity: [],
            pipelineStats: {},
            currentUser: req.session.user
        });
    }
});

module.exports = router;
