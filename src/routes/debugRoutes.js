const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/authMiddleware').adminOnly;

// Endpoint TEMPORAL para crear admin - ELIMINAR después de usar
router.get('/api/debug/create-admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Verificar si ya existe
        let admin = await User.findOne({ email: 'admin@skywebcompany.com' });
        
        if (admin) {
            return res.json({ 
                success: true, 
                message: 'Admin ya existe',
                user: { email: admin.email, role: admin.role }
            });
        }
        
        // Crear admin
        const password = 'admin123456';
        const passwordHash = await bcrypt.hash(password, 10);
        
        admin = await User.create({
            username: 'admin',
            email: 'admin@skywebcompany.com',
            password: passwordHash,
            role: 'admin',
            fullName: 'Administrador Sky Web'
        });
        
        res.json({ 
            success: true, 
            message: '✅ Admin creado exitosamente',
            credentials: {
                email: 'admin@skywebcompany.com',
                password: password,
                role: 'admin'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para listar todos los usuarios (debug)
router.get('/api/debug/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
