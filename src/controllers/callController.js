const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

const getTodayStart = () => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; };

exports.getLlamadas = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        
        // ✅ TODOS (admin y comerciales) ven TODOS los leads 'new'
        // Así Ever, Angel y Camila tienen trabajo para llamar
        const leads = await Lead.find({ status: 'new' }).sort({ createdAt: -1 });
        const todayStart = getTodayStart();
        
        // Stats: cada quien ve SUS propias llamadas (para sus métricas personales)
        const callsFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const callsToday = await CallLog.countDocuments({ ...callsFilter, createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ ...callsFilter, outcome: 'scheduled', createdAt: { $gte: todayStart } });
        const totalNew = leads.length;
        
        res.render('pages/llamadas', { 
            title: 'Llamadas', 
            leads, 
            callsToday, 
            scheduledToday, 
            totalNew,
            isAdmin,
            currentUser: req.session.user
        });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: error.message }); }
};

exports.getStats = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const todayStart = getTodayStart();
        
        // Todos ven el total global de leads new (para contexto)
        const totalNew = await Lead.countDocuments({ status: 'new' });
        
        // Stats de llamadas: admin ve todo, comercial ve solo las suyas
        const callsFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const callsToday = await CallLog.countDocuments({ ...callsFilter, createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ ...callsFilter, outcome: 'scheduled', createdAt: { $gte: todayStart } });
        
        res.json({ success: true, stats: { totalNew, callsToday, scheduledToday } });
    } catch (error) { next(error); }
};

exports.getSeguimiento = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        
        // Admin ve todo, comercial ve solo los follow-ups que él generó
        const filter = isAdmin ? {} : { calledBy: req.session.userId };
        
        const followups = await CallLog.find({ 
            outcome: { $in: ['callback', 'rejected', 'no_answer', 'interested'] }, 
            resolved: false,
            ...filter
        })
        .populate('lead')
        .populate('calledBy', 'username fullName') // ✅ Traer quién hizo la llamada
        .sort({ callbackDate: 1, createdAt: -1 });
        
        res.render('pages/seguimiento', { 
            title: 'Seguimiento', 
            followups, 
            today: new Date(),
            isAdmin
        });
    } catch (error) { next(error); }
};

exports.registrarLlamada = async (req, res, next) => {
    try {
        const { leadId, outcome, notes, callbackDate, rejectionReason, value } = req.body;
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

        // ✅ GUARDAR quién hizo la llamada (req.session.userId) - CLAVE PARA COMISIONES
        const callLog = await CallLog.create({
            lead: leadId, 
            calledBy: req.session.userId, // 👈 ESTO ES LO IMPORTANTE
            outcome,
            notes: notes || '', 
            callbackDate: callbackDate ? new Date(callbackDate) : null, 
            rejectionReason: rejectionReason || ''
        });

        let customerId = null;
        if (outcome === 'scheduled') {
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
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'rejected') {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'no_answer') {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        } else if (outcome === 'interested') {
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
