const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    company: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
    source: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Lead', leadSchema);
