import 'dotenv/config';
// @ts-ignore - pg types are available via @types/pg
import pg from 'pg';
const { Pool } = pg;

// Configuración de la base de datos desde variables de entorno
// Prioridad: DATABASE_URL > variables individuales
const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    // Si existe DATABASE_URL, usarla directamente (tiene prioridad)
    return {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
    };
  } else {
    // Si no, usar variables individuales
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bot_agencia',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
};

const pool = new Pool(getPoolConfig());

export interface LugarDB {
  id: string;
  ciudad_id: number;
  ciudad_nombre: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  ubicacion?: string;
  pagina_web?: string;
  tags: string[];
  imagenes_url: string[];
}

export interface CiudadDB {
  id: number;
  nombre: string;
}

export interface UsuarioDB {
  telefono: string;
  nombre?: string;
  ciudad_id?: number;
  ciudad_nombre?: string;
  estado_conversacion: string;
  fecha_ultima_interaccion: Date;
  intereses: string[];
}

export class DatabaseService {
  /**
   * Obtiene todos los lugares con sus relaciones
   */
  static async getLugares(): Promise<LugarDB[]> {
    const query = `
      SELECT 
        l.id,
        l.ciudad_id,
        c.nombre as ciudad_nombre,
        l.categoria,
        l.nombre,
        l.descripcion,
        l.ubicacion,
        l.pagina_web
      FROM lugares l
      INNER JOIN ciudades c ON l.ciudad_id = c.id
      ORDER BY l.nombre
    `;

    const result = await pool.query(query);
    const lugares = result.rows;

    // Obtener tags e imágenes para cada lugar
    for (const lugar of lugares) {
      lugar.tags = await this.getTagsByLugarId(lugar.id);
      lugar.imagenes_url = await this.getImagenesByLugarId(lugar.id);
    }

    return lugares;
  }

  /**
   * Obtiene un lugar por ID
   */
  static async getLugarById(id: string): Promise<LugarDB | null> {
    const query = `
      SELECT 
        l.id,
        l.ciudad_id,
        c.nombre as ciudad_nombre,
        l.categoria,
        l.nombre,
        l.descripcion,
        l.ubicacion,
        l.pagina_web
      FROM lugares l
      INNER JOIN ciudades c ON l.ciudad_id = c.id
      WHERE l.id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const lugar = result.rows[0];
    lugar.tags = await this.getTagsByLugarId(lugar.id);
    lugar.imagenes_url = await this.getImagenesByLugarId(lugar.id);

    return lugar;
  }

  /**
   * Obtiene lugares por ciudad
   */
  static async getLugaresByCiudad(ciudadNombre: string): Promise<LugarDB[]> {
    const query = `
      SELECT 
        l.id,
        l.ciudad_id,
        c.nombre as ciudad_nombre,
        l.categoria,
        l.nombre,
        l.descripcion,
        l.ubicacion,
        l.pagina_web
      FROM lugares l
      INNER JOIN ciudades c ON l.ciudad_id = c.id
      WHERE c.nombre = $1
      ORDER BY l.nombre
    `;

    const result = await pool.query(query, [ciudadNombre]);
    const lugares = result.rows;

    for (const lugar of lugares) {
      lugar.tags = await this.getTagsByLugarId(lugar.id);
      lugar.imagenes_url = await this.getImagenesByLugarId(lugar.id);
    }

    return lugares;
  }

  /**
   * Obtiene lugares por categoría
   */
  static async getLugaresByCategoria(ciudadNombre: string, categoria: string): Promise<LugarDB[]> {
    const query = `
      SELECT 
        l.id,
        l.ciudad_id,
        c.nombre as ciudad_nombre,
        l.categoria,
        l.nombre,
        l.descripcion,
        l.ubicacion,
        l.pagina_web
      FROM lugares l
      INNER JOIN ciudades c ON l.ciudad_id = c.id
      WHERE c.nombre = $1 AND l.categoria = $2
      ORDER BY l.nombre
    `;

    const result = await pool.query(query, [ciudadNombre, categoria]);
    const lugares = result.rows;

    for (const lugar of lugares) {
      lugar.tags = await this.getTagsByLugarId(lugar.id);
      lugar.imagenes_url = await this.getImagenesByLugarId(lugar.id);
    }

    return lugares;
  }

  /**
   * Crea un nuevo lugar
   */
  static async createLugar(lugar: {
    id: string;
    ciudadNombre: string;
    categoria: string;
    nombre: string;
    descripcion: string;
    ubicacion?: string;
    pagina_web?: string;
    tags: string[];
    imagenes_url: string[];
  }): Promise<LugarDB> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener o crear ciudad
      let ciudadId: number;
      const ciudadResult = await client.query('SELECT id FROM ciudades WHERE nombre = $1', [lugar.ciudadNombre]);
      if (ciudadResult.rows.length === 0) {
        const insertCiudad = await client.query('INSERT INTO ciudades (nombre) VALUES ($1) RETURNING id', [lugar.ciudadNombre]);
        ciudadId = insertCiudad.rows[0].id;
      } else {
        ciudadId = ciudadResult.rows[0].id;
      }

      // Insertar lugar
      await client.query(
        `INSERT INTO lugares (id, ciudad_id, categoria, nombre, descripcion, ubicacion, pagina_web)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [lugar.id, ciudadId, lugar.categoria, lugar.nombre, lugar.descripcion, lugar.ubicacion || null, lugar.pagina_web || null]
      );

