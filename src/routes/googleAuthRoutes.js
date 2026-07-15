const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const googleCalendar = require('../utils/googleCalendar');
const User = require('../models/User');

// Iniciar autorización con Google
router.get('/auth/google', authMiddleware, (req, res) => {
    // Solo permitir que el administrador configure el calendario global
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Solo los administradores pueden vincular Google Calendar.');
    }
    const url = googleCalendar.getAuthUrl();
    res.redirect(url);
});

// Callback de Google OAuth
router.get('/auth/google/callback', authMiddleware, async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.redirect('/calendar?error=No+se+recibio+el+codigo+de+autorizacion');
        }
        
        await googleCalendar.saveTokens(req.session.userId, code);
        
        // Actualizar datos en sesión del usuario
        req.session.user = await User.findById(req.session.userId);
        
        res.redirect('/calendar?success=Google+Calendar+vinculado+correctamente');
    } catch (error) {
        console.error('Error en callback de Google:', error);
        res.redirect('/calendar?error=Error+vinculando+Google+Calendar');
    }
});

// Desvincular Google Calendar
router.get('/auth/google/disconnect', authMiddleware, async (req, res) => {
    try {
        if (req.session.user.role !== 'admin') {
            return res.status(403).send('No permitido.');
        }
        
        await User.findByIdAndUpdate(req.session.userId, {
            $unset: {
                googleAccessToken: 1,
                googleRefreshToken: 1,
                googleTokenExpiry: 1
            }
        });
        
        req.session.user = await User.findById(req.session.userId);
        res.redirect('/calendar?success=Google+Calendar+desvinculado');
    } catch (error) {
        console.error('Error desvinculando:', error);
        res.redirect('/calendar?error=Error+desvinculando+Google+Calendar');
    }
});

module.exports = router;
