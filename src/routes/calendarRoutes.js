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
        .populate('createdBy', 'username fullName email')
        .populate('assignedTo', 'username fullName')
        .sort({ date: 1, time: 1 });
    
    const tasks = await Task.find(taskFilter)
        .populate('assignedTo', 'username fullName')
        .populate('customer', 'name')
        .sort({ dueDate: 1, createdAt: -1 });
    
    const users = await User.find({}).select('username fullName email');
    
    res.render('pages/calendar', { 
        meetings, 
        tasks,
        users,
        isAdmin,
        currentUser: req.session.user
    });
});

router.get('/calendar/new', authMiddleware, async (req, res) => {
    const users = await User.find({}).select('username fullName email');
    res.render('pages/calendar-new', { 
        isAdmin: req.session.user.role === 'admin',
        users 
    });
});

router.post('/calendar/save', authMiddleware, async (req, res) => {
    const data = { 
        ...req.body, 
        createdBy: req.session.userId 
    };
    
    if (req.body.assignedTo && req.body.assignedTo !== '') {
        data.assignedTo = req.body.assignedTo;
    }
    
    await Meeting.create(data);
    res.redirect('/calendar');
});

router.get('/calendar/edit/:id', authMiddleware, async (req, res) => {
    const meeting = await Meeting.findById(req.params.id)
        .populate('createdBy', 'username fullName')
        .populate('assignedTo', 'username fullName');
    const users = await User.find({}).select('username fullName email');
    res.render('pages/calendar-edit', { meeting, users });
});

router.post('/calendar/update/:id', authMiddleware, async (req, res) => {
    const data = { ...req.body };
    if (req.body.assignedTo === '') delete data.assignedTo;
    await Meeting.findByIdAndUpdate(req.params.id, data);
    res.redirect('/calendar');
});

router.get('/calendar/delete/:id', authMiddleware, async (req, res) => {
    await Meeting.findByIdAndDelete(req.params.id);
    res.redirect('/calendar');
});

module.exports = router;
