require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ ¡Conexión exitosa!');
    
    // Listar colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Colecciones encontradas:', collections.map(c => c.name));
    
    // Contar usuarios
    const User = require('./src/models/User');
    const count = await User.countDocuments();
    console.log(`👥 Usuarios en BD: ${count}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  }
}
test();
