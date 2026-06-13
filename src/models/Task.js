const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { 
        type: String, 
        enum: ['baja', 'media', 'alta'],
        default: 'media'
    },
    status: { 
        type: String, 
        enum: ['pendiente', 'en_proceso', 'completada'],
        default: 'pendiente'
    },
    dueDate: { type: Date },
    relatedLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
