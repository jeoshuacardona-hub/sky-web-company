const Lead = require('../models/Lead');

exports.getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.render('pages/leads', { title: 'Leads', leads, isAdmin: req.session.user.role === 'admin', currentUser: req.session.user });
    } catch (error) { next(error); }
};

exports.importLeads = async (req, res) => {
    try {
        const { leads, provider } = req.body;
        if (!leads || !leads.length) return res.status(400).json({ success: false, error: 'No hay leads' });
        if (!provider) return res.status(400).json({ success: false, error: 'Falta proveedor' });

        const toInsert = leads.map(l => {
            // Mapeo flexible de columnas (busca variaciones de nombres)
            const name = l.name || l.Nombre || l.NOMBRE || l['Nombre Completo'] || 'Sin Nombre';
            const phone = l.phone || l.Phone || l.Telefono || l.TELEFONO || l.WhatsApp || l['WhatsApp_Business'] || '';
            const email = l.email || l.Email || l.EMAIL || '';
            const company = l.company || l.Company || l.Empresa || l.EMPRESA || l.Sedes || '';
            const city = l.city || l.City || l.Ciudad || l.CIUDAD || '';
            const notes = l.notes || l.Notes || l.Notas || '';

            return {
                name: name,
                phone: phone,
                email: email,
                company: company,
                city: city,
                notes: notes,
                source: l.source || 'csv',
                status: 'new',
                providedBy: provider,
                createdBy: req.session.userId
            };
        });

        // Filtrar para asegurar que al menos tengan nombre antes de guardar
        const validLeads = toInsert.filter(l => l.name && l.name !== 'Sin Nombre');

        if (validLeads.length === 0) {
            return res.status(400).json({ success: false, error: 'No se encontraron nombres válidos en el CSV.' });
        }

        await Lead.insertMany(validLeads);
        res.json({ success: true, message: 'Importados ' + validLeads.length + ' leads de ' + provider });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.editLead = async (req, res) => {
    try { await Lead.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }); res.redirect('/leads'); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.deleteLead = async (req, res) => {
    try { await Lead.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.deleteAllLeads = async (req, res) => {
    try { await Lead.deleteMany({}); res.json({ success: true }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
