const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Customer = require('../models/Customer');

// Ruta normal para ver el Dashboard (HTML)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        const leadFilter = isAdmin ? {} : { assignedTo: userId };
        const callFilter = isAdmin ? {} : { calledBy: userId };
        const taskFilter = isAdmin ? {} : { assignedTo: userId };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Optimizado: Consultas en paralelo usando Promise.all
        const [
            totalLeads,
            newLeads,
            callsToday,
            pendingTasks,
            recentLeads,
            recentCalls
        ] = await Promise.all([
            Lead.countDocuments(leadFilter),
            Lead.countDocuments({ ...leadFilter, status: 'new', createdAt: { $gte: today } }),
            CallLog.countDocuments({ ...callFilter, createdAt: { $gte: today } }),
            Task.countDocuments({ ...taskFilter, status: { $ne: 'done' } }),
            Lead.find(leadFilter).sort({ createdAt: -1 }).limit(3),
            CallLog.find(callFilter).sort({ createdAt: -1 }).limit(3).populate('lead', 'name')
        ]);
        
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
        console.error('Dashboard load error:', error);
        res.render('pages/dashboard', { title: 'Dashboard', stats: {}, recentActivity: [], currentUser: req.session.user });
    }
});

// API RUTA: Solo devuelve los números para actualizar sin recargar (Optimizado)
router.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        const leadFilter = isAdmin ? {} : { assignedTo: userId };
        const callFilter = isAdmin ? {} : { calledBy: userId };
        const taskFilter = isAdmin ? {} : { assignedTo: userId };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [
            totalLeads,
            newLeads,
            callsToday,
            pendingTasks
        ] = await Promise.all([
            Lead.countDocuments(leadFilter),
            Lead.countDocuments({ ...leadFilter, status: 'new', createdAt: { $gte: today } }),
            CallLog.countDocuments({ ...callFilter, createdAt: { $gte: today } }),
            Task.countDocuments({ ...taskFilter, status: { $ne: 'done' } })
        ]);
        
        res.json({ totalLeads, newLeads, callsToday, pendingTasks });
    } catch (error) {
        res.json({ totalLeads: 0, newLeads: 0, callsToday: 0, pendingTasks: 0 });
    }
});

// Widgets API (Optimizado - lectura paralela)
router.get('/api/dashboard/widgets', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const f = isAdmin ? {} : { assignedTo: req.session.userId };
        const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
        
        const [
            won,
            p,
            q,
            pr,
            n,
            w,
            l,
            leads
        ] = await Promise.all([
            Customer.find({ ...f, status: 'won', createdAt: { $gte: startMonth } }),
            Customer.countDocuments({ ...f, status: 'prospect' }),
            Customer.countDocuments({ ...f, status: 'qualified' }),
            Customer.countDocuments({ ...f, status: 'proposal' }),
            Customer.countDocuments({ ...f, status: 'negotiation' }),
            Customer.countDocuments({ ...f, status: 'won' }),
            Customer.countDocuments({ ...f, status: 'lost' }),
            Lead.countDocuments(f)
        ]);
        
        const ingresos = won.reduce((s, c) => s + (c.value || 0), 0);
        const pipe = { p, q, pr, n, w, l };
        const conv = leads > 0 ? ((w / leads) * 100).toFixed(1) : 0;
        
        res.json({ success: true, data: { ingresos, pipe, conv } });
    } catch(e) { 
        res.json({ success: false, error: e.message }); 
    }
});

module.exports = router;
