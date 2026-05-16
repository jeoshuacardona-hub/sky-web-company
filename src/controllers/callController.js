const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

exports.getLlamadas = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtener leads activos
        const leads = await Lead.find({ status: { $in: ['new', 'contacted'] } }).sort({ createdAt: -1 });
        
        // Stats en tiempo real desde BD
        const callsToday = await CallLog.countDocuments({ 
            createdAt: { $gte: today }
        });
        
        const scheduledToday = await CallLog.countDocuments({ 
            outcome: 'scheduled',
            createdAt: { $gte: today }
        });
        
        const totalNew = leads.filter(l => l.status === 'new').length;
        
        res.render('pages/llamadas', { 
            title: 'Llamadas', 
            leads, 
            callsToday, 
            scheduledToday, 
            totalNew 
        });
    } catch (error) { 
        next(error); 
    }
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
                    city: lead.city || '',
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
            
            return res.json({ success: true, outcome: outcome, customerId: customerId });
            
        } else if (outcome === 'callback') {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
            return res.json({ success: true, outcome: outcome });
            
        } else if (outcome === 'rejected') {
            await Lead.findByIdAndUpdate(leadId, { status: 'lost' });
            return res.json({ success: true, outcome: outcome });
            
        } else {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
            return res.json({ success: true, outcome: outcome });
        }

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
        
        await Customer.findByIdAndUpdate(customerId, {
            status: status,
            notes: notes ? (customer.notes ? customer.notes + '\n' + notes : notes) : customer.notes
        });
        if (status === 'closed_won') await Customer.findByIdAndUpdate(customerId, { closedDate: new Date() });
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.eliminarDelPipeline = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

        const customerPhone = customer.phone;
        const customerName = customer.name;

        await Customer.findByIdAndDelete(req.params.id);

        let lead = await Lead.findOne({ phone: customerPhone });
        if (!lead && customerName) lead = await Lead.findOne({ name: new RegExp(customerName, 'i') });

        if (lead) {
            await Lead.findByIdAndUpdate(lead._id, { status: 'contacted' });
            await CallLog.create({
                lead: lead._id,
                calledBy: req.session.userId,
                outcome: 'callback',
                notes: 'Devuelto desde Pipeline. Cliente: ' + customerName + '. Motivo: Eliminado/Pérdida.',
                resolved: false
            });
            return res.json({ success: true, message: 'Cliente eliminado del Pipeline y enviado a Seguimiento.' });
        } else {
            return res.json({ success: true, message: 'Cliente eliminado del Pipeline.' });
        }
    } catch (error) { next(error); }
};
