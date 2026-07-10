const mongoose = require('mongoose');
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    phone: { type: String, sparse: true },
    company: { type: String },
    city: { type: String },
    status: { 
        type: String, 
        enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        default: 'prospect',
        index: true
    },
    value: { type: Number, default: 0 },
    source: { type: String, default: 'manual' },
    notes: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    closedDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
