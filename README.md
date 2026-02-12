# Backend - Agencia Gestión

Backend API para el sistema de gestión de lugares del Bot Agencia EVA.

## 🚀 Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# JWT Secret (cambiar en producción)
JWT_SECRET=tu-secret-key-muy-segura-cambiar-en-produccion
JWT_EXPIRES_IN=24h

# Puerto del servidor
PORT=3000
```

### 3. Inicializar base de datos

Ejecutar el script para crear la tabla de administradores y el usuario por defecto:

```bash
npm run init:admin
```

Esto creará:
- La tabla `administradores`
- El administrador por defecto:
  - **Email**: `AdminEva2026@gmail.com`
  - **Password**: `Admin2026Eva`

### 4. Compilar TypeScript

```bash
npm run build
```

### 5. Iniciar el servidor

```bash
# Desarrollo (compila y ejecuta)
npm run dev

# Producción (solo ejecuta)
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📡 Endpoints de la API

### Autenticación

#### POST `/api/auth/login`
Login de administrador

**Request:**
```json
{
  "email": "AdminEva2026@gmail.com",
  "password": "Admin2026Eva"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "administrador": {
    "id": "uuid",
    "email": "AdminEva2026@gmail.com",
    "nombre": "Administrador EVA"
  }
}
```

#### POST `/api/auth/verify`
Verifica si un token es válido (requiere autenticación)

**Headers:**
```
Authorization: Bearer <token>
```

### Lugares (requieren autenticación)

- `GET /api/lugares` - Obtener todos los lugares
- `GET /api/lugares/:id` - Obtener un lugar por ID
- `POST /api/lugares` - Crear un nuevo lugar
- `PUT /api/lugares/:id` - Actualizar un lugar
- `DELETE /api/lugares/:id` - Eliminar un lugar

### Ciudades (requieren autenticación)

- `GET /api/ciudades` - Obtener todas las ciudades

### Usuarios (requieren autenticación)

- `GET /api/usuarios/:telefono` - Obtener un usuario
- `POST /api/usuarios` - Crear o actualizar un usuario

## 🔐 Autenticación

Todas las rutas (excepto `/api/auth/login`) requieren autenticación mediante JWT.

El frontend debe incluir el token en el header:
```
Authorization: Bearer <token>
```

## 🗄️ Estructura del Proyecto

```
Agencia-Gestion-Backend/
├── src/
│   ├── server/
│   │   └── api.ts              # Servidor Express y rutas
│   ├── services/
│   │   ├── AuthService.ts      # Servicio de autenticación
│   │   └── DatabaseService.ts  # Servicio de base de datos
│   ├── middleware/
│   │   └── auth.ts             # Middleware de autenticación JWT
│   └── models/
│       └── Lugar.ts            # Interfaces de modelos
├── database/
│   ├── init_admin.js           # Script de inicialización
│   └── create_admin_table.sql  # SQL para crear tabla
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Scripts Disponibles

- `npm run build` - Compila TypeScript
- `npm run watch` - Compila en modo watch
- `npm start` - Inicia el servidor (producción)
- `npm run dev` - Compila y ejecuta (desarrollo)
- `npm run init:admin` - Inicializa tabla de administradores

## 📝 Notas

- El servidor crea automáticamente el administrador por defecto al iniciar si no existe
- Las contraseñas se almacenan con hash bcrypt (10 salt rounds)
- Los tokens JWT expiran en 24 horas por defecto
- El servidor soporta SSL automáticamente para conexiones a Render.com
- Todas las rutas están protegidas con autenticación JWT

## 🚀 Despliegue

Para desplegar el backend:

1. Configurar variables de entorno en el servidor
2. Compilar el proyecto: `npm run build`
3. Iniciar el servidor: `npm start`

El frontend debe configurar la variable `API_BASE_URL` para apuntar a la URL del backend desplegado.

"# Agencia-Eva-Backend" 
