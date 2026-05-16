const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');

router.get('/calendar', authMiddleware, async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { $or: [{ createdBy: req.session.userId }, { assignedTo: req.session.userId }] };
        const meetings = await Meeting.find(filter).populate('lead', 'name phone').populate('createdBy', 'username fullName').sort({ date: 1, time: 1 });
        const tasks = await Task.find(isAdmin ? {} : { assignedTo: req.session.userId }).populate('assignedTo', 'username fullName').sort({ dueDate: 1, createdAt: -1 });
        res.render('pages/calendar', { title: 'Calendario', meetings, tasks, currentUser: req.session.user, isAdmin });
    } catch (error) { next(error); }
});

router.get('/calendar/new', authMiddleware, (req, res) => {
    res.render('pages/calendar-new', { title: 'Nueva Reunión' });
});

router.post('/calendar/save', authMiddleware, async (req, res) => {
    try {
        const { title, date, time, description, location, type } = req.body;
        await Meeting.create({ title, date: new Date(date), time, description: description||'', location: location||'', type: type||'reunion', createdBy: req.session.userId });
        res.redirect('/calendar');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/calendar/new');
    }
});

router.get('/calendar/delete/:id', authMiddleware, async (req, res) => {
    try {
        await Meeting.findByIdAndDelete(req.params.id);
        res.redirect('/calendar');
    } catch (error) { res.redirect('/calendar'); }
});

module.exports = router;
