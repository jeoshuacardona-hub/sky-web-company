const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/authMiddleware').adminOnly;

router.get('/leads', authMiddleware, leadController.getLeads);
router.post('/leads/add', authMiddleware, leadController.createLead);
router.post('/leads/edit/:id', authMiddleware, leadController.updateLead);
router.post('/leads/update/:id', authMiddleware, leadController.updateLeadStatus);
router.post('/leads/delete/:id', authMiddleware, leadController.deleteLead);
router.post('/api/leads/delete-all', authMiddleware, adminOnly, leadController.deleteAllLeads);
router.post('/api/leads/import', authMiddleware, adminOnly, leadController.importLeads);

module.exports = router;
