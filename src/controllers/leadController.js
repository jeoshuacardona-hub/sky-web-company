const Lead = require('../models/Lead');
const User = require('../models/User');

exports.getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find().populate('assignedTo').populate('createdBy').sort({ createdAt: -1 });
        const users = await User.find();
        res.render('pages/leads', { title: 'Leads', leads, users });
    } catch (error) { next(error); }
};

exports.createLead = async (req, res, next) => {
    try {
        await Lead.create({ ...req.body, createdBy: req.session.userId });
        res.redirect('/leads');
    } catch (error) { next(error); }
};

exports.updateLead = async (req, res, next) => {
    try {
        await Lead.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/leads');
    } catch (error) { next(error); }
};

exports.updateLeadStatus = async (req, res, next) => {
    try {
        await Lead.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.redirect('/leads');
    } catch (error) { next(error); }
};

exports.deleteLead = async (req, res, next) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.redirect('/leads');
    } catch (error) { next(error); }
};

exports.importLeads = async (req, res, next) => {
    try {
        const { leads } = req.body;
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ success: false, message: 'No se recibieron leads válidos.' });
        }

        const normalizeKey = (key) => {
            const k = key.toLowerCase().trim().replace(/[^a-z0-9áéíóúñü]/g, '');
            const map = {
                'nombre': 'name', 'name': 'name', 'contacto': 'name',
                'telefono': 'phone', 'teléfono': 'phone', 'phone': 'phone', 'celular': 'phone', 'movil': 'phone', 'móvil': 'phone', 'whatsapp': 'phone', 'wa': 'phone',
                'email': 'email', 'correo': 'email', 'mail': 'email',
                'empresa': 'company', 'company': 'company', 'compania': 'company', 'compañia': 'company', 'negocio': 'company', 'restaurante': 'company',
                'ciudad': 'city', 'city': 'city', 'ubicacion': 'city', 'ubicación': 'city', 'municipio': 'city',
                'problema': 'notes', 'solucion': 'notes', 'solución': 'notes', 'oferta': 'notes', 'queofrecer': 'notes', 'quéofrecer': 'notes', 'notas': 'notes', 'notes': 'notes', 'observaciones': 'notes', 'descripcion': 'notes', 'descripción': 'notes', 'analisisestrategico': 'notes', 'sugerenciaautomatizacion': 'notes', 'dolor': 'notes', 'gancho': 'notes', 'estado': 'notes',
                'fuente': 'source', 'source': 'source', 'origen': 'source', 'url': 'source', 'web': 'source'
            };
            return map[k] || null;
        };

        const toInsert = leads.map(function(row) {
            const normalized = {};
            Object.keys(row).forEach(function(key) {
                const mapped = normalizeKey(key);
                if (mapped && row[key] && row[key].toString().trim()) {
                    normalized[mapped] = row[key].toString().trim();
                }
            });
            return {
                name: normalized.name || '',
                email: normalized.email || '',
                phone: normalized.phone || '',
                company: normalized.company || '',
                city: normalized.city || '',
                source: normalized.source || 'csv_import',
                status: 'new',
                notes: normalized.notes || '',
                createdBy: req.session.userId
            };
        }).filter(function(l) { return l.name && l.name.length > 1; });

        if (toInsert.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay leads válidos para importar (se requiere al menos el nombre).' });
        }

        const inserted = await Lead.insertMany(toInsert, { ordered: false });
        res.json({ success: true, count: inserted.length, message: `${inserted.length} leads importados correctamente.` });

    } catch (error) {
        console.error('Error importando leads:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Algunos leads ya existen (email o teléfono duplicado).' });
        }
        next(error);
    }
};
