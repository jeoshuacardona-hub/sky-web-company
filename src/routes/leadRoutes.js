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

// Upload CSV con proveedor
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/leads/upload', authMiddleware, async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.redirect('/leads');
    }
    res.render('pages/upload-leads', { title: 'Subir Leads', currentUser: req.session.user });
});

router.post('/leads/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        const { providedBy } = req.body;
        if (!providedBy) {
            return res.status(400).json({ error: 'Debe especificar el proveedor' });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }
        
        // Parsear CSV
        const csv = require('csv-parser');
        const Readable = require('stream').Readable;
        const leads = [];
        
        const stream = new Readable();
        stream.push(req.file.buffer);
        stream.push(null);
        
        await new Promise((resolve, reject) => {
            stream.pipe(csv())
                .on('data', (row) => {
                    leads.push({
                        name: row.Nombre || row.nombre || row.NAME || '',
                        phone: row.Telefono || row.telefono || row.TELEFONO || row.Phone || '',
                        email: row.Email || row.email || row.EMAIL || '',
                        company: row.Empresa || row.empresa || row.EMPRESA || row.Company || '',
                        city: row.Ciudad || row.ciudad || row.CIUDAD || row.City || '',
                        providedBy: providedBy,
                        createdBy: req.session.userId,
                        status: 'new'
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        // Filtrar leads vacíos
        const validLeads = leads.filter(l => l.name && l.phone);
        
        // Insertar en base de datos
        await Lead.insertMany(validLeads);
        
        res.redirect('/leads?success=1&count=' + validLeads.length + '&provider=' + encodeURIComponent(providedBy));
    } catch (error) {
        console.error('Error uploading CSV:', error);
        res.status(500).json({ error: error.message });
    }
});
