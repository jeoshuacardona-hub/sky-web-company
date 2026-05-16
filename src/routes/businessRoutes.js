const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/authMiddleware').adminOnly;

router.get('/tasks', authMiddleware, businessController.getTasks);
router.post('/tasks/add', authMiddleware, adminOnly, businessController.createTask);
router.post('/tasks/edit/:id', authMiddleware, businessController.updateTask);
router.post('/api/tasks/:id/status', authMiddleware, businessController.updateStatus);
router.post('/tasks/delete/:id', authMiddleware, adminOnly, businessController.deleteTask);

router.get('/customers', authMiddleware, businessController.getCustomers);

module.exports = router;
