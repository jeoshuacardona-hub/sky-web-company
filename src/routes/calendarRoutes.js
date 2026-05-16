const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');

router.get('/calendar', authMiddleware, async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const callFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const taskFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const scheduledCalls = await CallLog.find({
            ...callFilter,
            outcome: 'scheduled',
            callbackDate: { $ne: null }
        }).populate('lead', 'name phone').populate('calledBy', 'username fullName').sort({ callbackDate: 1 });
        
        const tasks = await Task.find(taskFilter)
            .populate('assignedTo', 'username fullName')
            .populate('customer', 'name')
            .sort({ dueDate: 1, createdAt: -1 });
        
        res.render('pages/calendar', { 
            title: 'Calendario', 
            scheduledCalls, 
            tasks, 
            currentUser: req.session.user, 
            isAdmin 
        });
    } catch (error) { 
        console.error('Error en calendario:', error);
        next(error); 
    }
});

module.exports = router;
