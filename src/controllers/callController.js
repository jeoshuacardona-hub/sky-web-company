const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

exports.getLlamadas = async (req, res, next) => {
    try {
        const leads = await Lead.find({ status: { $in: ['new', 'contacted'] } }).sort({ createdAt: -1 });
        const callLogs = await CallLog.find({ lead: { $in: leads.map(function(l){ return l._id; }) } }).sort({ createdAt: -1 });
        const callMap = {};
        callLogs.forEach(function(c){ if (!callMap[c.lead.toString()]) callMap[c.lead.toString()] = c; });
        const today = new Date(); today.setHours(0,0,0,0);
        const callsToday = await CallLog.countDocuments({ createdAt: { $gte: today } });
        const scheduledToday = await CallLog.countDocuments({ outcome: 'scheduled', createdAt: { $gte: today } });
        const totalNew = leads.filter(function(l){ return l.status === 'new'; }).length;
        res.render('pages/llamadas', { title: 'Llamadas', leads, callMap, callsToday, scheduledToday, totalNew });
    } catch (error) { next(error); }
};

exports.getSeguimiento = async (req, res, next) => {
    try {
        const followups = await CallLog.find({ 
            outcome: { $in: ['callback', 'rejected'] }, 
            resolved: false 
        })
        .populate('lead')
        .populate('calledBy')
        .sort({ callbackDate: 1, createdAt: -1 });
        
        const today = new Date(); 
        today.setHours(0,0,0,0);
        
        res.render('pages/seguimiento', { title: 'Seguimiento', followups, today });
    } catch (error) { next(error); }
};

exports.registrarLlamada = async (req, res, next) => {
    try {
        var leadId = req.body.leadId;
        var outcome = req.body.outcome;
        var notes = req.body.notes;
        var callbackDate = req.body.callbackDate;
        var rejectionReason = req.body.rejectionReason;
        var value = req.body.value;

        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

        const callLog = await CallLog.create({
            lead: leadId,
            calledBy: req.session.userId,
            outcome: outcome,
            notes: notes || '',
            callbackDate: callbackDate ? new Date(callbackDate) : null,
            rejectionReason: rejectionReason || ''
        });

        var customerId = null;

        if (outcome === 'scheduled') {
            let customer = await Customer.findOne({ 
                $or: [{ phone: lead.phone }, { email: lead.email }] 
            });
            
            if (!customer) {
                customer = await Customer.create({
                    name: lead.name,
                    email: lead.email || '',
                    phone: lead.phone || '',
                    company: lead.company || '',
                    status: 'prospect',
                    value: value ? parseInt(value) : 0,
                    notes: notes || lead.notes || '',
                    source: 'llamada_agendada'
                });
            } else {
                await Customer.findByIdAndUpdate(customer._id, {
                    status: 'prospect',
                    value: value ? parseInt(value) : customer.value,
                    notes: notes ? (customer.notes ? customer.notes + '\n' + notes : notes) : customer.notes
                });
            }
            
            customerId = customer._id;
            callLog.customerId = customerId;
            await callLog.save();
            
            await Lead.findByIdAndUpdate(leadId, { status: 'converted' });
            
            return res.json({ success: true, outcome: outcome, customerId: customerId, redirect: 'pipeline' });
            
        } else if (outcome === 'callback') {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
            return res.json({ success: true, outcome: outcome, redirect: 'seguimiento' });
            
        } else if (outcome === 'rejected') {
            await Lead.findByIdAndUpdate(leadId, { status: 'lost' });
            return res.json({ success: true, outcome: outcome, redirect: 'perdido' });
            
        } else {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
            return res.json({ success: true, outcome: outcome, redirect: 'contactado' });
        }

    } catch (error) { 
        console.error('Error registrando llamada:', error);
        next(error); 
    }
};

exports.resolverSeguimiento = async (req, res, next) => {
    try {
        const followup = await CallLog.findById(req.params.id).populate('lead');
        if (!followup) return res.status(404).json({ success: false });
        
        await CallLog.findByIdAndUpdate(req.params.id, { resolved: true });
        
        if (followup.lead) {
            await Lead.findByIdAndUpdate(followup.lead._id, { status: 'contacted' });
        }
        
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.actualizarEstadoPipeline = async (req, res, next) => {
    try {
        const { customerId, status, notes } = req.body;
        
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        
        await Customer.findByIdAndUpdate(customerId, {
            status: status,
            notes: notes ? (customer.notes ? customer.notes + '\n' + notes : notes) : customer.notes
        });
        
        if (status === 'closed_won') {
            await Customer.findByIdAndUpdate(customerId, { closedDate: new Date() });
        }
        
        res.json({ success: true });
    } catch (error) { next(error); }
};
