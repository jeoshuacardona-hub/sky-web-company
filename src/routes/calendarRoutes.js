const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/authMiddleware');
router.get('/calendar', authMiddleware, calendarController.getCalendar);
router.get('/api/meetings', authMiddleware, calendarController.getMeetings);
router.post('/api/meetings', authMiddleware, calendarController.createMeeting);
router.delete('/api/meetings/:id', authMiddleware, calendarController.deleteMeeting);
module.exports = router;
