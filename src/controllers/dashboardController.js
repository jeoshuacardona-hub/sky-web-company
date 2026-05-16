const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CallLog = require('../models/CallLog');
const Task = require('../models/Task');

exports.getDashboard = async (req, res, next) => {
    try {
        const newLeads = await Lead.countDocuments({ status: 'new' });
        const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
        const convertedLeads = await Lead.countDocuments({ status: 'converted' });
        const lostLeads = await Lead.countDocuments({ status: 'lost' });
        const totalLeads = newLeads + contactedLeads + convertedLeads + lostLeads;
        
        const pipelineValue = await Customer.aggregate([
            { $match: { status: { $in: ['prospect', 'qualified', 'proposal', 'negotiation'] } } },
            { $group: { _id: null, total: { $sum: '$value' } } }
        ]);
        
        const todoTasks = await Task.countDocuments({ status: 'todo' });
        const doneTasks = await Task.countDocuments({ status: 'done' });
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            stats: {
                totalLeads,
                newLeads,
                convertedLeads,
                pipelineValue: pipelineValue[0] ? pipelineValue[0].total : 0
            },
            leadsByStatus: { new: newLeads, contacted: contactedLeads, converted: convertedLeads, lost: lostLeads, qualified: 0 },
            tasksByStatus: { todo: todoTasks, done: doneTasks }
        });
    } catch (error) { next(error); }
};
