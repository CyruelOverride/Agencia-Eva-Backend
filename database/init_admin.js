/**
 * Script para inicializar la tabla de administradores
 * Ejecutar con: npm run init:admin
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
    };
  } else {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bot_agencia',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };
  }
};

const pool = new Pool(getPoolConfig());

async function initAdminTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tabla de administradores...');
    
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

    console.log('✅ Tabla de administradores creada');

    // Crear administrador por defecto
    const defaultEmail = 'AdminEva2026@gmail.com';
    const defaultPassword = 'Admin2026Eva';
    
    // Verificar si ya existe
    const checkResult = await client.query(
      'SELECT id FROM administradores WHERE email = $1',
      [defaultEmail.toLowerCase()]
    );

    if (checkResult.rows.length === 0) {
      console.log('🔧 Creando administrador por defecto...');
      
      // Generar hash de la contraseña
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
      
      // Insertar administrador
      await client.query(
        `INSERT INTO administradores (email, password_hash, nombre, activo)
         VALUES ($1, $2, $3, true)`,
        [defaultEmail.toLowerCase(), passwordHash, 'Administrador EVA']
      );
      
      console.log('✅ Administrador por defecto creado');
      console.log(`   Email: ${defaultEmail}`);
      console.log(`   Password: ${defaultPassword}`);
    } else {
      console.log('✅ Administrador por defecto ya existe');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initAdminTable()
  .then(() => {
    console.log('✅ Inicialización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en inicialización:', error);
    process.exit(1);
  });

