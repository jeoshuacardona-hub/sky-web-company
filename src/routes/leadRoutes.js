const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middleware/authMiddleware');
router.get('/leads', authMiddleware, leadController.getLeads);
router.post('/leads/add', authMiddleware, leadController.createLead);
router.post('/leads/update/:id', authMiddleware, leadController.updateLeadStatus);
router.post('/leads/delete/:id', authMiddleware, leadController.deleteLead);
module.exports = router;
