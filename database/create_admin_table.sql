-- ============================================================
-- Script SQL para crear tabla de Administradores
-- Sistema de Gestión de Lugares - Bot Agencia EVA
-- ============================================================

-- Crear tabla de administradores
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

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_administradores_email ON administradores(email);
CREATE INDEX IF NOT EXISTS idx_administradores_activo ON administradores(activo);

-- Verificar si existe la función de trigger (puede que ya exista de otras tablas)
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_administradores ON administradores;
CREATE TRIGGER trigger_actualizar_updated_at_administradores
    BEFORE UPDATE ON administradores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================
-- IMPORTANTE: El hash de la contraseña debe generarse con bcrypt
-- ============================================================
-- Para crear el administrador por defecto, ejecutar:
--   npm run init:admin
-- O directamente:
--   node database/init_admin.js
--
-- Credenciales por defecto:
--   Email: AdminEva2026@gmail.com
--   Password: Admin2026Eva
-- ============================================================

