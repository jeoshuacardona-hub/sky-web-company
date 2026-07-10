const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    company: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new', index: true },
    source: { type: String },
    city: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    providedBy: { type: String, default: 'Otro' }
}, { timestamps: true });
module.exports = mongoose.model('Lead', leadSchema);
