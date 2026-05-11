const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    status: {
        type: String,
        enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
        default: 'prospect'
    },
    value: { type: Number, default: 0 },
    notes: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
