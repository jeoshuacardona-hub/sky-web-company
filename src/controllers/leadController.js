const Lead = require('../models/Lead');

exports.getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.render('pages/leads', { 
            title: 'Leads', 
            leads,
            isAdmin: req.session.user.role === 'admin',
            currentUser: req.session.user
        });
    } catch (error) { next(error); }
};

exports.importLeads = async (req, res) => {
    try {
        const { leads, provider } = req.body;
        if (!leads || !leads.length) return res.status(400).json({ success: false, error: 'No hay leads' });
        if (!provider) return res.status(400).json({ success: false, error: 'Falta el proveedor' });

        const toInsert = leads.map(l => ({
            name: l.name, phone: l.phone, email: l.email || '', company: l.company || '',
            city: l.city || '', notes: l.notes || '', source: l.source || 'csv',
            status: 'new', providedBy: provider, createdBy: req.session.userId
        }));

        await Lead.insertMany(toInsert);
        res.json({ success: true, message: `Importados ${toInsert.length} leads de ${provider}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.editLead = async (req, res) => {
    try {
        const { id } = req.params;
        await Lead.findByIdAndUpdate(id, { ...req.body, updatedAt: Date.now() });
        res.redirect('/leads');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.deleteLead = async (req, res) => {
    try { await Lead.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.deleteAllLeads = async (req, res) => {
    try { await Lead.deleteMany({}); res.json({ success: true }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
