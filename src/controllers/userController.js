const User = require('../models/User');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Meeting = require('../models/Meeting');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        res.render('pages/profile', { 
            title: 'Mi Perfil', 
            user, 
            currentUser: req.session.user,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('getProfile error:', error);
        next(error);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone, bio, avatar, department } = req.body;
        await User.findByIdAndUpdate(req.session.userId, { 
            fullName, 
            email, 
            phone, 
            bio, 
            avatar, 
            department,
            updatedAt: Date.now() 
        });
        res.redirect('/profile?success=profile_updated');
    } catch (error) {
        console.error('updateProfile error:', error);
        res.redirect('/profile?error=update_failed');
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?error=password_mismatch');
        }
        
        // Validar longitud mínima
        if (newPassword.length < 6) {
            return res.redirect('/profile?error=password_weak');
        }
        
        const user = await User.findById(req.session.userId);
        
        // Verificar contraseña actual
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.redirect('/profile?error=password_incorrect');
        }
        
        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.redirect('/profile?success=password_changed');
    } catch (error) {
        console.error('changePassword error:', error);
        res.redirect('/profile?error=password_change_failed');
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

exports.assignLeadsToJoseDaniel = async (req, res, next) => {
    try {
        // 1. Buscar a Jose Daniel (insensible a mayúsculas/minúsculas y por username como fallback)
        const jose = await User.findOne({
            $or: [
                { email: { $regex: /^jdaniel@skyweb\.com$/i } },
                { username: { $regex: /^jdaniel$/i } }
            ]
        });
        
        if (!jose) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario Jose Daniel (jdaniel@skyweb.com) no encontrado en la base de datos' 
            });
        }
        
        // 2. Intentar asignar los leads completamente sin asignar (assignedTo null o inexistente)
        let unassignedLeads = await Lead.find({
            $or: [
                { assignedTo: null },
                { assignedTo: { $exists: false } }
            ]
        });
        
        let assignedCount = 0;
        
        if (unassignedLeads.length > 0) {
            const ids = unassignedLeads.map(l => l._id);
            const updateResult = await Lead.updateMany(
                { _id: { $in: ids } },
                { 
                    $set: { 
                        assignedTo: jose._id,
                        status: 'new'
                    } 
                }
            );
            assignedCount = updateResult.modifiedCount;
        }
        
        // 3. Si Jose Daniel sigue teniendo pocos leads (por ejemplo, queremos que tenga al menos 26)
        // y no quedan leads sin asignar en la BD, tomamos leads con estado 'new' (sin llamar)
        // de los otros asesores para equilibrar, SIN TOCAR los que ya tienen llamadas o seguimiento.
        const currentJoseLeads = await Lead.countDocuments({ assignedTo: jose._id });
        const targetLeads = 26; // cantidad promedio que tienen los demás
        
        let transferredCount = 0;
        
        if (currentJoseLeads < targetLeads) {
            const needed = targetLeads - currentJoseLeads;
            
            // Buscar leads en estado 'new' que pertenecen a otros asesores
            const candidates = await Lead.find({
                assignedTo: { $ne: jose._id, $exists: true, $ne: null },
                status: 'new'
            }).limit(needed);
            
            if (candidates.length > 0) {
                const candidateIds = candidates.map(l => l._id);
                const transferResult = await Lead.updateMany(
                    { _id: { $in: candidateIds } },
                    { $set: { assignedTo: jose._id } }
                );
                transferredCount = transferResult.modifiedCount;
            }
        }
        
        // 4. Responder con el resumen exacto
        const totalJoseLeads = await Lead.countDocuments({ assignedTo: jose._id });
        
        res.json({
            success: true,
            message: `${jose.fullName || jose.username} ahora tiene los leads asignados.`,
            details: {
                leadsAsignadosDesdeSinAsignar: assignedCount,
                leadsTransferidosParaEquilibrar: transferredCount,
                totalLeadsJoseDaniel: totalJoseLeads
            }
        });
    } catch (error) {
        console.error('assignLeadsToJoseDaniel error:', error);
        next(error);
    }
};

