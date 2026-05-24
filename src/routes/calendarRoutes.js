const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');

router.get('/calendar', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        
        // Admin ve todo, Usuario ve solo lo suyo
        const meetingFilter = isAdmin ? {} : { $or: [{ createdBy: req.session.userId }, { assignedTo: req.session.userId }] };
        const taskFilter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const meetings = await Meeting.find(meetingFilter).populate('createdBy', 'username fullName').populate('assignedTo', 'username fullName').sort({ date: 1, time: 1 });
        const tasks = await Task.find(taskFilter).populate('assignedTo', 'username fullName').populate('customer', 'name').sort({ dueDate: 1 });
        const users = await User.find({}).select('username fullName email');
        
        res.render('pages/calendar', { meetings, tasks, users, isAdmin, currentUser: req.session.user });
    } catch (error) {
        console.error('Error en calendar:', error);
        res.render('pages/calendar', { meetings: [], tasks: [], users: [], isAdmin: false, currentUser: req.session.user });
    }
});

router.post('/calendar/save', authMiddleware, async (req, res) => {
    try {
        const { title, date, time, type, description } = req.body;
        const isAdmin = req.session.user.role === 'admin';

        // 1. SOLO ADMIN puede crear tareas
        if (type === 'task' && !isAdmin) {
            return res.status(403).json({ error: 'Solo los administradores pueden crear tareas' });
        }

        if (type === 'task') {
            await Task.create({ 
                title, 
                dueDate: new Date(date), 
                description: description || '', 
                assignedTo: req.session.userId, 
                status: 'todo' 
            });
        } else {
            // 2. Crear reunión asegurando vinculación con el usuario (para que Admin la vea)
            await Meeting.create({ 
                title, 
                date: new Date(date), 
                time: time || '09:00', 
                description: description || '', 
                createdBy: req.session.userId, // El usuario que la creó
                type: 'reunion' 
            });
        }
        res.redirect('/calendar');
    } catch (error) {
        console.error('Error guardando:', error);
        res.redirect('/calendar');
    }
});

router.post('/calendar/update/:id', authMiddleware, async (req, res) => {
    try {
        const { title, date, time, type, description } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (meeting) {
            await Meeting.findByIdAndUpdate(req.params.id, { title, date: new Date(date), time: time || meeting.time, description });
        } else {
            const task = await Task.findById(req.params.id);
            if (task) {
                await Task.findByIdAndUpdate(req.params.id, { title, dueDate: new Date(date), description });
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/calendar/event/:id', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;
        if (type === 'task') {
            const task = await Task.findById(req.params.id);
            res.json(task || {});
        } else {
            const meeting = await Meeting.findById(req.params.id);
            res.json(meeting || {});
        }
    } catch (error) {
        console.error('Error cargando evento:', error);
        res.status(500).json({ error: 'Error cargando evento' });
    }
});

router.get('/calendar/delete/:id', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;
        if (type === 'task') {
            await Task.findByIdAndDelete(req.params.id);
        } else {
            await Meeting.findByIdAndDelete(req.params.id);
        }
        res.redirect('/calendar');
    } catch (error) {
        res.redirect('/calendar');
    }
});

module.exports = router;
