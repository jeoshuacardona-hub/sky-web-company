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
router.post('/api/leads/import', authMiddleware, adminOnly, leadController.importLeads);
router.post('/api/admin/hard-reset', authMiddleware, leadController.hardReset);


// Eliminar todos los leads
router.post('/delete-all', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        await Lead.deleteMany(filter);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;

// Ruta para mostrar formulario nuevo lead
router.get('/new', authMiddleware, (req, res) => {
    res.render('pages/lead-form', { title: 'Nuevo Lead', lead: {}, action: 'create' });
});
