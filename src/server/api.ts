import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { DatabaseService } from '../services/DatabaseService.js';
import { AuthService } from '../services/AuthService.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { Lugar } from '../models/Lugar.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Inicializar administrador por defecto al iniciar
AuthService.initializeDefaultAdmin().catch(console.error);

// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================

// POST /api/auth/login - Login de administrador
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const resultado = await AuthService.login({ email, password });
    
    if (resultado.success) {
      res.json({
        success: true,
        token: resultado.token,
        administrador: resultado.administrador
      });
    } else {
      res.status(401).json({
        success: false,
        error: resultado.error || 'Credenciales inválidas'
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al procesar el login' });
  }
});

// POST /api/auth/verify - Verificar token
app.post('/api/auth/verify', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json({
      success: true,
      administrador: {
        id: req.user!.id,
        email: req.user!.email
      }
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
});

// ============================================================
// RUTAS DE LUGARES
// ============================================================

// GET /api/lugares - Obtener todos los lugares
app.get('/api/lugares', requireAuth, async (req, res) => {
  try {
    const lugaresDB = await DatabaseService.getLugares();
    const lugares: Lugar[] = lugaresDB.map(l => ({
      id: l.id,
      ciudad: l.ciudad_nombre,
      categoria: l.categoria,
      nombre: l.nombre,
      descripcion: l.descripcion,
      ubicacion: l.ubicacion || undefined,
      tags: l.tags,
      imagenes_url: l.imagenes_url,
      pagina_web: l.pagina_web || undefined
    }));
    res.json(lugares);
  } catch (error) {
    console.error('Error obteniendo lugares:', error);
    res.status(500).json({ error: 'Error al obtener lugares' });
  }
});

// GET /api/lugares/:id - Obtener un lugar por ID
app.get('/api/lugares/:id', requireAuth, async (req, res) => {
  try {
    const lugarDB = await DatabaseService.getLugarById(req.params.id);
    if (!lugarDB) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }
    const lugar: Lugar = {
      id: lugarDB.id,
      ciudad: lugarDB.ciudad_nombre,
      categoria: lugarDB.categoria,
      nombre: lugarDB.nombre,
      descripcion: lugarDB.descripcion,
      ubicacion: lugarDB.ubicacion || undefined,
      tags: lugarDB.tags,
      imagenes_url: lugarDB.imagenes_url,
      pagina_web: lugarDB.pagina_web || undefined
    };
    res.json(lugar);
  } catch (error) {
    console.error('Error obteniendo lugar:', error);
    res.status(500).json({ error: 'Error al obtener lugar' });
  }
});

// POST /api/lugares - Crear un nuevo lugar
app.post('/api/lugares', requireAuth, async (req, res) => {
  try {
    const lugar: Lugar = req.body;
    
    const lugarDB = await DatabaseService.createLugar({
      id: lugar.id,
      ciudadNombre: lugar.ciudad,
      categoria: lugar.categoria,
      nombre: lugar.nombre,
      descripcion: lugar.descripcion,
      ubicacion: lugar.ubicacion,
      pagina_web: lugar.pagina_web,
      tags: lugar.tags,
      imagenes_url: lugar.imagenes_url
    });

    const lugarResponse: Lugar = {
      id: lugarDB.id,
      ciudad: lugarDB.ciudad_nombre,
      categoria: lugarDB.categoria,
      nombre: lugarDB.nombre,
      descripcion: lugarDB.descripcion,
      ubicacion: lugarDB.ubicacion || undefined,
      tags: lugarDB.tags,
      imagenes_url: lugarDB.imagenes_url,
      pagina_web: lugarDB.pagina_web || undefined
    };

    res.status(201).json(lugarResponse);
  } catch (error) {
    console.error('Error creando lugar:', error);
    res.status(500).json({ error: 'Error al crear lugar' });
  }
});

// PUT /api/lugares/:id - Actualizar un lugar
app.put('/api/lugares/:id', requireAuth, async (req, res) => {
  try {
    const lugarActualizado: Partial<Lugar> = req.body;
    
    const updateData: any = {};
    if (lugarActualizado.ciudad) updateData.ciudadNombre = lugarActualizado.ciudad;
    if (lugarActualizado.categoria) updateData.categoria = lugarActualizado.categoria;
    if (lugarActualizado.nombre) updateData.nombre = lugarActualizado.nombre;
    if (lugarActualizado.descripcion) updateData.descripcion = lugarActualizado.descripcion;
    if (lugarActualizado.ubicacion !== undefined) updateData.ubicacion = lugarActualizado.ubicacion;
    if (lugarActualizado.pagina_web !== undefined) updateData.pagina_web = lugarActualizado.pagina_web;
    if (lugarActualizado.tags) updateData.tags = lugarActualizado.tags;
    if (lugarActualizado.imagenes_url) updateData.imagenes_url = lugarActualizado.imagenes_url;

    const lugarDB = await DatabaseService.updateLugar(req.params.id, updateData);
    if (!lugarDB) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }

    const lugarResponse: Lugar = {
      id: lugarDB.id,
      ciudad: lugarDB.ciudad_nombre,
      categoria: lugarDB.categoria,
      nombre: lugarDB.nombre,
      descripcion: lugarDB.descripcion,
      ubicacion: lugarDB.ubicacion || undefined,
      tags: lugarDB.tags,
      imagenes_url: lugarDB.imagenes_url,
      pagina_web: lugarDB.pagina_web || undefined
    };

    res.json(lugarResponse);
  } catch (error) {
    console.error('Error actualizando lugar:', error);
    res.status(500).json({ error: 'Error al actualizar lugar' });
  }
});

// DELETE /api/lugares/:id - Eliminar un lugar
app.delete('/api/lugares/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await DatabaseService.deleteLugar(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }
    res.json({ message: 'Lugar eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando lugar:', error);
    res.status(500).json({ error: 'Error al eliminar lugar' });
  }
});

// GET /api/ciudades - Obtener todas las ciudades
app.get('/api/ciudades', requireAuth, async (req, res) => {
  try {
    const ciudades = await DatabaseService.getCiudades();
    res.json(ciudades);
  } catch (error) {
    console.error('Error obteniendo ciudades:', error);
    res.status(500).json({ error: 'Error al obtener ciudades' });
  }
});

// ============================================================
// RUTAS DE USUARIOS
// ============================================================

// GET /api/usuarios/:telefono - Obtener un usuario
app.get('/api/usuarios/:telefono', requireAuth, async (req, res) => {
  try {
    const usuario = await DatabaseService.getUsuario(req.params.telefono);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/usuarios - Crear o actualizar un usuario
app.post('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const usuario = await DatabaseService.upsertUsuario(req.body);
    res.json(usuario);
  } catch (error) {
    console.error('Error creando/actualizando usuario:', error);
    res.status(500).json({ error: 'Error al crear/actualizar usuario' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/verify`);
  console.log(`   GET  /api/lugares`);
  console.log(`   GET  /api/ciudades`);
});

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('Cerrando conexiones a la base de datos...');
  await DatabaseService.close();
  await AuthService.close();
  process.exit(0);
});

