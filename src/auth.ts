import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'HolaMundoVerde2025SecureJWTKey!@#123';

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, secret, err => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    next();
  });
}
