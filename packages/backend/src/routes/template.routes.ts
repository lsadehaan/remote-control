import { Router, type Router as RouterType } from 'express';
import type { ContainerTemplate } from '@remote-control/shared';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

export const templateRouter: RouterType = Router();

interface DbTemplate {
  id: number;
  name: string;
  cli_type: string;
  docker_image: string;
  default_command: string;
  description: string | null;
  created_at: string;
}

function mapDbTemplate(dbTemplate: DbTemplate): ContainerTemplate {
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    cliType: dbTemplate.cli_type as ContainerTemplate['cliType'],
    dockerImage: dbTemplate.docker_image,
    defaultCommand: dbTemplate.default_command,
    description: dbTemplate.description,
    createdAt: dbTemplate.created_at,
  };
}

templateRouter.get('/', authenticate, (_req, res) => {
  const db = getDb();
  const templates = db
    .prepare('SELECT * FROM container_templates ORDER BY name')
    .all() as DbTemplate[];

  res.json({
    success: true,
    data: templates.map(mapDbTemplate),
  });
});

templateRouter.get('/:id', authenticate, (req, res, next) => {
  try {
    const db = getDb();
    const template = db
      .prepare('SELECT * FROM container_templates WHERE id = ?')
      .get(req.params.id) as DbTemplate | undefined;

    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    res.json({ success: true, data: mapDbTemplate(template) });
  } catch (error) {
    next(error);
  }
});
