  const express = require('express');
  const path = require('path');
  const dotenv = require('dotenv');
  const session = require('express-session');
  const MongoStore = require('connect-mongo');
  const mongoose = require('mongoose');
  const seedService = require('./services/seedService');

  dotenv.config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // --- MIDDLEWARE ---
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORRECCIÓN SENIOR: Ruta robusta para archivos estáticos en Docker
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(session({
      secret: process.env.SESSION_SECRET || 'skyweb_backup_secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
          mongoUrl: process.env.MONGODB_URI,
      }),
      cookie: {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 1000 * 60 * 60 * 24 // 24 hours
      }
  }));

  // --- DB CONNECTION ---
  // Añadimos un try/catch global para evitar que el servidor crashee si la DB tarda
  const connectDB = async () => {
      try {
          await mongoose.connect(process.env.MONGODB_URI);
          console.log('✅ Connected to MongoDB');
          await seedService();
      } catch (err) {
          console.error('❌ MongoDB Connection Error:', err);
          // No matamos el proceso, dejamos que el servidor intente seguir
      }
  };

  connectDB();

  // --- IMPORTS ---
  const authRoutes = require('./routes/authRoutes');
  const businessRoutes = require('./routes/businessRoutes');

  // --- ROUTES ---
  app.use(authRoutes);
  app.use(businessRoutes);

  // Manejo de errores 404
  app.use((req, res) => {
      res.status(404).send('Page not found');
  });

  app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Sky Web Company Server started on port ${PORT}`);
  });
