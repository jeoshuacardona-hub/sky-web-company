const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/calendar', authMiddleware, async (req, res) => {
    const isAdmin = req.session.user.role === 'admin';
    
    const meetingFilter = isAdmin ? {} : { 
        $or: [
            { createdBy: req.session.userId },
            { assignedTo: req.session.userId }
        ]
    };
    
    const taskFilter = isAdmin ? {} : { assignedTo: req.session.userId };
    
    const meetings = await Meeting.find(meetingFilter)
        .populate('createdBy', 'username fullName')
        .populate('assignedTo', 'username fullName')
        .sort({ date: 1, time: 1 });
    
    const tasks = await Task.find(taskFilter)
        .populate('assignedTo', 'username fullName')
        .populate('customer', 'name')
        .sort({ dueDate: 1 });
    
    const users = await User.find({}).select('username fullName email');
    
    res.render('pages/calendar', { 
        meetings, 
        tasks,
        users,
        isAdmin,
        currentUser: req.session.user
    });
});

router.post('/calendar/save', authMiddleware, async (req, res) => {
    const { title, date, time, type, description } = req.body;
    
    if (type === 'task') {
        await Task.create({
            title,
            dueDate: new Date(date),
            description: description || '',
            assignedTo: req.session.userId,
            status: 'todo'
        });
    } else {
        await Meeting.create({
            title,
            date: new Date(date),
            time: time || '09:00',
            description: description || '',
            createdBy: req.session.userId,
            type: 'reunion'
        });
    }
    
    res.redirect('/calendar');
});

router.post('/calendar/update/:id', authMiddleware, async (req, res) => {
    const { title, date, time, type, description } = req.body;
    
    // Check if it's a meeting or task
    const meeting = await Meeting.findById(req.params.id);
    if (meeting) {
        await Meeting.findByIdAndUpdate(req.params.id, {
            title,
            date: new Date(date),
            time: time || meeting.time,
            description
        });
    } else {
        const task = await Task.findById(req.params.id);
        if (task) {
            await Task.findByIdAndUpdate(req.params.id, {
                title,
                dueDate: new Date(date),
                description
            });
        }
    }
    
    res.redirect('/calendar');
});

router.get('/calendar/event/:id', authMiddleware, async (req, res) => {
    const { type } = req.query;
    
    if (type === 'task') {
        const task = await Task.findById(req.params.id);
        res.json(task);
    } else {
        const meeting = await Meeting.findById(req.params.id);
        res.json(meeting);
    }
});

router.get('/calendar/delete/:id', authMiddleware, async (req, res) => {
    const { type } = req.query;
    
    if (type === 'task') {
        await Task.findByIdAndDelete(req.params.id);
    } else {
        await Meeting.findByIdAndDelete(req.params.id);
    }
    
    res.redirect('/calendar');
});

module.exports = router;
