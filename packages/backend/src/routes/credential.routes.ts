import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import type { Credential } from '@remote-control/shared';
import { CLI_TYPES } from '@remote-control/shared';
import { getDb } from '../db/index.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { vaultService } from '../services/vault.service.js';
import { dockerService } from '../services/docker.service.js';
import { v4 as uuidv4 } from 'uuid';

export const credentialRouter: RouterType = Router();

credentialRouter.use(authenticate);

const createCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  cliType: z.enum(CLI_TYPES),
});

interface DbCredential {
  id: number;
  name: string;
  cli_type: string;
  vault_path: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface DbCredentialSetupSession {
  id: number;
  user_id: number;
  cli_type: string;
  container_id: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// CLI-specific credential paths
const CLI_CREDENTIAL_PATHS: Record<string, string[]> = {
  'claude-code': [
    '~/.config/claude/credentials.json',
    '~/.claude/credentials.json',
  ],
  'codex': [
    '~/.config/codex/auth.json',
    '~/.codex/auth.json',
  ],
};

function mapDbCredential(dbCred: DbCredential): Credential {
  return {
    id: dbCred.id,
    name: dbCred.name,
    cliType: dbCred.cli_type as Credential['cliType'],
    vaultPath: dbCred.vault_path,
    userId: dbCred.user_id,
    createdAt: dbCred.created_at,
    updatedAt: dbCred.updated_at,
  };
}

// List credentials for user
credentialRouter.get('/', (req, res) => {
  const db = getDb();
  const credentials = db
    .prepare('SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.userId) as DbCredential[];

  res.json({
    success: true,
    data: credentials.map(mapDbCredential),
  });
});

// Get credential by ID
credentialRouter.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const credential = db
      .prepare('SELECT * FROM credentials WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbCredential | undefined;

    if (!credential) {
      throw new AppError(404, 'Credential not found');
    }

    res.json({ success: true, data: mapDbCredential(credential) });
  } catch (error) {
    next(error);
  }
});

// Delete credential
credentialRouter.delete('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const credential = db
      .prepare('SELECT * FROM credentials WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user!.userId) as DbCredential | undefined;

    if (!credential) {
      throw new AppError(404, 'Credential not found');
    }

    // Delete from Vault
    try {
      await vaultService.deleteCredential(credential.vault_path);
    } catch (error) {
      logger.warn({ error, credentialId: credential.id }, 'Failed to delete from Vault, continuing');
    }

    db.prepare('DELETE FROM credentials WHERE id = ?').run(req.params.id);

    logger.info({ credentialId: credential.id }, 'Credential deleted');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Start credential setup flow
// Creates a temporary container for CLI authentication
credentialRouter.post('/setup/start', async (req, res, next) => {
  try {
    const data = createCredentialSchema.parse(req.body);
    const db = getDb();
    const userId = req.user!.userId;

    // Clean up any existing setup sessions for this user
    const existingSessions = db
      .prepare('SELECT * FROM credential_setup_sessions WHERE user_id = ? AND status = ?')
      .all(userId, 'pending') as DbCredentialSetupSession[];

    for (const session of existingSessions) {
      try {
        await dockerService.removeContainer(session.container_id);
      } catch {
        // Ignore errors
      }
      db.prepare('DELETE FROM credential_setup_sessions WHERE id = ?').run(session.id);
    }

    // Create temporary container for authentication
    const containerName = `rc-auth-${uuidv4().slice(0, 8)}`;
    const tempVolumePath = `/tmp/rc-auth-${uuidv4()}`;

    // Use base-dev image which has all CLIs
    const containerId = await dockerService.createContainer({
      name: containerName,
      image: 'remote-control/base-dev:latest',
      volumePath: tempVolumePath,
      cmd: ['sleep', 'infinity'], // Keep container alive
    });

    await dockerService.startContainer(containerId);

    // Create setup session record
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const result = db.prepare(`
      INSERT INTO credential_setup_sessions (user_id, cli_type, container_id, status, expires_at)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(userId, data.cliType, containerId, expiresAt);

    const sessionId = result.lastInsertRowid as number;

    logger.info({ sessionId, cliType: data.cliType, containerId }, 'Credential setup session started');

    res.json({
      success: true,
      data: {
        sessionId,
        containerId,
        cliType: data.cliType,
        expiresAt,
        instructions: getAuthInstructions(data.cliType),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get setup session status
credentialRouter.get('/setup/:sessionId/status', async (req, res, next) => {
  try {
    const db = getDb();
    const session = db
      .prepare('SELECT * FROM credential_setup_sessions WHERE id = ? AND user_id = ?')
      .get(req.params.sessionId, req.user!.userId) as DbCredentialSetupSession | undefined;

    if (!session) {
      throw new AppError(404, 'Setup session not found');
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up
      try {
        await dockerService.removeContainer(session.container_id);
      } catch {
        // Ignore
      }
      db.prepare('UPDATE credential_setup_sessions SET status = ? WHERE id = ?')
        .run('failed', session.id);

      throw new AppError(410, 'Setup session expired');
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        cliType: session.cli_type,
        containerId: session.container_id,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Complete credential setup - extract credentials from container
credentialRouter.post('/setup/:sessionId/complete', async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);
    const db = getDb();
    const userId = req.user!.userId;

    const session = db
      .prepare('SELECT * FROM credential_setup_sessions WHERE id = ? AND user_id = ?')
      .get(req.params.sessionId, userId) as DbCredentialSetupSession | undefined;

    if (!session) {
      throw new AppError(404, 'Setup session not found');
    }

    if (session.status !== 'pending' && session.status !== 'authenticating') {
      throw new AppError(400, `Cannot complete session with status: ${session.status}`);
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      throw new AppError(410, 'Setup session expired');
    }

    // Extract credential files from container
    const credentialFiles = await extractCredentialFiles(
      session.container_id,
      session.cli_type
    );

    if (Object.keys(credentialFiles).length === 0) {
      throw new AppError(400, 'No credential files found. Please complete the CLI authentication first.');
    }

    // Create credential record
    const credResult = db.prepare(`
      INSERT INTO credentials (name, cli_type, vault_path, user_id)
      VALUES (?, ?, '', ?)
    `).run(name, session.cli_type, userId);

    const credentialId = credResult.lastInsertRowid as number;

    // Store in Vault
    const vaultPath = await vaultService.storeCredential(userId, credentialId, {
      files: credentialFiles,
    });

    // Update credential with vault path
    db.prepare('UPDATE credentials SET vault_path = ? WHERE id = ?')
      .run(vaultPath, credentialId);

    // Clean up session
    db.prepare('UPDATE credential_setup_sessions SET status = ? WHERE id = ?')
      .run('completed', session.id);

    try {
      await dockerService.removeContainer(session.container_id);
    } catch {
      // Ignore cleanup errors
    }

    const credential = db
      .prepare('SELECT * FROM credentials WHERE id = ?')
      .get(credentialId) as DbCredential;

    logger.info({ credentialId, cliType: session.cli_type }, 'Credential setup completed');

    res.json({
      success: true,
      data: mapDbCredential(credential),
    });
  } catch (error) {
    next(error);
  }
});

// Cancel setup session
credentialRouter.post('/setup/:sessionId/cancel', async (req, res, next) => {
  try {
    const db = getDb();
    const session = db
      .prepare('SELECT * FROM credential_setup_sessions WHERE id = ? AND user_id = ?')
      .get(req.params.sessionId, req.user!.userId) as DbCredentialSetupSession | undefined;

    if (!session) {
      throw new AppError(404, 'Setup session not found');
    }

    // Clean up container
    try {
      await dockerService.removeContainer(session.container_id);
    } catch {
      // Ignore
    }

    db.prepare('UPDATE credential_setup_sessions SET status = ? WHERE id = ?')
      .run('failed', session.id);

    logger.info({ sessionId: session.id }, 'Credential setup cancelled');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Extract credential files from the container
 */
async function extractCredentialFiles(
  containerId: string,
  cliType: string
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const paths = CLI_CREDENTIAL_PATHS[cliType] || [];

  for (const credPath of paths) {
    // Expand ~ to home directory
    const expandedPath = credPath.replace('~', '/root');

    try {
      // Use docker exec to cat the file
      const exec = await dockerService.exec({
        containerId,
        cmd: ['cat', expandedPath],
        tty: false,
        stdin: false,
      });

      // Read the output
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        exec.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        exec.stream.on('end', resolve);
        exec.stream.on('error', reject);
      });

      const content = Buffer.concat(chunks).toString('utf8');
      if (content.trim()) {
        // Store as base64
        files[credPath] = Buffer.from(content).toString('base64');
        logger.debug({ path: credPath }, 'Extracted credential file');
      }
    } catch {
      // File doesn't exist or can't be read, skip
    }
  }

  return files;
}

/**
 * Get authentication instructions for a CLI
 */
function getAuthInstructions(cliType: string): string {
  switch (cliType) {
    case 'claude-code':
      return `
1. In the terminal, run: claude --login
2. You will see a URL - copy it and open in your local browser
3. Complete the authentication in your browser
4. Copy the authorization code back to the terminal
5. Once authenticated, click "Complete Setup" to save your credentials
      `.trim();

    case 'codex':
      return `
1. In the terminal, run: codex auth login
2. Follow the prompts to authenticate
3. Once authenticated, click "Complete Setup" to save your credentials
      `.trim();

    default:
      return 'Follow the CLI authentication prompts in the terminal, then click "Complete Setup".';
  }
}
