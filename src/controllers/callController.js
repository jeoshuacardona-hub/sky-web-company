const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

const getTodayStart = () => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; };

exports.getLlamadas = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const leads = await Lead.find({ status: 'new' }).sort({ createdAt: -1 });
        const todayStart = getTodayStart();
        const callsFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const callsToday = await CallLog.countDocuments({ ...callsFilter, createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ ...callsFilter, outcome: 'scheduled', createdAt: { $gte: todayStart } });
        const totalNew = leads.length;
        
        res.render('pages/llamadas', { 
            title: 'Llamadas', leads, callsToday, scheduledToday, totalNew,
            isAdmin, currentUser: req.session.user
        });
    } catch (error) { 
        console.error('getLlamadas error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const todayStart = getTodayStart();
        const totalNew = await Lead.countDocuments({ status: 'new' });
        const callsFilter = isAdmin ? {} : { calledBy: req.session.userId };
        const callsToday = await CallLog.countDocuments({ ...callsFilter, createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ ...callsFilter, outcome: 'scheduled', createdAt: { $gte: todayStart } });
        
        res.json({ success: true, stats: { totalNew, callsToday, scheduledToday } });
    } catch (error) { 
        console.error('getStats error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.getSeguimiento = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { calledBy: req.session.userId };
        
        const followups = await CallLog.find({ 
            outcome: { $in: ['callback', 'rejected', 'no_answer', 'interested'] }, 
            resolved: false,
            ...filter
        })
        .populate('lead')
        .populate('calledBy', 'username fullName')
        .sort({ callbackDate: 1, createdAt: -1 });
        
        res.render('pages/seguimiento', { 
            title: 'Seguimiento', followups, today: new Date(), isAdmin
        });
    } catch (error) { 
        console.error('getSeguimiento error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.registrarLlamada = async (req, res) => {
    try {
        console.log('📞 registrarLlamada called:', req.body);
        console.log('👤 User:', req.session.userId);
        
        const { leadId, outcome, notes, callbackDate, rejectionReason, value } = req.body;
        
        if (!leadId || !outcome) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }
        
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead no encontrado' });
        }

        const callLog = await CallLog.create({
            lead: leadId, 
            calledBy: req.session.userId,
            outcome,
            notes: notes || '', 
            callbackDate: callbackDate ? new Date(callbackDate) : null, 
            rejectionReason: rejectionReason || ''
        });

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
            callLog.customerId = customer._id;
            await callLog.save();
            await Lead.findByIdAndUpdate(leadId, { status: 'converted' });
        } else {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        }
        
        console.log('✅ Call saved successfully');
        res.json({ success: true, outcome });
    } catch (error) {
        console.error('❌ registrarLlamada error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resolverSeguimiento = async (req, res, next) => {
    try {
        const followup = await CallLog.findById(req.params.id).populate('lead');
        if (!followup) return res.status(404).json({ success: false });
        await CallLog.findByIdAndUpdate(req.params.id, { resolved: true });
        if (followup.lead) await Lead.findByIdAndUpdate(followup.lead._id, { status: 'contacted' });
        res.json({ success: true });
    } catch (error) { 
        console.error('resolverSeguimiento error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.actualizarEstadoPipeline = async (req, res, next) => {
    try {
        const { customerId, status, notes } = req.body;
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        await Customer.findByIdAndUpdate(customerId, { status, notes: notes ? (customer.notes ? customer.notes + '\n' + notes : notes) : customer.notes });
        if (status === 'closed_won') await Customer.findByIdAndUpdate(customerId, { closedDate: new Date() });
        res.json({ success: true });
    } catch (error) { 
        console.error('actualizarEstadoPipeline error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
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
    } catch (error) { 
        console.error('eliminarDelPipeline error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};
