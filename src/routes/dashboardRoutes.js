const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');

// Ruta normal para ver el Dashboard (HTML)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        const leadFilter = isAdmin ? {} : { assignedTo: userId };
        const callFilter = isAdmin ? {} : { calledBy: userId };
        const taskFilter = isAdmin ? {} : { assignedTo: userId };
        const meetingFilter = isAdmin ? {} : { createdBy: userId };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalLeads = await Lead.countDocuments(leadFilter);
        const newLeads = await Lead.countDocuments({ ...leadFilter, status: 'new', createdAt: { $gte: today } });
        const callsToday = await CallLog.countDocuments({ ...callFilter, createdAt: { $gte: today } });
        const pendingTasks = await Task.countDocuments({ ...taskFilter, status: { $ne: 'done' } });
        
        // Actividad reciente
        const recentLeads = await Lead.find(leadFilter).sort({ createdAt: -1 }).limit(3);
        const recentCalls = await CallLog.find(callFilter).sort({ createdAt: -1 }).limit(3).populate('lead', 'name');
        
        const recentActivity = [
            ...recentLeads.map(l => ({ type: 'lead', title: 'Nuevo lead agregado', desc: l.name || 'Sin nombre', date: l.createdAt })),
            ...recentCalls.map(c => ({ type: 'call', title: 'Llamada completada', desc: c.lead?.name || 'Sin lead', date: c.createdAt }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: { totalLeads, newLeads, callsToday, pendingTasks },
            recentActivity,
            currentUser: req.session.user
        });
    } catch (error) {
        res.render('pages/dashboard', { title: 'Dashboard', stats: {}, recentActivity: [], currentUser: req.session.user });
    }
});

// 🆕 API RUTA SECRETA: Solo devuelve los números para actualizar sin recargar
router.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        const leadFilter = isAdmin ? {} : { assignedTo: userId };
        const callFilter = isAdmin ? {} : { calledBy: userId };
        const taskFilter = isAdmin ? {} : { assignedTo: userId };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const stats = {
            totalLeads: await Lead.countDocuments(leadFilter),
            newLeads: await Lead.countDocuments({ ...leadFilter, status: 'new', createdAt: { $gte: today } }),
            callsToday: await CallLog.countDocuments({ ...callFilter, createdAt: { $gte: today } }),
            pendingTasks: await Task.countDocuments({ ...taskFilter, status: { $ne: 'done' } })
        };
        
        res.json(stats);
    } catch (error) {
        res.json({ totalLeads: 0, newLeads: 0, callsToday: 0, pendingTasks: 0 });
    }
});

module.exports = router;

// Widgets API (Seguro - solo lectura)
const Customer = require('../models/Customer');

router.get('/api/dashboard/widgets', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const f = isAdmin ? {} : { assignedTo: req.session.userId };
        const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
        
        const won = await Customer.find({ ...f, status: 'won', createdAt: { $gte: startMonth } });
        const ingresos = won.reduce((s, c) => s + (c.value || 0), 0);
        
        const pipe = {
            p: await Customer.countDocuments({ ...f, status: 'prospect' }),
            q: await Customer.countDocuments({ ...f, status: 'qualified' }),
            pr: await Customer.countDocuments({ ...f, status: 'proposal' }),
            n: await Customer.countDocuments({ ...f, status: 'negotiation' }),
            w: await Customer.countDocuments({ ...f, status: 'won' }),
            l: await Customer.countDocuments({ ...f, status: 'lost' })
        };
        
        const leads = await Lead.countDocuments(f);
        const conv = leads > 0 ? ((pipe.w / leads) * 100).toFixed(1) : 0;
        
        res.json({ success: true, data: { ingresos, pipe, conv } });
    } catch(e) { res.json({ success: false, error: e.message }); }
});
