const express = require('express');
const InternalMessage = require('../models/InternalMessage');
const Ticket = require('../models/Ticket');
const router = express.Router();
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Customer = require('../models/Customer');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Solo admin puede acceder
const adminOnly = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    next();
};

router.post('/reset-all', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== 'DELETE_EVERYTHING') {
            return res.status(400).json({ success: false, message: 'Confirmación requerida' });
        }
        
        const leads = await Lead.deleteMany({});
        const callLogs = await CallLog.deleteMany({});
        const customers = await Customer.deleteMany({});
        const tasks = await Task.deleteMany({});
        
        res.json({ 
            success: true, 
            message: 'Base de datos reseteada completamente',
            deleted: {
                leads: leads.deletedCount,
                callLogs: callLogs.deletedCount,
                customers: customers.deletedCount,
                tasks: tasks.deletedCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Hard Reset - Eliminar todo
router.post('/api/admin/hard-reset', authMiddleware, adminOnly, async (req, res) => {
    try {
        const leads = await Lead.deleteMany({});
        const callLogs = await CallLog.deleteMany({});
        const customers = await Customer.deleteMany({});
        const tasks = await Task.deleteMany({});
        const tickets = await Ticket.deleteMany({});
        const messages = await InternalMessage.deleteMany({});
        
        res.json({ 
            success: true, 
            message: `Base de datos reseteada: ${leads.deletedCount} leads, ${callLogs.deletedCount} llamadas, ${customers.deletedCount} clientes, ${tasks.deletedCount} tareas, ${tickets.deletedCount} tickets, ${messages.deletedCount} mensajes eliminados`,
            deleted: {
                leads: leads.deletedCount,
                callLogs: callLogs.deletedCount,
                customers: customers.deletedCount,
                tasks: tasks.deletedCount,
                tickets: tickets.deletedCount,
                messages: messages.deletedCount
            }
        });
    } catch (error) {
        console.error('hard-reset error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// Redistribuir leads equitativamente entre comerciales
router.get('/api/admin/redistribute-leads', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Obtener todos los leads
        const allLeads = await Lead.find({}).select('_id');
        
        // Obtener todos los comerciales
        const comerciales = await User.find({ role: 'comercial' }).select('_id username fullName');
        
        if (comerciales.length === 0) {
            return res.json({ success: false, message: 'No hay comerciales registrados' });
        }
        
        // Shuffle aleatorio
        const shuffled = [...allLeads];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Distribuir equitativamente Y forzar status 'new'
        const distribution = {};
        comerciales.forEach(c => {
            distribution[c._id.toString()] = { user: c.fullName || c.username, count: 0 };
        });
        
        const updates = [];
        shuffled.forEach((lead, index) => {
            const comercial = comerciales[index % comerciales.length];
            updates.push({
                updateOne: {
                    filter: { _id: lead._id },
                    update: { 
                        $set: { 
                            assignedTo: comercial._id,
                            status: 'new'  // Forzar status new para que aparezcan en llamadas
                        } 
                    }
                }
            });
            distribution[comercial._id.toString()].count++;
        });
        
        // Ejecutar todas las actualizaciones
        if (updates.length > 0) {
            await Lead.bulkWrite(updates);
        }
        
        // Resumen
        const summary = Object.values(distribution).map(d => d.user + ': ' + d.count + ' leads');
        
        res.json({ 
            success: true, 
            message: 'Leads redistribuidos equitativamente con status new',
            total: allLeads.length,
            comerciales: comerciales.length,
            distribution: summary
        });
    } catch (error) {
        console.error('redistribute-leads error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// Diagnóstico: verificar jose1 y sus leads
router.get('/api/admin/check-jose1', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Buscar usuario
        const user = await User.findOne({ email: 'jose1@skyweb.com' });
        
        if (!user) {
            return res.json({ success: false, message: 'Usuario jose1@skyweb.com NO EXISTE' });
        }
        
        // Contar leads de jose1
        const joseLeads = await Lead.find({ assignedTo: user._id });
        const joseLeadsNew = await Lead.find({ assignedTo: user._id, status: 'new' });
        
        res.json({ 
            success: true,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            leads: {
                total: joseLeads.length,
                statusNew: joseLeadsNew.length,
                leads: joseLeads.slice(0, 5).map(l => ({
                    id: l._id,
                    name: l.name,
                    status: l.status,
                    phone: l.phone
                }))
            }
        });
    } catch (error) {
        console.error('check-jose1 error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// Dar leads a jose daniel SIN afectar otros usuarios
router.post('/api/admin/fix-jose-daniel-leads', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Buscar a jose daniel
        const jose = await User.findOne({ email: 'jdaniel@skyweb.com' });
        if (!jose) {
            return res.json({ success: false, message: 'Usuario jdaniel@skyweb.com no encontrado' });
        }
        
        // Obtener SOLO leads sin asignar (sin tocar los de otros usuarios)
        const unassignedLeads = await Lead.find({
            $or: [
                { assignedTo: null },
                { assignedTo: { $exists: false } }
            ]
        }).limit(26);
        
        if (unassignedLeads.length === 0) {
            return res.json({ success: false, message: 'No hay leads sin asignar disponibles' });
        }
        
        // Asignar a jose daniel
        const ids = unassignedLeads.map(l => l._id);
        await Lead.updateMany(
            { _id: { $in: ids } },
            { $set: { assignedTo: jose._id, status: 'new' } }
        );
        
        // Verificar
        const count = await Lead.countDocuments({ assignedTo: jose._id });
        
        res.json({ 
            success: true, 
            message: jose.fullName + ' ahora tiene ' + count + ' leads',
            assigned: unassignedLeads.length,
            total: count
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
