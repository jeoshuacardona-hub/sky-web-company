const Task = require('../models/Task');
const User = require('../models/User');

exports.getTasks = async (req, res, next) => {
    try {
        // 1. Definir isAdmin correctamente
        const isAdmin = req.session.user && req.session.user.role === 'admin';
        
        // 2. Filtrar tareas: Admin ve todas, comercial solo las suyas
        const filter = isAdmin ? {} : { assignedTo: req.session.userId };
        
        const tasks = await Task.find(filter).populate('assignedTo').populate('customer').sort({ createdAt: -1 });
        
        // 3. Obtener usuarios solo si es admin (para el selector de asignación)
        const users = isAdmin ? await User.find() : [];
        
        // 4. Pasar isAdmin a la vista
        res.render('pages/tasks', { 
            title: 'Tareas', 
            tasks, 
            users, 
            isAdmin 
        });
    } catch (error) { 
        next(error); 
    }
};

exports.createTask = async (req, res, next) => {
    try {
        await Task.create({
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            dueDate: req.body.dueDate || null,
            assignedTo: req.body.assignedTo || req.session.userId,
            status: 'todo'
        });
        res.redirect('/tasks');
    } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
    try {
        await Task.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/tasks');
    } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const update = { status: req.body.status };
        if (req.body.status === 'done') update.completedAt = new Date();
        await Task.findByIdAndUpdate(req.params.id, update);
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.redirect('/tasks');
    } catch (error) { next(error); }
};
