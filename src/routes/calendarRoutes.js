const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');

router.get('/calendar', authMiddleware, async (req, res) => {
    const meetings = await Meeting.find({ createdBy: req.session.userId }).sort({ date: 1 });
    const tasks = await Task.find({ assignedTo: req.session.userId }).sort({ dueDate: 1 });
    res.render('pages/calendar', { meetings, tasks });
});

router.get('/calendar/new', authMiddleware, (req, res) => res.render('pages/calendar-new'));

router.post('/calendar/save', authMiddleware, async (req, res) => {
    await Meeting.create({ ...req.body, createdBy: req.session.userId });
    res.redirect('/calendar');
});

router.get('/calendar/edit/:id', authMiddleware, async (req, res) => {
    const meeting = await Meeting.findById(req.params.id);
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
