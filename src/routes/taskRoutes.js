const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/authMiddleware').adminOnly;

router.get('/tasks', authMiddleware, taskController.getTasks);
router.post('/tasks/add', authMiddleware, adminOnly, taskController.createTask);
router.post('/tasks/edit/:id', authMiddleware, taskController.updateTask);
router.post('/api/tasks/:id/status', authMiddleware, taskController.updateStatus);
router.post('/tasks/delete/:id', authMiddleware, adminOnly, taskController.deleteTask);

module.exports = router;
