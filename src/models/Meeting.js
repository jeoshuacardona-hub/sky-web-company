const mongoose = require('mongoose');
const meetingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    start: { type: Date, required: true },
    end: { type: Date },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Meeting', meetingSchema);
