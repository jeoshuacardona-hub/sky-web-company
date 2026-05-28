const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');

router.get('/pipeline', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        const customers = await Customer.find(filter).populate('assignedTo', 'username fullName').sort({ createdAt: -1 });
        
        const stats = {
            total: customers.length,
            prospectos: customers.filter(c => c.status === 'prospect').length,
            calificados: customers.filter(c => c.status === 'qualified').length,
            propuesta: customers.filter(c => c.status === 'proposal').length,
            negociacion: customers.filter(c => c.status === 'negotiation').length,
            ganados: customers.filter(c => c.status === 'won').length,
            perdidos: customers.filter(c => c.status === 'lost').length,
            valorPipeline: customers.filter(c => ['prospect','qualified','proposal','negotiation'].includes(c.status)).reduce((sum, c) => sum + (c.value || 0), 0)
        };
        
        res.render('pages/pipeline', { title: 'Pipeline', customers, stats, isAdmin, currentUser: req.session.user });
    } catch (error) {
        console.error('Pipeline error:', error);
        res.render('pages/pipeline', { title: 'Pipeline', customers: [], stats: {}, isAdmin: false, currentUser: req.session.user });
    }
});

router.post('/api/customers', authMiddleware, async (req, res) => {
    try {
        const customer = await Customer.create({ ...req.body, assignedTo: req.session.userId });
        res.json({ success: true, customer });
    } catch (error) { 
        console.error('Create customer error:', error);
        res.status(500).json({ success: false, error: error.message }); 
    }
});

router.post('/api/customers/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const customer = await Customer.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, customer });
    } catch (error) { 
        res.status(500).json({ success: false, error: error.message }); 
    }
});

module.exports = router;

// Eliminar cliente
router.delete('/api/customers/:id', authMiddleware, async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Eliminar cliente
router.delete('/api/customers/:id', authMiddleware, async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Quick Actions API (Solo agrega, no modifica)
router.post('/api/customers/:id/note', authMiddleware, async (req, res) => {
    try {
        const { note, append } = req.body;
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'No encontrado' });
        
        if (append && customer.notes) {
            customer.notes = customer.notes + '\n[' + new Date().toLocaleString() + '] ' + note;
        } else {
            customer.notes = note;
        }
        await customer.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/customers/:id/reminder', authMiddleware, async (req, res) => {
    try {
        const { reminderDate } = req.body;
        await Customer.findByIdAndUpdate(req.params.id, { 
            reminderDate: new Date(reminderDate),
            hasReminder: true
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reports route
router.get('/reports', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        // Stats básicos
        const totalLeads = await Lead.countDocuments(filter);
        const contactedLeads = await Lead.countDocuments({ ...filter, status: 'contacted' });
        const convertedLeads = await Lead.countDocuments({ ...filter, status: 'converted' });
        const lostLeads = await Lead.countDocuments({ ...filter, status: 'lost' });
        
        const totalCustomers = await Customer.countDocuments(filter);
        const wonCustomers = await Customer.countDocuments({ ...filter, status: 'won' });
        const totalValue = await Customer.aggregate([
            { $match: { ...filter, status: 'won' } },
            { $group: { _id: null, total: { $sum: '$value' } } }
        ]);
        const revenue = totalValue.length > 0 ? totalValue[0].total : 0;
        
        // Llamadas del mes
        const startMonth = new Date();
        startMonth.setDate(1);
        startMonth.setHours(0,0,0,0);
        const callsThisMonth = await CallLog.countDocuments({
            ...filter,
            createdAt: { $gte: startMonth }
        });
        
        // Tasa de conversión
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
        
        res.render('pages/reports', {
            title: 'Reportes',
            stats: {
                totalLeads,
                contactedLeads,
                convertedLeads,
                lostLeads,
                totalCustomers,
                wonCustomers,
                revenue,
                callsThisMonth,
                conversionRate
            },
            isAdmin,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Reports error:', error);
        res.render('pages/reports', {
            title: 'Reportes',
            stats: {},
            isAdmin: false,
            currentUser: req.session.user
        });
    }
});

// RUTAS DE USUARIOS (Agregar al final del archivo)
const userController = require('../controllers/userController');

// API para crear usuarios
router.post('/api/users', authMiddleware, userController.createUser);

// API para eliminar usuarios (por si acaso también lo necesitas)
router.delete('/api/users/:id', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API para comisiones por usuario (solo admin)
router.get('/api/reports/commissions', authMiddleware, async (req, res) => {
    try {
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }
        
        const users = await User.find({}).select('username fullName');
        const result = [];
        
        for (const user of users) {
            const calls = await CallLog.countDocuments({ calledBy: user._id });
            const meetings = await CallLog.countDocuments({ calledBy: user._id, outcome: 'scheduled' });
            const revenue = await Customer.aggregate([
                { $match: { assignedTo: user._id, status: 'won' } },
                { $group: { _id: null, total: { $sum: '$value' } } }
            ]);
            
            result.push({
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                calls,
                meetings,
                revenue: revenue.length > 0 ? revenue[0].total : 0
            });
        }
        
        res.json({ success: true, users: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
