import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
  };
}

/**
 * Middleware de autenticación JWT
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticación requerido' });
      return;
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    
    // Verificar el token
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded || decoded.type !== 'admin') {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    // Agregar información del usuario al request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(401).json({ error: 'Error al verificar autenticación' });
  }
};

