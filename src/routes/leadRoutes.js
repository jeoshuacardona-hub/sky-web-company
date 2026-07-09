const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/leads', authMiddleware, leadController.getLeads);
router.post('/leads/add', authMiddleware, leadController.addLead);
router.post('/leads/import', authMiddleware, leadController.importLeads);
router.post('/leads/edit/:id', authMiddleware, leadController.editLead);
router.post('/leads/delete/:id', authMiddleware, leadController.deleteLead);
router.post('/leads/delete-all', authMiddleware, leadController.deleteAllLeads);

module.exports = router;
