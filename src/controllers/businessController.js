const Customer = require('../models/Customer');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
exports.getDashboard = async (req, res, next) => {
    try {
        const customerCount = await Customer.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: 'todo' });
        const closedWon = await Customer.countDocuments({ status: 'closed-won' });
        const leadsCount = await Lead.countDocuments();
        const recentLeads = await Lead.find().sort({ createdAt: -1 }).limit(5);
        const recentTasks = await Task.find({ status: 'todo' }).sort({ createdAt: -1 }).limit(5);
        res.render('pages/index', { title: 'Dashboard', stats: { customers: customerCount, tasks: pendingTasks, revenue: closedWon, leads: leadsCount, recentLeads, recentTasks } });
    } catch (error) { next(error); }
};
exports.getCustomers = async (req, res, next) => {
    try {
        const customers = await Customer.find().populate('assignedTo');
        res.render('pages/customers', { title: 'Clientes', customers });
    } catch (error) { next(error); }
};
exports.createCustomer = async (req, res, next) => {
    try {
        await Customer.create(req.body);
        res.redirect('/customers');
    } catch (error) { next(error); }
};
exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await Task.find().populate('customer').populate('assignedTo');
        res.render('pages/tasks', { title: 'Tareas', tasks });
    } catch (error) { next(error); }
};
exports.updateTaskStatus = async (req, res, next) => {
    try {
        const { id, status } = req.body;
        await Task.findByIdAndUpdate(id, { status });
        res.redirect('/tasks');
    } catch (error) { next(error); }
};
