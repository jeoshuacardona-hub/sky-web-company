const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: String, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['tecnico', 'facturacion', 'acceso', 'consulta', 'otro'],
        default: 'consulta'
    },
    priority: { 
        type: String, 
        enum: ['baja', 'media', 'alta', 'urgente'],
        default: 'media'
    },
    status: { 
        type: String, 
        enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
        default: 'abierto'
    },
    clientName: { type: String, required: true },
    clientContact: { type: String },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responses: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: true }
    }],
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    closedAt: { type: Date }
}, { timestamps: true });

// Auto-generar número de ticket
ticketSchema.pre('save', async function(next) {
    if (!this.ticketNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Ticket').countDocuments({ 
            ticketNumber: { $regex: `TK-${year}-` } 
        });
        this.ticketNumber = `TK-${year}-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
