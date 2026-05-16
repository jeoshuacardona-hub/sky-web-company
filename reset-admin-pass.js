require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const newPassword = 'admin123456';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email: 'admin@skywebcompany.com' }, { password: passwordHash });
    console.log('✅ Contraseña del admin reseteada:');
    console.log('📧 Email: admin@skywebcompany.com');
    console.log('🔑 Nueva contraseña: ' + newPassword);
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
resetPassword();
