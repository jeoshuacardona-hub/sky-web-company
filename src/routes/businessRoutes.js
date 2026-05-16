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
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.put('/api/customers/:id', authMiddleware, async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, customer });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/api/customers/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const customer = await Customer.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, customer });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

module.exports = router;
