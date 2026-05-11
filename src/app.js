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

  // Ruta robusta para archivos estáticos en Docker/Linux
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(session({
      secret: process.env.SESSION_SECRET || 'skyweb_backup_secret_2026',
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({
          mongoUrl: process.env.MONGODB_URI,
      }),
      cookie: {
          secure: process.env.NODE_ENV === 'production',
          maxAge: 1000 * 60 * 60 * 24 // 24 horas
      }
  }));

  // --- DB CONNECTION ---
  const connectDB = async () => {
      try {
          await mongoose.connect(process.env.MONGODB_URI);
          console.log('✅ Connected to MongoDB Atlas');
          await seedService();
      } catch (err) {
          console.error('❌ MongoDB Connection Error:', err);
      }
  };

  connectDB();

  // --- IMPORTS ---
  const authRoutes = require('./routes/authRoutes');
  const businessRoutes = require('./routes/businessRoutes');

  // --- ROUTES ---
  app.use(authRoutes);
  app.use(businessRoutes);

  // Manejo de errores 404 (Página no encontrada)
  app.use((req, res) => {
      res.status(404).send('<h1>404 - Página no encontrada</h1><p>Lo sentimos, esta página de Sky Web Company no existe.</p>');
  });

  // Escuchar en 0.0.0.0 para compatibilidad total con Render
  app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Sky Web Company Server started on port ${PORT}`);
  });
