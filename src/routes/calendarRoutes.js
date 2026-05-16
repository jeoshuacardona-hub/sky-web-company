const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');

router.get('/calendar', authMiddleware, async (req, res) => {
    const isAdmin = req.session.user.role === 'admin';
    
    // Admin ve TODO, comercial solo lo suyo
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
    
    res.render('pages/calendar', { 
        meetings, 
        tasks,
        isAdmin,
        currentUser: req.session.user
    });
});

router.get('/calendar/new', authMiddleware, (req, res) => {
    res.render('pages/calendar-new', { isAdmin: req.session.user.role === 'admin' });
});

router.post('/calendar/save', authMiddleware, async (req, res) => {
    const data = { 
        ...req.body, 
        createdBy: req.session.userId 
    };
    
    // Si es admin y asigna a alguien más
    if (req.body.assignedTo) {
        data.assignedTo = req.body.assignedTo;
    }
    
    await Meeting.create(data);
    res.redirect('/calendar');
});

router.get('/calendar/edit/:id', authMiddleware, async (req, res) => {
    const meeting = await Meeting.findById(req.params.id)
        .populate('createdBy', 'username fullName')
        .populate('assignedTo', 'username fullName');
    res.render('pages/calendar-edit', { meeting });
});

router.post('/calendar/update/:id', authMiddleware, async (req, res) => {
    await Meeting.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/calendar');
});

router.get('/calendar/delete/:id', authMiddleware, async (req, res) => {
    await Meeting.findByIdAndDelete(req.params.id);
    res.redirect('/calendar');
});

module.exports = router;
