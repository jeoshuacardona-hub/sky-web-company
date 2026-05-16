const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Endpoint TEMPORAL para crear angelrios - ELIMINAR después de usar
router.get('/setup/create-angel', async (req, res) => {
    try {
        const { secret } = req.query;
        
        // Verificar clave secreta simple
        if (secret !== 'skyweb2026setup') {
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }
        
        // Verificar si ya existe
        let angel = await User.findOne({ email: 'angelrios@skyweb.com' });
        
        if (angel) {
            return res.json({ 
                success: true, 
                message: '✅ angelrios ya existe',
                user: { email: angel.email, role: angel.role, fullName: angel.fullName }
            });
        }
        
        // Crear angelrios
        const password = '123456';
        const passwordHash = await bcrypt.hash(password, 10);
        
        angel = await User.create({
            username: 'angelrios',
            email: 'angelrios@skyweb.com',
            password: passwordHash,
            role: 'comercial',
            fullName: 'Angel Rios',
            bio: '',
            phone: '',
            department: '',
            avatar: ''
        });
        
        res.json({ 
            success: true, 
            message: '✅ angelrios creado exitosamente en la BD',
            credentials: {
                email: 'angelrios@skyweb.com',
                password: password,
                role: 'comercial'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
