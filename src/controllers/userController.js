const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/login');
        res.render('pages/profile', { title: 'Mi Perfil', user });
    } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { fullName, bio, phone, department, avatar } = req.body;
        await User.findByIdAndUpdate(req.session.userId, {
            fullName,
            bio,
            phone,
            department,
            avatar,
            updatedAt: new Date()
        });
        req.session.user = await User.findById(req.session.userId);
        res.redirect('/profile?success=1');
    } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.userId);
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.redirect('/profile?error=password_incorrect');
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(req.session.userId, { password: hashedPassword });
        res.redirect('/profile?success=password_changed');
    } catch (error) { next(error); }
};

exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('pages/users', { title: 'Usuarios', users });
    } catch (error) { next(error); }
};

exports.createUser = async (req, res, next) => {
    try {
        const { username, email, password, role, fullName } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'El usuario o email ya existe' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'comercial',
            fullName: fullName || username
        });
        
        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
    try {
        const { password, ...updateData } = req.body;
        if (password && password.length > 0) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) { next(error); }
};
