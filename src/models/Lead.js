const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    company: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
    source: { type: String },
    city: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // ✅ NUEVO: Quién proporcionó el lead (Angel Mateo, Danilo, Julian)
    providedBy: { type: String, enum: ['Angel Mateo', 'Danilo', 'Julian', 'Otro'], default: 'Otro' }
}, { timestamps: true });
module.exports = mongoose.model('Lead', leadSchema);
