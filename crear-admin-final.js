require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function crearAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const password = 'admin123456';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Crear o actualizar usuario admin
    await User.findOneAndUpdate(
      { email: 'todop@skyweb.com' },
      {
        username: 'todop',
        email: 'todop@skyweb.com',
        password: passwordHash,
        role: 'admin',
        fullName: 'Admin Total'
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ ADMIN CREADO/ACTUALIZADO');
    console.log('📧 Email: todop@skyweb.com');
    console.log('🔑 Contraseña: admin123456');
    console.log('🎭 Rol: admin (acceso total)');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
crearAdmin();
