const Customer = require('../models/Customer');
const Task = require('../models/Task');

exports.getDashboard = async (req, res, next) => {
    try {
        const customerCount = await Customer.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: 'todo' });
        const closedWon = await Customer.countDocuments({ status: 'closed-won' });

        res.render('pages/index', {
            title: 'Dashboard Analytics',
            stats: {
                customers: customerCount,
                tasks: pendingTasks,
                revenue: closedWon
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getCustomers = async (req, res, next) => {
    try {
        const customers = await Customer.find().populate('assignedTo');
        res.render('pages/customers', {
            title: 'Client Management',
            customers
        });
    } catch (error) {
        next(error);
    }
};

exports.createCustomer = async (req, res, next) => {
    try {
        await Customer.create(req.body);
        res.redirect('/customers');
    } catch (error) {
        next(error);
    }
};

exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await Task.find().populate('customer').populate('assignedTo');
        res.render('pages/tasks', {
            title: 'Task Board',
            tasks
        });
    } catch (error) {
        next(error);
    }
};

exports.updateTaskStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await Task.findByIdAndUpdate(id, { status });
        res.redirect('/tasks');
    } catch (error) {
        next(error);
    }
};
