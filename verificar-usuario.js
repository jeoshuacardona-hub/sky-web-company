require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function verificar() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({});
    console.log('\n📋 USUARIOS EN LA BASE DE DATOS:');
    console.log('================================');
    users.forEach(u => {
      console.log(`\n👤 Username: ${u.username}`);
      console.log(`📧 Email: ${u.email}`);
      console.log(`🎭 Rol: ${u.role}`);
      console.log(`📝 Nombre: ${u.fullName || 'N/A'}`);
    });
    console.log('\n================================');
    console.log(`Total: ${users.length} usuario(s)`);
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
verificar();
