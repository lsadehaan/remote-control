import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import type { Project } from '@remote-control/shared';
import { CLI_TYPES } from '@remote-control/shared';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { dockerService } from '../services/docker.service.js';
import { vaultService } from '../services/vault.service.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export const projectRouter: RouterType = Router();

// All routes require authentication
projectRouter.use(authenticate);

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cliType: z.enum(CLI_TYPES),
  templateId: z.number().int().positive(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

interface DbProject {
  id: number;
  name: string;
  description: string | null;
  cli_type: string;
  container_id: string | null;
  container_status: string | null;
  volume_path: string;
  user_id: number;
  template_id: number;
  created_at: string;
  updated_at: string;
}

function mapDbProject(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    cliType: dbProject.cli_type as Project['cliType'],
    containerId: dbProject.container_id,
    containerStatus: dbProject.container_status as Project['containerStatus'],
    volumePath: dbProject.volume_path,
    userId: dbProject.user_id,
    templateId: dbProject.template_id,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  };
}

// List all projects for current user
projectRouter.get('/', (req, res) => {
  const db = getDb();
  const projects = db
    .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.user!.userId) as DbProject[];

  res.json({
    success: true,
    data: projects.map(mapDbProject),
  });
});

// Get single project
projectRouter.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    res.json({ success: true, data: mapDbProject(project) });
  } catch (error) {
    next(error);
  }
});

