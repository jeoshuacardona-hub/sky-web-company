const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

const getTodayStart = () => { 
  const d = new Date(); 
  d.setUTCHours(0,0,0,0); 
  return d; 
};

exports.getLlamadas = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        
        let filter;
        if (isAdmin) {
            filter = { status: 'new' };
        } else {
            const myLeads = await Lead.countDocuments({ status: 'new', assignedTo: userId });
            filter = myLeads > 0 
                ? { status: 'new', assignedTo: userId }
                : { status: 'new', assignedTo: null };
        }
        
        const leads = await Lead.find(filter)
            .select('name phone email company city notes status assignedTo createdAt')
            ;
        
        // Shuffle aleatorio para mezclar nichos
        leads.sort(() => Math.random() - 0.5);
            
        const todayStart = getTodayStart();
        const callsFilter = isAdmin ? {} : { calledBy: userId };
        const callsToday = await CallLog.countDocuments({ ...callsFilter, createdAt: { $gte: todayStart } });
        const scheduledToday = await CallLog.countDocuments({ ...callsFilter, outcome: 'scheduled', createdAt: { $gte: todayStart } });
        
        res.render('pages/llamadas', { 
            title: 'Llamadas', 
            leads, 
            callsToday, 
            scheduledToday, 
            totalNew: leads.length,
            isAdmin, 
            currentUser: req.session.user 
        });
    } catch (error) { 
        console.error('getLlamadas error:', error);
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const userId = req.session.userId;
        const todayStart = getTodayStart();
        
        let totalNew;
        if (isAdmin) {
            totalNew = await Lead.countDocuments({ status: 'new' });
        } else {
            const myLeads = await Lead.countDocuments({ status: 'new', assignedTo: userId });
            totalNew = myLeads > 0 ? myLeads : await Lead.countDocuments({ status: 'new', assignedTo: null });
        }
        
        const callsFilter = isAdmin ? {} : { calledBy: userId };
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
        next(error);
    }
};

exports.registrarLlamada = async (req, res) => {
    try {
        const { leadId, outcome, notes, callbackDate, rejectionReason, value } = req.body;
        
        if (!leadId || !outcome) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }
        
        // Validar fecha futura para callback
        if (outcome === 'callback' && callbackDate) {
            const cbDate = new Date(callbackDate);
            const today = new Date(); 
            today.setHours(0,0,0,0);
            if (cbDate < today) {
                return res.status(400).json({ success: false, message: 'La fecha de rellamada debe ser hoy o futura' });
            }
        }
        
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead no encontrado' });
        }

        const userId = req.session.userId || (req.session.user && req.session.user._id);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Sesión inválida' });
        }

        const callLog = await CallLog.create({
            lead: leadId, 
            calledBy: userId,
            outcome,
            notes: notes || '', 
            callbackDate: callbackDate ? new Date(callbackDate) : null, 
            rejectionReason: rejectionReason || ''
        });

        if (outcome === 'scheduled') {
            let customer = await Customer.findOne({ $or: [{ phone: lead.phone }, { email: lead.email }] });
            if (!customer) {
                customer = await Customer.create({
                    name: lead.name, 
                    email: lead.email || '', 
                    phone: lead.phone || '',
                    company: lead.company || '', 
                    city: lead.city || '', 
                    status: 'prospect',
                    value: value && !isNaN(parseFloat(value)) ? parseFloat(value) : 0, 
                    notes: notes || lead.notes || '', 
                    source: 'llamada_agendada'
                });
            } else {
                await Customer.findByIdAndUpdate(customer._id, { 
                    status: 'prospect', 
                    value: value && !isNaN(parseFloat(value)) ? parseFloat(value) : customer.value 
                });
            }
            callLog.customerId = customer._id;
            await callLog.save();
            await Lead.findByIdAndUpdate(leadId, { status: 'converted' });
        } else {
            await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
        }
        
        res.json({ success: true, outcome });
    } catch (error) {
        console.error('registrarLlamada error:', error);
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
        next(error);
    }
};

exports.actualizarEstadoPipeline = async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const customerId = req.params.customerId;
        
        // Validar estado
        const validStatuses = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado invalido: ' + status });
        }
        
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        
        // Actualizar estado
        const updateData = { status: status };
        
        // Agregar notas si existen
        if (notes) {
            if (customer.notes) {
                updateData.notes = customer.notes + String.fromCharCode(10) + notes;
            } else {
                updateData.notes = notes;
            }
        }
        
        // Si se marca como ganado, registrar fecha
        if (status === 'closed_won') {
            updateData.closedDate = new Date();
        }
        
        await Customer.findByIdAndUpdate(customerId, updateData);
        res.json({ success: true });
    } catch (error) {
        console.error('actualizarEstadoPipeline error:', error);
        next(error);
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
            await CallLog.create({ 
                lead: lead._id, 
                calledBy: req.session.userId, 
                outcome: 'callback', 
                notes: 'Devuelto desde Pipeline: ' + customer.name, 
                resolved: false 
            });
            return res.json({ success: true, message: 'Cliente enviado a Seguimiento.' });
        }
        res.json({ success: true, message: 'Cliente eliminado.' });
    } catch (error) { 
        console.error('eliminarDelPipeline error:', error);
        next(error);
    }
};