      // Insertar tags
      for (let i = 0; i < lugar.tags.length; i++) {
        await client.query(
          'INSERT INTO lugares_tags (lugar_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [lugar.id, lugar.tags[i]]
        );
      }

      // Insertar imágenes
      for (let i = 0; i < lugar.imagenes_url.length; i++) {
        await client.query(
          'INSERT INTO lugares_imagenes (lugar_id, url, orden) VALUES ($1, $2, $3)',
          [lugar.id, lugar.imagenes_url[i], i]
        );
      }

      await client.query('COMMIT');

      const lugarCreado = await this.getLugarById(lugar.id);
      if (!lugarCreado) {
        throw new Error('Error al recuperar el lugar creado');
      }
      return lugarCreado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza un lugar existente
   */
  static async updateLugar(id: string, lugar: {
    ciudadNombre?: string;
    categoria?: string;
    nombre?: string;
    descripcion?: string;
    ubicacion?: string;
    pagina_web?: string;
    tags?: string[];
    imagenes_url?: string[];
  }): Promise<LugarDB | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Si cambia la ciudad, obtener el nuevo ciudad_id
      if (lugar.ciudadNombre) {
        let ciudadId: number;
        const ciudadResult = await client.query('SELECT id FROM ciudades WHERE nombre = $1', [lugar.ciudadNombre]);
        if (ciudadResult.rows.length === 0) {
          const insertCiudad = await client.query('INSERT INTO ciudades (nombre) VALUES ($1) RETURNING id', [lugar.ciudadNombre]);
          ciudadId = insertCiudad.rows[0].id;
        } else {
          ciudadId = ciudadResult.rows[0].id;
        }

        await client.query('UPDATE lugares SET ciudad_id = $1 WHERE id = $2', [ciudadId, id]);
      }

      // Actualizar campos del lugar
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (lugar.categoria) {
        updates.push(`categoria = $${paramIndex++}`);
        values.push(lugar.categoria);
      }
      if (lugar.nombre) {
        updates.push(`nombre = $${paramIndex++}`);
        values.push(lugar.nombre);
      }
      if (lugar.descripcion) {
        updates.push(`descripcion = $${paramIndex++}`);
        values.push(lugar.descripcion);
      }
      if (lugar.ubicacion !== undefined) {
        updates.push(`ubicacion = $${paramIndex++}`);
        values.push(lugar.ubicacion || null);
      }
      if (lugar.pagina_web !== undefined) {
        updates.push(`pagina_web = $${paramIndex++}`);
        values.push(lugar.pagina_web || null);
      }

