import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
const { Pool } = pg;

// Configuración de la base de datos
const getPoolConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  // Validar que DATABASE_URL esté presente y sea una URL válida
  if (databaseUrl && databaseUrl.trim() !== '' && databaseUrl.startsWith('postgres://')) {
    try {
      // Validar que sea una URL válida
      new URL(databaseUrl);
      
      return {
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined,
      };
    } catch (error) {
      console.error('❌ DATABASE_URL tiene formato inválido:', error);
      // Continuar con variables individuales
    }
  }
  
  // Usar variables individuales como fallback
  const config: any = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bot_agencia',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  
  // Si estamos en Render y no hay DATABASE_URL, intentar detectar SSL
  if (process.env.RENDER && !databaseUrl) {
    config.ssl = { rejectUnauthorized: false };
  }
  
  return config;
};

const pool = new Pool(getPoolConfig());

const JWT_SECRET: string = process.env.JWT_SECRET || 'tu-secret-key-muy-segura-cambiar-en-produccion';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export interface AdministradorDB {
  id: string;
  email: string;
  password_hash: string;
  nombre?: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  administrador?: {
    id: string;
    email: string;
    nombre?: string;
  };
  error?: string;
}

export class AuthService {
  /**
   * Crea la tabla de administradores si no existe
   */
  static async createAdminTableIfNotExists(): Promise<void> {
    const client = await pool.connect();
    try {
      console.log('🔧 Verificando tabla de administradores...');
      
      // Crear tabla
      await client.query(`
        CREATE TABLE IF NOT EXISTS administradores (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          nombre VARCHAR(100),
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        );
      `);

      // Crear índices
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_administradores_email ON administradores(email);
        CREATE INDEX IF NOT EXISTS idx_administradores_activo ON administradores(activo);
      `);

      // Verificar si existe la función de trigger
      await client.query(`
        CREATE OR REPLACE FUNCTION actualizar_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Crear trigger
      await client.query(`
        DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_administradores ON administradores;
        CREATE TRIGGER trigger_actualizar_updated_at_administradores
            BEFORE UPDATE ON administradores
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_updated_at();
      `);

      console.log('✅ Tabla de administradores verificada/creada');
    } catch (error) {
      console.error('❌ Error creando tabla de administradores:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Busca un administrador por email
   */
  static async getAdministradorByEmail(email: string): Promise<AdministradorDB | null> {
    try {
      const query = 'SELECT * FROM administradores WHERE email = $1 AND activo = true';
      const result = await pool.query(query, [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error: any) {
      // Si la tabla no existe, intentar crearla
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.log('⚠️ Tabla administradores no existe, creándola...');
        try {
          await this.createAdminTableIfNotExists();
          // Reintentar la consulta
          const retryResult = await pool.query(query, [email.toLowerCase()]);
          if (retryResult.rows.length === 0) {
            return null;
          }
          return retryResult.rows[0];
        } catch (createError) {
          console.error('❌ Error creando tabla:', createError);
          throw createError;
        }
      }
      console.error('❌ Error buscando administrador:', error);
      throw error; // Re-lanzar para que el método login lo capture
    }
  }

  /**
   * Verifica la contraseña
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Genera un hash de contraseña
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Genera un token JWT
   */
  static generateToken(administrador: { id: string; email: string }): string {
    const payload = { 
      id: administrador.id, 
      email: administrador.email,
      type: 'admin'
    };
    
    // Convertir expiresIn a string explícitamente para evitar error de tipo
    const expiresInValue: string = String(JWT_EXPIRES_IN);
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: expiresInValue
    } as any);
  }

  /**
   * Verifica un token JWT
   */
  static verifyToken(token: string): { id: string; email: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Realiza el login de un administrador
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const administrador = await this.getAdministradorByEmail(credentials.email);
      
      if (!administrador) {
        console.log(`❌ Login fallido: No se encontró administrador con email ${credentials.email}`);
        return {
          success: false,
          error: 'Email o contraseña incorrectos'
        };
      }

      const passwordValid = await this.verifyPassword(credentials.password, administrador.password_hash);
      
      if (!passwordValid) {
        console.log(`❌ Login fallido: Contraseña incorrecta para ${credentials.email}`);
        return {
          success: false,
          error: 'Email o contraseña incorrectos'
        };
      }

      // Actualizar último login
      await pool.query(
        'UPDATE administradores SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [administrador.id]
      );

      // Generar token
      const token = this.generateToken({
        id: administrador.id,
        email: administrador.email
      });

      console.log(`✅ Login exitoso para ${administrador.email}`);
      return {
        success: true,
        token,
        administrador: {
          id: administrador.id,
          email: administrador.email,
          nombre: administrador.nombre || undefined
        }
      };
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      console.error('Detalles del error:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      
      // Si es un error de conexión a la base de datos, dar un mensaje más específico
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.message?.includes('connect')) {
        return {
          success: false,
          error: 'Error de conexión a la base de datos. Verifica la configuración de DATABASE_URL.'
        };
      }
      
      return {
        success: false,
        error: `Error al procesar el login: ${error?.message || 'Error desconocido'}`
      };
    }
  }

  /**
   * Crea un nuevo administrador
   */
  static async createAdministrador(
    email: string,
    password: string,
    nombre?: string
  ): Promise<{ success: boolean; administrador?: AdministradorDB; error?: string }> {
    try {
      // Verificar si ya existe
      const existente = await this.getAdministradorByEmail(email);
      if (existente) {
        return {
          success: false,
          error: 'Ya existe un administrador con este email'
        };
      }

      // Hash de la contraseña
      const passwordHash = await this.hashPassword(password);

      // Insertar en la base de datos
      const query = `
        INSERT INTO administradores (email, password_hash, nombre, activo)
        VALUES ($1, $2, $3, true)
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        email.toLowerCase(),
        passwordHash,
        nombre || null
      ]);

      return {
        success: true,
        administrador: result.rows[0]
      };
    } catch (error) {
      console.error('Error creando administrador:', error);
      return {
        success: false,
        error: 'Error al crear el administrador'
      };
    }
  }

  /**
   * Crea la tabla de administradores si no existe
   */
  static async createAdminTableIfNotExists(): Promise<void> {
    const client = await pool.connect();
    try {
      console.log('🔧 Verificando tabla de administradores...');
      
      // Crear tabla
      await client.query(`
        CREATE TABLE IF NOT EXISTS administradores (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          nombre VARCHAR(100),
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        );
      `);

      // Crear índices
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_administradores_email ON administradores(email);
        CREATE INDEX IF NOT EXISTS idx_administradores_activo ON administradores(activo);
      `);

      // Verificar si existe la función de trigger
      await client.query(`
        CREATE OR REPLACE FUNCTION actualizar_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Crear trigger
      await client.query(`
        DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_administradores ON administradores;
        CREATE TRIGGER trigger_actualizar_updated_at_administradores
            BEFORE UPDATE ON administradores
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_updated_at();
      `);

      console.log('✅ Tabla de administradores verificada/creada');
    } catch (error) {
      console.error('❌ Error creando tabla de administradores:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Inicializa el administrador por defecto si no existe
   */
  static async initializeDefaultAdmin(): Promise<void> {
    try {
      // Primero crear la tabla si no existe
      await this.createAdminTableIfNotExists();
      
      const defaultEmail = 'AdminEva2026@gmail.com';
      const defaultPassword = 'Admin2026Eva';
      
      const existente = await this.getAdministradorByEmail(defaultEmail);
      
      if (!existente) {
        console.log('🔧 Creando administrador por defecto...');
        const resultado = await this.createAdministrador(
          defaultEmail,
          defaultPassword,
          'Administrador EVA'
        );
        
        if (resultado.success) {
          console.log('✅ Administrador por defecto creado exitosamente');
        } else {
          console.error('❌ Error creando administrador por defecto:', resultado.error);
        }
      } else {
        console.log('✅ Administrador por defecto ya existe');
      }
    } catch (error: any) {
      console.error('❌ Error inicializando administrador por defecto:', error);
      console.error('Detalles:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  static async close(): Promise<void> {
    await pool.end();
  }
}

