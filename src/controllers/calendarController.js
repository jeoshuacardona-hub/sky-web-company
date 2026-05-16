const Meeting = require('../models/Meeting');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
exports.getCalendar = async (req, res, next) => {
    try {
        const leads = await Lead.find();
        const customers = await Customer.find();
        res.render('pages/calendar', { title: 'Calendario', leads, customers });
    } catch (error) { next(error); }
};
exports.getMeetings = async (req, res, next) => {
    try {
        const meetings = await Meeting.find().populate('lead').populate('customer').populate('createdBy');
        const events = meetings.map(m => ({ id: m._id, title: m.title, start: m.start, end: m.end, color: '#696cff' }));
        res.json(events);
    } catch (error) { next(error); }
};
exports.createMeeting = async (req, res, next) => {
    try {
        await Meeting.create({ ...req.body, createdBy: req.session.userId });
        res.json({ success: true });
    } catch (error) { next(error); }
};
exports.deleteMeeting = async (req, res, next) => {
    try {
        await Meeting.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { next(error); }
};
