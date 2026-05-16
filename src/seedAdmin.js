const User = require('./models/User');
const bcrypt = require('bcrypt');

async function seedAdmin() {
    try {
        const email = 'todop@skyweb.com';
        const password = 'admin123456';
        
        // Verificar si ya existe
        const existing = await User.findOne({ email });
        if (existing) {
            console.log('✅ Admin ya existe:', email);
            return;
        }
        
        // Crear admin
        const hash = await bcrypt.hash(password, 10);
        await User.create({
            username: 'todop',
            email: email,
            password: hash,
            role: 'admin',
            fullName: 'Admin Total'
        });
        
        console.log('✅ ADMIN CREADO:', email, '| Pass:', password);
    } catch (err) {
        console.error('❌ Error seeding admin:', err.message);
    }
}

module.exports = seedAdmin;
