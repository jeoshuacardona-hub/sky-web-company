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
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan datos obligatorios (nombre, email, usuario, contraseña)' 
            });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o usuario ya existe' 
            });
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
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al crear usuario' 
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, role } = req.body;
        
        // Validar datos requeridos
        if (!fullName || !email || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan datos obligatorios (nombre, email, rol)' 
            });
        }
        
        // Verificar que el email no esté en uso por otro usuario
        const existingUser = await User.findOne({ 
            email, 
            _id: { $ne: req.params.id } 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email ya está en uso por otro usuario' 
            });
        }
        
        await User.findByIdAndUpdate(req.params.id, { 
            fullName, 
            email, 
            role, 
            updatedAt: Date.now() 
        });
        
        res.json({ 
            success: true, 
            message: 'Usuario actualizado correctamente' 
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al actualizar usuario' 
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Obtener estadísticas del usuario
        user.leadsCount = await Lead.countDocuments({ assignedTo: user._id });
        user.callsCount = await CallLog.countDocuments({ calledBy: user._id });
        user.meetingsCount = await Meeting.countDocuments({ createdBy: user._id });
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al obtener usuario' 
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // No permitir eliminar admins
        if (user.role === 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'No se puede eliminar un usuario administrador' 
            });
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ 
            success: true, 
            message: 'Usuario eliminado correctamente' 
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al eliminar usuario' 
        });
    }
};
