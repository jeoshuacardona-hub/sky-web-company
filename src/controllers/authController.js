const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.render('pages/login', { error: 'Por favor ingresa usuario y contraseña' });
        }

        // Buscar usuario por email O username
        const user = await User.findOne({
            $or: [
                { email: username },
                { username: username }
            ]
        });

        if (!user) {
            return res.render('pages/login', { error: 'Usuario o contraseña incorrectos' });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('pages/login', { error: 'Usuario o contraseña incorrectos' });
        }

        // Crear sesión
        req.session.userId = user._id;
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        };

        // Redirigir al dashboard
        res.redirect('/');
    } catch (error) {
        next(error);
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Could not log out');
        res.redirect('/login');
    });
};

exports.register = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;
        
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario o email ya existe' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'user'
        });
        
        res.json({ success: true, userId: user._id });
    } catch (error) {
        next(error);
    }
};
