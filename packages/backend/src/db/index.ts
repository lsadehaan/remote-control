import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const dbPath = config.database.path;
  const dbDir = dirname(dbPath);

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  logger.info(`Database opened at ${dbPath}`);

  // Run migrations
  runMigrations();
}

function runMigrations(): void {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Container templates table
        CREATE TABLE IF NOT EXISTS container_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          cli_type TEXT NOT NULL,
          docker_image TEXT NOT NULL,
          default_command TEXT NOT NULL DEFAULT '/bin/bash',
          description TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          cli_type TEXT NOT NULL,
          container_id TEXT,
          container_status TEXT,
          volume_path TEXT NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          template_id INTEGER NOT NULL REFERENCES container_templates(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Project environment variables table
        CREATE TABLE IF NOT EXISTS project_env_vars (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          encrypted_value TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(project_id, name)
        );

        -- Credentials table (metadata only, secrets in Vault)
        CREATE TABLE IF NOT EXISTS credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          cli_type TEXT NOT NULL,
          vault_path TEXT NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Credential setup sessions table
        CREATE TABLE IF NOT EXISTS credential_setup_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          cli_type TEXT NOT NULL,
          container_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authenticating', 'completed', 'failed')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_container_status ON projects(container_status);
        CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
        CREATE INDEX IF NOT EXISTS idx_project_env_vars_project_id ON project_env_vars(project_id);
      `,
    },
    {
      name: '002_seed_templates',
      sql: `
        INSERT OR IGNORE INTO container_templates (name, cli_type, docker_image, default_command, description) VALUES
          ('Base Development', 'dev', 'remote-control/base-dev:latest', '/bin/bash', 'Ubuntu with essential tools + AI CLIs (Claude Code, Codex)'),
          ('Node.js Development', 'dev', 'remote-control/nodejs-dev:latest', '/bin/bash', 'Node.js 22, TypeScript, Bun, Deno + AI CLIs'),
          ('Python Development', 'dev', 'remote-control/python-dev:latest', '/bin/bash', 'Python 3.12, poetry, pytest, FastAPI + AI CLIs'),
          ('.NET Development', 'dev', 'remote-control/dotnet-dev:latest', '/bin/bash', '.NET 8.0, C#, F#, PowerShell + AI CLIs'),
          ('C++ Development', 'dev', 'remote-control/cpp-dev:latest', '/bin/bash', 'GCC 13, Clang 18, CMake, vcpkg + AI CLIs'),
          ('Rust Development', 'dev', 'remote-control/rust-dev:latest', '/bin/bash', 'Rust stable, cargo tools, sccache + AI CLIs'),
          ('Go Development', 'dev', 'remote-control/go-dev:latest', '/bin/bash', 'Go 1.23, protobuf, delve + AI CLIs'),
          ('Java Development', 'dev', 'remote-control/java-dev:latest', '/bin/bash', 'Java 21, Gradle, Maven, Kotlin + AI CLIs');
      `,
    },
  ];

  const appliedMigrations = db
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      logger.info(`Running migration: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
      logger.info(`Migration applied: ${migration.name}`);
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
