const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');

exports.getDashboard = async (req, res, next) => {
    try {
        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: 'new' });
        const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
        const convertedLeads = await Lead.countDocuments({ status: 'converted' });
        const lostLeads = await Lead.countDocuments({ status: 'lost' });
        
        const totalCustomers = await Customer.countDocuments();
        const pipelineValue = await Customer.aggregate([
            { $match: { status: { $in: ['prospect', 'qualified', 'proposal', 'negotiation'] } } },
            { $group: { _id: null, total: { $sum: '$value' } } }
        ]);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const callsToday = await CallLog.countDocuments({ createdAt: { $gte: today } });
        const scheduledToday = await CallLog.countDocuments({ 
            outcome: 'scheduled',
            createdAt: { $gte: today }
        });
        
        const pendingTasks = await Task.countDocuments({ status: { $in: ['todo', 'in-progress'] } });
        const completedTasks = await Task.countDocuments({ status: 'done' });
        
        const recentLeads = await Lead.find().sort({ createdAt: -1 }).limit(5);
        const recentCalls = await CallLog.find().populate('lead').sort({ createdAt: -1 }).limit(5);
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: {
                totalLeads,
                newLeads,
                contactedLeads,
                convertedLeads,
                lostLeads,
                totalCustomers,
                pipelineValue: pipelineValue[0] ? pipelineValue[0].total : 0,
                callsToday,
                scheduledToday,
                pendingTasks,
                completedTasks
            },
            recentLeads,
            recentCalls
        });
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: 'new' });
        const callsToday = await CallLog.countDocuments({ createdAt: { $gte: today } });
        const scheduledToday = await CallLog.countDocuments({ 
            outcome: 'scheduled',
            createdAt: { $gte: today }
        });
        
        res.json({
            success: true,
            stats: {
                totalLeads,
                newLeads,
                callsToday,
                scheduledToday
            }
        });
    } catch (error) {
        next(error);
    }
};
