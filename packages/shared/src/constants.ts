export const CLI_TYPES = ['claude-code', 'codex-cli'] as const;

export const CONTAINER_STATUS = ['created', 'running', 'paused', 'restarting', 'removing', 'exited', 'dead'] as const;

export const USER_ROLES = ['admin', 'user'] as const;

export const DEFAULT_CONTAINER_LIMITS = {
  memory: 2 * 1024 * 1024 * 1024, // 2GB
  cpuShares: 1024, // Default CPU shares
  cpuQuota: 100000, // 100% of one CPU
  cpuPeriod: 100000,
} as const;

export const WORKSPACE_PATH = '/workspace';

export const CREDENTIAL_PATHS: Record<string, string[]> = {
  'claude-code': [
    '~/.config/claude/',
    '~/.claude/',
  ],
  'codex-cli': [
    '~/.config/codex/',
  ],
};

export const WS_EVENTS = {
  TERMINAL: {
    INPUT: 'terminal:input',
    OUTPUT: 'terminal:output',
    RESIZE: 'terminal:resize',
    ERROR: 'terminal:error',
  },
  FILES: {
    LIST: 'files:list',
    READ: 'files:read',
    WATCH: 'files:watch',
    CHANGE: 'files:change',
    ERROR: 'files:error',
  },
} as const;
