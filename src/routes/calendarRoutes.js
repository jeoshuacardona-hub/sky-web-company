const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const User = require('../models/User');

function timeToMinutes(timeStr) {
    let startStr = timeStr;
    let endStr = '';
    if (timeStr.includes(' - ')) {
        const parts = timeStr.split(' - ');
        startStr = parts[0];
        endStr = parts[1];
    }
    
    const parseTime = (str) => {
        const parts = str.split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return h * 60 + m;
    };
    
    const start = parseTime(startStr);
    let end = endStr ? parseTime(endStr) : start + 60;
    
    if (end <= start) {
        end += 24 * 60;
    }
    
    return { start, end };
}

async function checkOverlap(date, timeStr, excludeEventId = null) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const query = {
        type: 'reunion',
        date: { $gte: startOfDay, $lte: endOfDay }
    };
    if (excludeEventId) {
        query._id = { $ne: excludeEventId };
    }
    
    const existingMeetings = await Meeting.find(query);
    const proposed = timeToMinutes(timeStr);
    
    for (const m of existingMeetings) {
        const existing = timeToMinutes(m.time);
        if (proposed.start < existing.end && existing.start < proposed.end) {
            return m;
        }
    }
    
    return null;
}


router.get('/calendar', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        
        // Calendario compartido para reuniones; tareas personales
        const meetingFilter = {};
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
            if (!isAdmin) {
                const overlapping = await checkOverlap(date, time || '09:00');
                if (overlapping) {
                    return res.status(400).json({ error: 'El horario seleccionado se cruza con otra reunión ya agendada (' + overlapping.time + ')' });
                }
            }
            await Meeting.create({ 
                title, 
                date: new Date(date), 
                time: time || '09:00', 
                description: description || '', 
                createdBy: req.session.userId,
                type: 'reunion' 
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando:', error);
        res.redirect('/calendar');
    }
});

router.post('/calendar/update/:id', authMiddleware, async (req, res) => {
    try {
        const { title, date, time, type, description } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        const isAdmin = req.session.user.role === 'admin';
        if (meeting) {
            if (!isAdmin && meeting.createdBy.toString() !== req.session.userId) {
                return res.status(403).json({ success: false, error: 'No tienes permiso para editar esta reunión' });
            }
            if (!isAdmin) {
                const overlapping = await checkOverlap(date, time || meeting.time, req.params.id);
                if (overlapping) {
                    return res.status(400).json({ success: false, error: 'El horario seleccionado se cruza con otra reunión ya agendada (' + overlapping.time + ')' });
                }
            }
            await Meeting.findByIdAndUpdate(req.params.id, { title, date: new Date(date), time: time || meeting.time, description });
        } else {
            const task = await Task.findById(req.params.id);
            if (task) {
                if (!isAdmin && task.assignedTo.toString() !== req.session.userId) {
                    return res.status(403).json({ success: false, error: 'No tienes permiso para editar esta tarea' });
                }
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
            const meeting = await Meeting.findById(req.params.id).populate('createdBy', 'username fullName');
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
        const isAdmin = req.session.user.role === 'admin';
        if (type === 'task') {
            const task = await Task.findById(req.params.id);
            if (task) {
                if (!isAdmin && task.assignedTo.toString() !== req.session.userId) {
                    return res.redirect('/calendar');
                }
                await Task.findByIdAndDelete(req.params.id);
            }
        } else {
            const meeting = await Meeting.findById(req.params.id);
            if (meeting) {
                if (!isAdmin && meeting.createdBy.toString() !== req.session.userId) {
                    return res.redirect('/calendar');
                }
                await Meeting.findByIdAndDelete(req.params.id);
            }
        }
        res.redirect('/calendar');
    } catch (error) {
        res.redirect('/calendar');
    }
});

module.exports = router;
