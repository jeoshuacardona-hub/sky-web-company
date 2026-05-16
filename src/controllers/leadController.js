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

// Función auxiliar para normalizar nombres de columnas
function normalizeHeader(h) {
    const clean = h.toLowerCase().trim().replace(/^"|"$/g, '');
    const map = {
        'nombre': 'name', 'name': 'name', 'nombres': 'name', 'full name': 'name',
        'telefono': 'phone', 'teléfono': 'phone', 'phone': 'phone', 'móvil': 'phone', 'celular': 'phone',
        'email': 'email', 'correo': 'email', 'e-mail': 'email', 'mail': 'email',
        'empresa': 'company', 'company': 'company', 'compañia': 'company', 'organización': 'company',
        'ciudad': 'city', 'city': 'city', 'location': 'city', 'ubicación': 'city',
        'fuente': 'source', 'source': 'source', 'origen': 'source',
        'notas': 'notes', 'notes': 'notes', 'observaciones': 'notes', 'comentarios': 'notes'
    };
    return map[clean] || clean;
}

// Función para parsear CSV de forma robusta (maneja comillas y comas dentro de valores)
function parseCSV(text) {
    // Remover BOM si existe
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    
    const lines = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        
        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            lines.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (current.trim()) lines.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
            if (char === '\r' && next === '\n') i++;
        } else {
            current += char;
        }
    }
    if (current.trim()) lines.push(current.trim().replace(/^"|"$/g, ''));
    
    // Agrupar en filas
    const rows = [];
    let row = [];
    for (const val of lines) {
        if (val === '\n' || val === '\r') {
            if (row.length > 0) { rows.push(row); row = []; }
        } else {
            row.push(val);
        }
    }
    if (row.length > 0) rows.push(row);
    
    return rows.filter(r => r.length > 0 && r.some(v => v));
}

exports.importLeads = async (req, res, next) => {
    try {
        const { leads } = req.body;
        
        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ success: false, message: 'No se recibieron leads válidos.' });
        }
        
        const toInsert = leads.map(function(l) {
            // Normalizar keys del objeto
            const normalized = {};
            for (const key in l) {
                const normKey = normalizeHeader(key);
                normalized[normKey] = l[key];
            }
            
            return {
                name: normalized.name || normalized.nombre || '',
                email: normalized.email || normalized.correo || '',
                phone: normalized.phone || normalized.telefono || normalized.celular || '',
                company: normalized.company || normalized.empresa || '',
                city: normalized.city || normalized.ciudad || '',
                source: normalized.source || normalized.fuente || 'csv_import',
                status: 'new',
                notes: normalized.notes || normalized.notas || normalized.observaciones || '',
                createdBy: req.session.userId
            };
        }).filter(function(l){ return l.name && l.name.trim().length > 0; });
        
        if (toInsert.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay leads válidos para importar (se requiere al menos el nombre).' });
        }
        
        const inserted = await Lead.insertMany(toInsert);
        res.json({ success: true, count: inserted.length, message: `${inserted.length} leads importados correctamente.` });
        
    } catch (error) {
        console.error('Error importando leads:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Algunos leads ya existen (email o teléfono duplicado).' });
        }
        next(error);
    }
};
