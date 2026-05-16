require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function verificarYCrear() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Buscar angelrios
    let angel = await User.findOne({ 
      $or: [
        { email: 'angelrios@skyweb.com' },
        { username: 'angelrios' }
      ]
    });
    
    if (angel) {
      console.log('\n✅ USUARIO ANGEL ENCONTRADO:');
      console.log('👤 Username:', angel.username);
      console.log('📧 Email:', angel.email);
      console.log('🎭 Rol:', angel.role);
      console.log('📝 Nombre:', angel.fullName || 'N/A');
      console.log('\n🔑 Para login usa: angelrios@skyweb.com / 123456');
    } else {
      console.log('\n⚠️ Usuario angelrios NO existe. Creándolo...');
      
      const password = '123456';
      const passwordHash = await bcrypt.hash(password, 10);
      
      angel = await User.create({
        username: 'angelrios',
        email: 'angelrios@skyweb.com',
        password: passwordHash,
        role: 'comercial',
        fullName: 'Angel Rios'
      });
      
      console.log('✅ USUARIO ANGEL CREADO:');
      console.log('📧 Email: angelrios@skyweb.com');
      console.log('🔑 Contraseña: 123456');
      console.log('🎭 Rol: comercial');
    }
    
    // Listar TODOS los usuarios
    console.log('\n📋 TODOS LOS USUARIOS EN LA BD:');
    const todos = await User.find({});
    todos.forEach((u, i) => {
      console.log(`${i+1}. ${u.email} (${u.role}) - ${u.fullName || u.username}`);
    });
    
    await mongoose.disconnect();
    process.exit();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n💡 Si dice "bad auth", revisa tu MONGODB_URI en Render');
    process.exit(1);
  }
}
verificarYCrear();
