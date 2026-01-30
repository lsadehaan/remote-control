import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, AuthResponse, JwtPayload } from '@remote-control/shared';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter: RouterType = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

interface DbUser {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

function mapDbUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    role: dbUser.role,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = registerSchema.parse(req.body);
    const db = getDb();

    // Check if user exists
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .get(email, username);

    if (existing) {
      throw new AppError(409, 'User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Determine role (first user is admin)
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const role = userCount.count === 0 ? 'admin' : 'user';

    // Create user
    const result = db
      .prepare(
        'INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)'
      )
      .run(email, username, passwordHash, role);

    const dbUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as DbUser;

    const user = mapDbUser(dbUser);
    const token = generateToken(user);

    const response: AuthResponse = { token, user };
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const db = getDb();

    const dbUser = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as DbUser | undefined;

    if (!dbUser) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, dbUser.password_hash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const user = mapDbUser(dbUser);
    const token = generateToken(user);

    const response: AuthResponse = { token, user };
    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const dbUser = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.user!.userId) as DbUser | undefined;

  if (!dbUser) {
    throw new AppError(404, 'User not found');
  }

  const user = mapDbUser(dbUser);
  res.json({ success: true, data: user });
});
