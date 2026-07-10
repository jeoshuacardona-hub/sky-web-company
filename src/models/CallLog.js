const mongoose = require('mongoose');
const callLogSchema = new mongoose.Schema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    outcome: { type: String, enum: ['scheduled', 'callback', 'rejected', 'no_answer', 'interested'], required: true },
    notes: { type: String, default: '' },
    callbackDate: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    resolved: { type: Boolean, default: false },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }
}, { timestamps: true });

callLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
