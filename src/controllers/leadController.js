const Lead = require('../models/Lead');
const User = require('../models/User');

// ✅ Helper: Obtener comerciales activos ordenados
async function getComerciales() {
    return await User.find({ role: 'comercial' }).sort({ email: 1 }).select('_id');
}

// ✅ Helper: Asignación Round Robin
function assignRoundRobin(leads, comerciales) {
    return leads.map((lead, index) => ({
        ...lead,
        assignedTo: comerciales[index % comerciales.length]._id
    }));
}

exports.getLeads = async (req, res, next) => {
    try {
        const isAdmin = req.session.user.role === 'admin';
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        const leads = await Lead.find(filter).sort({ createdAt: -1 });
        let comerciales = [];
        if (isAdmin) {
            comerciales = await User.find({ role: 'comercial' }).sort({ username: 1 }).select('username fullName');
        }
        res.render('pages/leads', { 
            title: 'Leads', leads, isAdmin, comerciales, currentUser: req.session.user 
        });
    } catch (error) { next(error); }
};

exports.importLeads = async (req, res) => {
    try {
        const { leads, provider, assignTo } = req.body;
        if (!leads || !leads.length) return res.status(400).json({ success: false, error: 'No hay leads' });
        if (!provider) return res.status(400).json({ success: false, error: 'Falta proveedor' });

        // Mapeo flexible de columnas robusto para el formato de lead del cliente
        const toInsert = leads.map(l => {
            const name = l.name || l.Nombre || l.NOMBRE || l['Nombre Completo'] || l.Negocio || l.negocio || l.NEGOCIO || 'Sin Nombre';
            const phone = l.phone || l.Phone || l.Telefono || l.TELEFONO || l.WhatsApp || l['WhatsApp_Business'] || l.Teléfono || l.teléfono || l.telefono || l['Teléfono Confirmado'] || '';
            const email = l.email || l.Email || l.EMAIL || '';
            const company = l.company || l.Company || l.Empresa || l.EMPRESA || l.Sedes || l.Nicho || l.nicho || l.NICHO || '';
            const city = l.city || l.City || l.Ciudad || l.CIUDAD || '';
            
            // Consolidar toda la metadata extra en el campo de Notas para no perder información
            const notesArray = [];
            if (l.notes || l.Notes || l.Notas) notesArray.push(l.notes || l.Notes || l.Notas);
            if (l.Dirección || l.dirección || l.direccion || l.Direccion) notesArray.push('Dirección: ' + (l.Dirección || l.dirección || l.direccion || l.Direccion));
            if (l.Nicho || l.nicho || l.NICHO) notesArray.push('Nicho: ' + (l.Nicho || l.nicho || l.NICHO));
            if (l.Website || l.website) notesArray.push('Website: ' + (l.Website || l.website));
            if (l['Necesidades del Negocio']) notesArray.push('Necesidades: ' + l['Necesidades del Negocio']);
            if (l['Falencias Detectadas']) notesArray.push('Falencias: ' + l['Falencias Detectadas']);
            if (l.Instagram) notesArray.push('Instagram: ' + l.Instagram);
            if (l.Facebook) notesArray.push('Facebook: ' + l.Facebook);
            if (l.LinkedIn) notesArray.push('LinkedIn: ' + l.LinkedIn);
            if (l.TikTok) notesArray.push('TikTok: ' + l.TikTok);
            
            const notes = notesArray.join(' | ');
            
            return {
                name, phone, email, company, city, notes,
                source: l.source || 'csv', status: 'new',
                providedBy: provider, createdBy: req.session.userId
            };
        });

        const validLeads = toInsert.filter(l => l.name && l.name !== 'Sin Nombre');
        if (validLeads.length === 0) return res.status(400).json({ success: false, error: 'No hay leads válidos' });

        // Si se especificó un asesor concreto para asignar
        if (assignTo && assignTo !== 'round-robin') {
            const advisor = await User.findById(assignTo);
            if (advisor) {
                validLeads.forEach(l => {
                    l.assignedTo = advisor._id;
                });
                await Lead.insertMany(validLeads);
                return res.json({ success: true, message: `Importados ${validLeads.length} leads asignados a ${advisor.fullName || advisor.username}` });
            }
        }

        // ✅ ROUND ROBIN: Asignar a comerciales
        const comerciales = await getComerciales();
        if (comerciales.length > 0) {
            const assigned = assignRoundRobin(validLeads, comerciales);
            await Lead.insertMany(assigned);
            return res.json({ success: true, message: `Importados ${assigned.length} leads asignados a ${comerciales.length} comerciales` });
        }

        // Si no hay comerciales, guardar sin asignar
        await Lead.insertMany(validLeads);
        res.json({ success: true, message: `Importados ${validLeads.length} leads` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addLead = async (req, res) => {
    try {
        const { name, phone, email, company, city, notes, source } = req.body;
        
        // ✅ ROUND ROBIN para lead individual
        const comerciales = await getComerciales();
        let assignedTo = null;
        if (comerciales.length > 0) {
            // Asignar al siguiente en ciclo basado en timestamp
            const index = Date.now() % comerciales.length;
            assignedTo = comerciales[index]._id;
        }
        
        await Lead.create({
            name, phone, email, company, city, notes, source: source || 'manual',
            status: 'new', assignedTo, createdBy: req.session.userId
        });
        res.redirect('/leads');
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
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.deleteAllLeads = async (req, res) => {
    try {
        await Lead.deleteMany({});
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