      if (updates.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE lugares SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      // Actualizar tags si se proporcionan
      if (lugar.tags) {
        await client.query('DELETE FROM lugares_tags WHERE lugar_id = $1', [id]);
        for (const tag of lugar.tags) {
          await client.query(
            'INSERT INTO lugares_tags (lugar_id, tag) VALUES ($1, $2)',
            [id, tag]
          );
        }
      }

      // Actualizar imágenes si se proporcionan
      if (lugar.imagenes_url) {
        await client.query('DELETE FROM lugares_imagenes WHERE lugar_id = $1', [id]);
        for (let i = 0; i < lugar.imagenes_url.length; i++) {
          await client.query(
            'INSERT INTO lugares_imagenes (lugar_id, url, orden) VALUES ($1, $2, $3)',
            [id, lugar.imagenes_url[i], i]
          );
        }
      }

      await client.query('COMMIT');

      return await this.getLugarById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un lugar
   */
  static async deleteLugar(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM lugares WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Obtiene todas las ciudades
   */
  static async getCiudades(): Promise<CiudadDB[]> {
    const result = await pool.query('SELECT id, nombre FROM ciudades ORDER BY nombre');
    return result.rows;
  }

  /**
   * Obtiene tags de un lugar
   */
  private static async getTagsByLugarId(lugarId: string): Promise<string[]> {
    const result = await pool.query('SELECT tag FROM lugares_tags WHERE lugar_id = $1 ORDER BY tag', [lugarId]);
    return result.rows.map((row: { tag: string }) => row.tag);
  }

  /**
   * Obtiene imágenes de un lugar
   */
  private static async getImagenesByLugarId(lugarId: string): Promise<string[]> {
    const result = await pool.query('SELECT url FROM lugares_imagenes WHERE lugar_id = $1 ORDER BY orden', [lugarId]);
    return result.rows.map((row: { url: string }) => row.url);
  }

  /**
   * Obtiene un usuario por teléfono
   */
  static async getUsuario(telefono: string): Promise<UsuarioDB | null> {
    const query = `
      SELECT 
        u.telefono,
        u.nombre,
        u.ciudad_id,
        c.nombre as ciudad_nombre,
        u.estado_conversacion,
        u.fecha_ultima_interaccion
      FROM usuarios u
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      WHERE u.telefono = $1
    `;

    const result = await pool.query(query, [telefono]);
    if (result.rows.length === 0) {
      return null;
    }

    const usuario = result.rows[0];
    const interesesResult = await pool.query('SELECT interes FROM usuarios_intereses WHERE telefono = $1', [telefono]);
    usuario.intereses = interesesResult.rows.map((row: { interes: string }) => row.interes);

    return usuario;
  }

  /**
   * Crea o actualiza un usuario
   */
  static async upsertUsuario(usuario: {
    telefono: string;
    nombre?: string;
    ciudadNombre?: string;
    estado_conversacion?: string;
    intereses?: string[];
  }): Promise<UsuarioDB> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let ciudadId: number | null = null;
      if (usuario.ciudadNombre) {
        const ciudadResult = await client.query('SELECT id FROM ciudades WHERE nombre = $1', [usuario.ciudadNombre]);
        if (ciudadResult.rows.length > 0) {
          ciudadId = ciudadResult.rows[0].id;
        }
      }

      await client.query(
        `INSERT INTO usuarios (telefono, nombre, ciudad_id, estado_conversacion, fecha_ultima_interaccion)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (telefono) 
         DO UPDATE SET 
           nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
           ciudad_id = COALESCE(EXCLUDED.ciudad_id, usuarios.ciudad_id),
           estado_conversacion = COALESCE(EXCLUDED.estado_conversacion, usuarios.estado_conversacion),
           fecha_ultima_interaccion = CURRENT_TIMESTAMP`,
        [usuario.telefono, usuario.nombre || null, ciudadId, usuario.estado_conversacion || 'INICIO']
      );

      // Actualizar intereses si se proporcionan
      if (usuario.intereses) {
        await client.query('DELETE FROM usuarios_intereses WHERE telefono = $1', [usuario.telefono]);
        for (const interes of usuario.intereses) {
          await client.query(
            'INSERT INTO usuarios_intereses (telefono, interes) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [usuario.telefono, interes]
          );
        }
      }

      await client.query('COMMIT');

      const usuarioActualizado = await this.getUsuario(usuario.telefono);
      if (!usuarioActualizado) {
        throw new Error('Error al recuperar el usuario actualizado');
      }
      return usuarioActualizado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  static async close(): Promise<void> {
    await pool.end();
  }
}

