const Lead = require('../models/Lead');
const User = require('../models/User');

exports.getLeads = async (req, res, next) => {
    try {
        const leads = await Lead.find().populate('assignedTo').populate('createdBy').sort({ createdAt: -1 });
        const users = await User.find();
        res.render('pages/leads', { title: 'Leads', leads, users, currentUser: req.session.user });
    } catch (error) { next(error); }
};

exports.createLead = async (req, res, next) => {
    try {
        await Lead.create({ ...req.body, createdBy: req.session.userId });
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
        if (!leads || !Array.isArray(leads) || leads.length === 0)
            return res.status(400).json({ success: false, message: 'No se recibieron leads válidos.' });
        const toInsert = leads.map(l => ({
            name: l.name || l.nombre || '',
            email: l.email || l.correo || '',
            phone: l.phone || l.telefono || '',
            company: l.company || l.empresa || '',
            source: l.source || l.fuente || 'otro',
            status: l.status || l.estado || 'new',
            notes: l.notes || l.notas || '',
            createdBy: req.session.userId
        })).filter(l => l.name);
        const inserted = await Lead.insertMany(toInsert);
        res.json({ success: true, count: inserted.length });
    } catch (error) { next(error); }
};
