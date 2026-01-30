import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_PATH: z.string().default('./data/remote-control.db'),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  VAULT_ADDR: z.string().default('http://127.0.0.1:8200'),
  VAULT_TOKEN: z.string().optional(),
  VOLUMES_PATH: z.string().default('./data/volumes'),
  ENCRYPTION_KEY: z.string().default('dev-encryption-key-32-chars!!!'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  database: {
    path: env.DATABASE_PATH,
  },
  docker: {
    socketPath: env.DOCKER_SOCKET,
  },
  vault: {
    addr: env.VAULT_ADDR,
    token: env.VAULT_TOKEN,
  },
  volumes: {
    path: env.VOLUMES_PATH,
  },
  encryption: {
    key: env.ENCRYPTION_KEY,
  },
} as const;
