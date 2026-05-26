const User = require('../models/User');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Meeting = require('../models/Meeting');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        res.render('pages/profile', { title: 'Mi Perfil', user, currentUser: req.session.user });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone, bio, avatar } = req.body;
        await User.findByIdAndUpdate(req.session.userId, { 
            fullName, email, phone, bio, avatar, 
            updatedAt: Date.now() 
        });
        res.redirect('/profile');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password');
        for (let user of users) {
            user.leadsCount = await Lead.countDocuments({ assignedTo: user._id });
            user.callsCount = await CallLog.countDocuments({ calledBy: user._id });
            user.meetingsCount = await Meeting.countDocuments({ createdBy: user._id });
        }
        res.render('pages/users', { 
            title: 'Usuarios',
            users,
            currentUser: req.session.user
        });
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res) => {
    try {
        const { fullName, email, username, password, role } = req.body;
        
        if (!fullName || !email || !username || !password) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'El email o usuario ya existe' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({
            fullName,
            email,
            username,
            password: hashedPassword,
            role: role || 'user'
        });

        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, role } = req.body;
        await User.findByIdAndUpdate(req.params.id, { 
            fullName, email, role, 
            updatedAt: Date.now() 
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
