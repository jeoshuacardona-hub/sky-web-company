const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Customer = require('../models/Customer');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

// Solo admin puede acceder
const adminOnly = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    next();
};

router.post('/reset-all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== 'DELETE_EVERYTHING') {
            return res.status(400).json({ success: false, message: 'Confirmación requerida' });
        }
        
        const leads = await Lead.deleteMany({});
        const callLogs = await CallLog.deleteMany({});
        const customers = await Customer.deleteMany({});
        const tasks = await Task.deleteMany({});
        
        res.json({ 
            success: true, 
            message: 'Base de datos reseteada completamente',
            deleted: {
                leads: leads.deletedCount,
                callLogs: callLogs.deletedCount,
                customers: customers.deletedCount,
                tasks: tasks.deletedCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
