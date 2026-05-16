const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, dashboardController.getDashboard);
router.get('/api/stats', authMiddleware, dashboardController.getStats);

module.exports = router;
