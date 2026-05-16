const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/calendar', authMiddleware, async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { createdBy: req.session.userId };
        
        const meetings = await Meeting.find(filter)
            .populate('lead', 'name phone')
            .populate('createdBy', 'username fullName')
            .sort({ date: 1, time: 1 });
        
        const tasks = await Task.find(isAdmin ? {} : { assignedTo: req.session.userId })
            .populate('assignedTo', 'username fullName')
            .sort({ dueDate: 1, createdAt: -1 });
        
        const users = await User.find({}).select('username fullName');
        
        res.render('pages/calendar', { 
            title: 'Calendario', 
            meetings, 
            tasks, 
            currentUser: req.session.user, 
            isAdmin,
            users
        });
    } catch (error) { next(error); }
});

router.post('/api/meetings', authMiddleware, async (req, res, next) => {
    try {
        const { title, date, time, description, location, type, leadId } = req.body;
        const meeting = await Meeting.create({
            title,
            date: new Date(date),
            time,
            description: description || '',
            location: location || '',
            type: type || 'reunion',
            lead: leadId || null,
            createdBy: req.session.userId
        });
        res.json({ success: true, meeting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/meetings/:id/delete', authMiddleware, async (req, res, next) => {
    try {
        await Meeting.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
