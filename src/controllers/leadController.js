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

exports.deleteAllLeads = async (req, res, next) => {
    try {
        const result = await Lead.deleteMany({});
        res.json({ 
            success: true, 
            message: `Se eliminaron ${result.deletedCount} leads permanentemente.` 
        });
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
                'nombre': 'name', 'name': 'name', 'contacto': 'name', 'restaurante': 'company',
                'telefono': 'phone', 'teléfono': 'phone', 'phone': 'phone', 'celular': 'phone', 'movil': 'phone', 'whatsapp': 'phone', 'wa': 'phone',
                'email': 'email', 'correo': 'email', 'mail': 'email',
                'empresa': 'company', 'company': 'company', 'compania': 'company', 'negocio': 'company',
                'ciudad': 'city', 'city': 'city', 'ubicacion': 'city', 'municipio': 'city',
                'problema': 'notes', 'solucion': 'notes', 'solución': 'notes', 'notas': 'notes', 'notes': 'notes', 'observaciones': 'notes', 'descripcion': 'notes', 'analisisestrategico': 'notes', 'sugerenciaautomatizacion': 'notes', 'dolor': 'notes', 'gancho': 'notes', 'estado': 'notes', 'analisisestrategoclaude': 'notes',
                'fuente': 'source', 'source': 'source', 'origen': 'source', 'url': 'source', 'web': 'source', 'fuentesurl': 'source', 'redes': 'source'
            };
            return map[k] || null;
        };

        let insertedCount = 0;
        let skippedCount = 0;
        let duplicateCount = 0;

        for (const row of leads) {
            const normalized = {};
            Object.keys(row).forEach(function(key) {
                const mapped = normalizeKey(key);
                if (mapped && row[key] && row[key].toString().trim()) {
                    normalized[mapped] = row[key].toString().trim();
                }
            });

            if (!normalized.name || normalized.name.length < 2) {
                skippedCount++;
                continue;
            }

            const existingLead = await Lead.findOne({
                $or: [
                    { phone: normalized.phone },
                    { email: normalized.email }
                ].filter(Boolean)
            });

            if (existingLead) {
                duplicateCount++;
                await Lead.findByIdAndUpdate(existingLead._id, {
                    name: normalized.name || existingLead.name,
                    company: normalized.company || existingLead.company,
                    city: normalized.city || existingLead.city,
                    notes: normalized.notes ? (existingLead.notes ? existingLead.notes + '\n' + normalized.notes : normalized.notes) : existingLead.notes,
                    source: 'csv_import'
                });
            } else {
                await Lead.create({
                    name: normalized.name,
                    email: normalized.email || '',
                    phone: normalized.phone || '',
                    company: normalized.company || '',
                    city: normalized.city || '',
                    source: normalized.source || 'csv_import',
                    status: 'new',
                    notes: normalized.notes || '',
                    createdBy: req.session.userId
                });
                insertedCount++;
            }
        }

        res.json({ 
            success: true, 
            count: insertedCount, 
            duplicates: duplicateCount,
            skipped: skippedCount,
            message: `${insertedCount} leads nuevos importados. ${duplicateCount} actualizados (duplicados). ${skippedCount} omitidos.` 
        });

    } catch (error) {
        console.error('Error importando leads:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Algunos leads ya existen (email o teléfono duplicado).' });
        }
        next(error);
    }
};
