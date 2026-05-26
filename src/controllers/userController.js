const User = require('../models/User');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Meeting = require('../models/Meeting');
const bcrypt = require('bcrypt');

exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password');
        
        // Obtener stats para cada usuario
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
        
        // Validación básica
        if (!fullName || !email || !username || !password) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }

        // Verificar si ya existe el correo o usuario
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'El email o usuario ya existe' });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario
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

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
