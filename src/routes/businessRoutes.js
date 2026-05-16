const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, businessController.getDashboard);
router.get('/customers', authMiddleware, businessController.getCustomers);
router.post('/customers/add', authMiddleware, businessController.createCustomer);
router.post('/customers/update/:id', authMiddleware, businessController.updateCustomer);
router.post('/customers/delete/:id', authMiddleware, businessController.deleteCustomer);
router.get('/tasks', authMiddleware, businessController.getTasks);
router.post('/tasks/update', authMiddleware, businessController.updateTaskStatus);
router.post('/tasks/add', authMiddleware, businessController.createTask);

module.exports = router;
