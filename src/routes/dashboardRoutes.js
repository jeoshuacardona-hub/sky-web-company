const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');
const Customer = require('../models/Customer');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const totalLeads = await Lead.countDocuments(filter);
        const newLeads = await Lead.countDocuments({ ...filter, status: 'new' });
        const callsToday = await CallLog.countDocuments({
            ...filter,
            createdAt: { $gte: new Date().setHours(0,0,0,0) }
        });
        const pendingTasks = await Task.countDocuments({ ...filter, status: { $ne: 'done' } });
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: { totalLeads, newLeads, callsToday, pendingTasks },
            currentUser: req.session.user
        });
    } catch (error) {
        res.render('pages/dashboard', { title: 'Dashboard', stats: {}, currentUser: req.session.user });
    }
});

module.exports = router;
