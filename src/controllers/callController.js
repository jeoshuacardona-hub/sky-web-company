const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

const getTodayStart = () => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; };

exports.getLlamadas = async (req, res, next) => {
    try {
        const leads = await Lead.find({ status: 'new' }).sort({ createdAt: -1 });
        const todayStart = getTodayStart();
        
        const callsToday = await CallLog.countDocuments({ createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ outcome: 'scheduled', createdAt: { $gte: todayStart } });
        const totalNew = leads.length;
        
        res.render('pages/llamadas', { title: 'Llamadas', leads, callsToday, scheduledToday, totalNew });
    } catch (error) { next(error); }
};

exports.getStats = async (req, res, next) => {
    try {
        const todayStart = getTodayStart();
        const totalNew = await Lead.countDocuments({ status: 'new' });
        
        const callsToday = await CallLog.countDocuments({ createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ outcome: 'scheduled', createdAt: { $gte: todayStart } });
        
        res.json({ success: true, stats: { totalNew, callsToday, scheduledToday } });
    } catch (error) { next(error); }
};

exports.getSeguimiento = async (req, res, next) => {
    try {
        // ✅ Ahora incluye 'interested' además de los otros
        const followups = await CallLog.find({ 
            outcome: { $in: ['callback', 'rejected', 'no_answer', 'interested'] }, 
            resolved: false 
        })
        .populate('lead')
        .populate('calledBy')
        .sort({ callbackDate: 1, createdAt: -1 });
        
        res.render('pages/seguimiento', { title: 'Seguimiento', followups, today: new Date() });
    } catch (error) { next(error); }
};

exports.registrarLlamada = async (req, res, next) => {
    try {
        const { leadId, outcome, notes, callbackDate, rejectionReason, value } = req.body;
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

        const callLog = await CallLog.create({
            lead: leadId, calledBy: req.session.userId, outcome,
            notes: notes || '', callbackDate: callbackDate ? new Date(callbackDate) : null, rejectionReason: rejectionReason || ''
        });

        let customerId = null;
        if (outcome === 'scheduled') {
            // ✅ Agendó reunión → Pipeline (Customer)
            let customer = await Customer.findOne({ $or: [{ phone: lead.phone }, { email: lead.email }] });
            if (!customer) {
                customer = await Customer.create({
                    name: lead.name, email: lead.email || '', phone: lead.phone || '',
                    company: lead.company || '', city: lead.city || '', status: 'prospect',
                    value: value ? parseInt(value) : 0, notes: notes || lead.notes || '', source: 'llamada_agendada'
                });
            } else {
                await Customer.findByIdAndUpdate(customer._id, { status: 'prospect', value: value ? parseInt(value) : customer.value });
            }
            customerId = customer._id;
            callLog.customerId = customerId;
            await callLog.save();
            await Lead.findByIdAndUpdate(leadId, { status: 'converted' });
        } else if (outcome === 'callback') {
            // ✅ Volver a llamar → Seguimiento
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'rejected') {
            // ✅ No interesado → Seguimiento
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'no_answer') {
            // ✅ No contestó → Seguimiento
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'interested') {
            // ✅ Interesado → Seguimiento (nuevo)
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        }
        
        res.json({ success: true, outcome });
    } catch (error) { next(error); }
};

exports.resolverSeguimiento = async (req, res, next) => {
    try {
        const followup = await CallLog.findById(req.params.id).populate('lead');
        if (!followup) return res.status(404).json({ success: false });
        await CallLog.findByIdAndUpdate(req.params.id, { resolved: true });
        if (followup.lead) await Lead.findByIdAndUpdate(followup.lead._id, { status: 'contacted' });
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.actualizarEstadoPipeline = async (req, res, next) => {
    try {
        const { customerId, status, notes } = req.body;
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        await Customer.findByIdAndUpdate(customerId, { status, notes: notes ? (customer.notes ? customer.notes + '\n' + notes : notes) : customer.notes });
        if (status === 'closed_won') await Customer.findByIdAndUpdate(customerId, { closedDate: new Date() });
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.eliminarDelPipeline = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        await Customer.findByIdAndDelete(req.params.id);
        let lead = await Lead.findOne({ phone: customer.phone }) || await Lead.findOne({ name: new RegExp(customer.name, 'i') });
        if (lead) {
            await Lead.findByIdAndUpdate(lead._id, { status: 'contacted' });
            await CallLog.create({ lead: lead._id, calledBy: req.session.userId, outcome: 'callback', notes: `Devuelto desde Pipeline: ${customer.name}`, resolved: false });
            return res.json({ success: true, message: 'Cliente enviado a Seguimiento.' });
        }
        res.json({ success: true, message: 'Cliente eliminado.' });
    } catch (error) { next(error); }
};
