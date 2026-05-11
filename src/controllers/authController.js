const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.seedAdmin = async () => {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await User.create({
            username: 'admin',
            email: 'admin@skywebcompany.com',
            password: hashedPassword,
            fullName: 'Administrador Sky Web',
            role: 'admin'
        });
        console.log('🌱 Admin user seeded: admin@skywebcompany.com / admin123');
    }
};

exports.register = async (req, res, next) => {
    try {
        const { username, email, password, fullName } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            fullName
        });
        res.status(201).json({ message: 'User created', userId: user._id });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send('Invalid credentials');
        }
        req.session.userId = user._id;
        req.session.user = { username: user.username, role: user.role };
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
