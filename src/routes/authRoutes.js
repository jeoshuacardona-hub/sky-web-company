const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('pages/login', { title: 'Login', layout: 'layouts/auth' });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ email: username }, { username }] });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.render('pages/login', { 
                title: 'Login', 
                layout: 'layouts/auth',
                error: 'Credenciales inválidas' 
            });
        }
        
        req.session.userId = user._id;
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (error) {
        res.render('pages/login', { 
            title: 'Login', 
            layout: 'layouts/auth',
            error: 'Error al iniciar sesión' 
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