// Create project
projectRouter.post('/', async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const db = getDb();

    // Verify template exists
    const template = db
      .prepare('SELECT * FROM container_templates WHERE id = ?')
      .get(data.templateId);

    if (!template) {
      throw new AppError(400, 'Invalid template');
    }

    // Create volume directory
    const volumeId = uuidv4();
    const volumePath = join(config.volumes.path, volumeId);

    if (!existsSync(volumePath)) {
      mkdirSync(volumePath, { recursive: true });
    }

    // Create project record
    const result = db
      .prepare(`
        INSERT INTO projects (name, description, cli_type, volume_path, user_id, template_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.name,
        data.description || null,
        data.cliType,
        volumePath,
        req.user!.userId,
        data.templateId
      );

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(result.lastInsertRowid) as DbProject;

    logger.info({ projectId: project.id }, 'Project created');
    res.status(201).json({ success: true, data: mapDbProject(project) });
  } catch (error) {
    next(error);
  }
});

// Update project
projectRouter.patch('/:id', (req, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    const db = getDb();

    const existing = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!existing) {
      throw new AppError(404, 'Project not found');
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(Number(req.params.id));

      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(
        ...values
      );
    }

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(req.params.id) as DbProject;

    res.json({ success: true, data: mapDbProject(project) });
  } catch (error) {
    next(error);
  }
});

// Delete project
projectRouter.delete('/:id', async (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    // Stop and remove container if exists
    if (project.container_id) {
      try {
        await dockerService.stopContainer(project.container_id);
        await dockerService.removeContainer(project.container_id);
      } catch (error) {
        logger.warn({ error, containerId: project.container_id }, 'Failed to remove container');
      }
    }

    // Delete project record (volume kept for now, can add cleanup later)
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

    logger.info({ projectId: project.id }, 'Project deleted');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Start container
projectRouter.post('/:id/start', async (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const template = db
      .prepare('SELECT * FROM container_templates WHERE id = ?')
      .get(project.template_id) as { docker_image: string; default_command: string };

    let containerId = project.container_id;

    if (!containerId) {
      // Create new container
      containerId = await dockerService.createContainer({
        name: `rc-project-${project.id}`,
        image: template.docker_image,
        volumePath: project.volume_path,
        workDir: '/workspace',
      });

      db.prepare('UPDATE projects SET container_id = ? WHERE id = ?').run(
        containerId,
        project.id
      );
    }

    await dockerService.startContainer(containerId);

    // Inject credentials from Vault if user has any
    try {
      const credentials = db
        .prepare('SELECT * FROM credentials WHERE user_id = ?')
        .all(req.user!.userId) as Array<{ vault_path: string }>;

      for (const cred of credentials) {
        if (cred.vault_path) {
          const credData = await vaultService.getCredential(cred.vault_path);
          if (credData?.files) {
            await dockerService.injectCredentials(containerId, credData.files);
          }
        }
      }
    } catch (error) {
      logger.warn({ error, projectId: project.id }, 'Failed to inject credentials, continuing');
    }

    // Inject project environment variables
    try {
      const envVars = getProjectEnvVars(project.id);
      if (Object.keys(envVars).length > 0) {
        await dockerService.injectEnvVars(containerId, envVars);
      }
    } catch (error) {
      logger.warn({ error, projectId: project.id }, 'Failed to inject env vars, continuing');
    }

    // Update status
    const status = await dockerService.getContainerStatus(containerId);
    db.prepare("UPDATE projects SET container_status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      project.id
    );

    const updated = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(project.id) as DbProject;

    logger.info({ projectId: project.id }, 'Project started');
    res.json({ success: true, data: mapDbProject(updated) });
  } catch (error) {
    next(error);
  }
});

// Stop container
projectRouter.post('/:id/stop', async (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (!project.container_id) {
      throw new AppError(400, 'No container to stop');
    }

    await dockerService.stopContainer(project.container_id);

    const status = await dockerService.getContainerStatus(project.container_id);
    db.prepare("UPDATE projects SET container_status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      project.id
    );

    const updated = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(project.id) as DbProject;

    logger.info({ projectId: project.id }, 'Project stopped');
    res.json({ success: true, data: mapDbProject(updated) });
  } catch (error) {
    next(error);
  }
});

// Restart container
projectRouter.post('/:id/restart', async (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (!project.container_id) {
      throw new AppError(400, 'No container to restart');
    }

    await dockerService.restartContainer(project.container_id);

    const status = await dockerService.getContainerStatus(project.container_id);
    db.prepare("UPDATE projects SET container_status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      project.id
    );

    const updated = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(project.id) as DbProject;

    logger.info({ projectId: project.id }, 'Project restarted');
    res.json({ success: true, data: mapDbProject(updated) });
  } catch (error) {
    next(error);
  }
});

// Get container logs
projectRouter.get('/:id/logs', async (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    if (!project.container_id) {
      throw new AppError(400, 'No container');
    }

    const tail = req.query.tail ? Number(req.query.tail) : 100;
    const logs = await dockerService.getContainerLogs(project.container_id, { tail });

    res.json({ success: true, data: { logs } });
  } catch (error) {
    next(error);
  }
});

// ============ Environment Variables ============

interface DbEnvVar {
  id: number;
  project_id: number;
  name: string;
  encrypted_value: string;
  created_at: string;
  updated_at: string;
}

const envVarSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/, 'Must be uppercase with underscores'),
  value: z.string().max(10000),
});

// List env vars for a project
projectRouter.get('/:id/env', (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const envVars = db
      .prepare('SELECT id, name, created_at, updated_at FROM project_env_vars WHERE project_id = ? ORDER BY name')
      .all(project.id) as Array<{ id: number; name: string; created_at: string; updated_at: string }>;

    res.json({ success: true, data: envVars });
  } catch (error) {
    next(error);
  }
});

// Add/update env var
projectRouter.put('/:id/env/:name', (req, res, next) => {
  try {
    const data = envVarSchema.parse({ name: req.params.name, value: req.body.value });
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const encryptedValue = encrypt(data.value);

    // Upsert
    db.prepare(`
      INSERT INTO project_env_vars (project_id, name, encrypted_value)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id, name) DO UPDATE SET
        encrypted_value = excluded.encrypted_value,
        updated_at = datetime('now')
    `).run(project.id, data.name, encryptedValue);

    const envVar = db
      .prepare('SELECT id, name, created_at, updated_at FROM project_env_vars WHERE project_id = ? AND name = ?')
      .get(project.id, data.name) as { id: number; name: string; created_at: string; updated_at: string };

    logger.info({ projectId: project.id, envVarName: data.name }, 'Environment variable set');
    res.json({ success: true, data: envVar });
  } catch (error) {
    next(error);
  }
});

// Delete env var
projectRouter.delete('/:id/env/:name', (req, res, next) => {
  try {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbProject | undefined;

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const result = db
      .prepare('DELETE FROM project_env_vars WHERE project_id = ? AND name = ?')
      .run(project.id, req.params.name);

    if (result.changes === 0) {
      throw new AppError(404, 'Environment variable not found');
    }

    logger.info({ projectId: project.id, envVarName: req.params.name }, 'Environment variable deleted');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get decrypted env vars (internal use for container start)
export function getProjectEnvVars(projectId: number): Record<string, string> {
  const db = getDb();
  const envVars = db
    .prepare('SELECT name, encrypted_value FROM project_env_vars WHERE project_id = ?')
    .all(projectId) as DbEnvVar[];

  const result: Record<string, string> = {};
  for (const ev of envVars) {
    try {
      result[ev.name] = decrypt(ev.encrypted_value);
    } catch {
      logger.warn({ projectId, envVarName: ev.name }, 'Failed to decrypt env var');
    }
  }
  return result;
}
