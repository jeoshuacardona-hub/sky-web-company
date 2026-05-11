# GUÍA DE DESPLIEGUE RÁPIDO - SKY WEB COMPANY

Este proyecto está configurado para ser desplegado en cualquier VPS con Docker instalado.

## 🚀 Cómo publicar el sitio en 3 pasos:

### 1. Subir los archivos
Sube la carpeta completa `sky-web-company` a tu servidor mediante FTP, SCP o Git.

### 2. Configuración de Entorno
Edita el archivo `.env` en la raíz del proyecto con tus datos reales:
- `PORT=3000` (Puerto donde correrá la app)
- `MONGODB_URI=mongodb://mongo:27017/skywebcompany` (Importante: usa 'mongo' en lugar de 'localhost' dentro de Docker)
- `SESSION_SECRET=un_secreto_muy_largo_y_seguro_aqui`
- `ENV=production`

### 3. Lanzar la aplicación
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
docker-compose up -d --build
```

¡Y listo! Tu aplicación estará disponible en `http://tu-ip-del-servidor:3000`.

---

## 🔑 Credenciales Iniciales (Administrador)
El sistema crea automáticamente un usuario la primera vez que inicia:
- **Email:** admin@skywebcompany.com
- **Contraseña:** admin123

*(Se recomienda cambiar la contraseña inmediatamente desde el perfil tras el primer login).*

## 🛠️ Mantenimiento
- Para ver los logs: `docker-compose logs -f`
- Para reiniciar el servidor: `docker-compose restart`
- Para detener todo: `docker-compose down`
