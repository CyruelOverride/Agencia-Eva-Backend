import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
const { Pool } = pg;

// Configuración de la base de datos
const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
    };
  } else {
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

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secret-key-muy-segura-cambiar-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
   * Busca un administrador por email
   */
  static async getAdministradorByEmail(email: string): Promise<AdministradorDB | null> {
    const query = 'SELECT * FROM administradores WHERE email = $1 AND activo = true';
    const result = await pool.query(query, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
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
    return jwt.sign(
      { 
        id: administrador.id, 
        email: administrador.email,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
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
        return {
          success: false,
          error: 'Email o contraseña incorrectos'
        };
      }

      const passwordValid = await this.verifyPassword(credentials.password, administrador.password_hash);
      
      if (!passwordValid) {
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

      return {
        success: true,
        token,
        administrador: {
          id: administrador.id,
          email: administrador.email,
          nombre: administrador.nombre || undefined
        }
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'Error al procesar el login'
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
   * Inicializa el administrador por defecto si no existe
   */
  static async initializeDefaultAdmin(): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error inicializando administrador por defecto:', error);
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  static async close(): Promise<void> {
    await pool.end();
  }
}

