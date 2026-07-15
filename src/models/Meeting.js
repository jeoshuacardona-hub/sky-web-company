const mongoose = require('mongoose');
const meetingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    description: String,
    location: String,
    type: { type: String, default: 'reunion' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    googleEventId: { type: String },
    meetLink: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Meeting', meetingSchema);
