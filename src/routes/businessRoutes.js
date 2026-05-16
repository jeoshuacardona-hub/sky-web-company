const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');

router.get('/pipeline', authMiddleware, async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const customers = await Customer.find(filter)
            .populate('assignedTo', 'username fullName')
            .populate('lead', 'name phone')
            .sort({ createdAt: -1 });
        
        const stats = {
            total: customers.length,
            prospectos: customers.filter(c => c.status === 'prospect').length,
            calificados: customers.filter(c => c.status === 'qualified').length,
            propuesta: customers.filter(c => c.status === 'proposal').length,
            negociacion: customers.filter(c => c.status === 'negotiation').length,
            ganados: customers.filter(c => c.status === 'won').length,
            perdidos: customers.filter(c => c.status === 'lost').length,
            valorPipeline: customers
                .filter(c => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(c.status))
                .reduce((sum, c) => sum + (c.value || 0), 0)
        };
        
        res.render('pages/pipeline', { 
            title: 'Pipeline', 
            customers, 
            stats,
            isAdmin,
            currentUser: req.session.user 
        });
    } catch (error) {
        next(error);
    }
});

router.post('/api/customers/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status, value } = req.body;
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = status;
        if (value !== undefined) customer.value = value;
        
        if (status === 'won') {
            customer.closedAt = new Date();
        }
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar el estado' });
    }
});

router.post('/api/customers/:id/qualify', authMiddleware, async (req, res) => {
    try {
        const { value, priority } = req.body;
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = 'qualified';
        customer.value = value || 0;
        customer.priority = priority || 'medium';
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/customers/:id/proposal', authMiddleware, async (req, res) => {
    try {
        const { proposalDetails } = req.body;
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = 'proposal';
        customer.proposalDetails = proposalDetails || '';
        customer.proposalSentAt = new Date();
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/customers/:id/negotiate', authMiddleware, async (req, res) => {
    try {
        const { value, notes } = req.body;
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = 'negotiation';
        if (value) customer.value = value;
        if (notes) customer.negotiationNotes = notes;
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/customers/:id/won', authMiddleware, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = 'won';
        customer.closedAt = new Date();
        customer.closedBy = req.session.userId;
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/customers/:id/lost', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const customer = await Customer.findById(req.params.id);
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        customer.status = 'lost';
        customer.lostReason = reason || '';
        customer.closedAt = new Date();
        
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/customers/:id/followup', authMiddleware, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate('assignedTo', 'username fullName');
        
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        }
        
        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
