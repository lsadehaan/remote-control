# Remote Control - Project Documentation

## Project Overview

**Remote Control** is a self-hosted web platform for managing AI coding agents in isolated Docker containers. It provides a unified interface to create development environments, access them via web-based terminals, browse files, and manage CLI credentials securely.

### Problem Statement

Running AI coding assistants (Claude Code, Codex CLI, etc.) requires:
- Setting up development environments with proper toolchains
- Managing authentication tokens securely
- Isolating projects from each other
- Accessing terminals remotely

This project solves these problems by providing containerized, isolated development environments accessible through a web interface.

### Target Users

- **Developers** who want to run AI coding assistants in controlled environments
- **Teams** who need to share access to AI-assisted development
- **Self-hosters** who want to keep their code and credentials on their own infrastructure

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 22+ | Runtime |
| Express.js | REST API framework |
| TypeScript | Type safety |
| SQLite (better-sqlite3) | Metadata storage |
| ws | WebSocket server |
| dockerode | Docker API client |
| node-vault | HashiCorp Vault client |
| lit-shell.js | Terminal WebSocket handler |
| x-files.js | File browser WebSocket handler |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| zod | Request validation |
| pino | Logging |

### Frontend
| Technology | Purpose |
|------------|---------|
| Lit 3.x | Web components framework |
| Vite | Build tool & dev server |
| TypeScript | Type safety |
| lit-shell.js | Terminal UI component |
| x-files.js | File browser UI component |
| @vaadin/router | Client-side routing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Container runtime |
| HashiCorp Vault | Secret management |
| Tailscale (recommended) | VPN access |

## Project Structure

```
remote-control/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # System architecture
│   ├── PROJECT.md                 # This file
│   └── USER_STORIES.md            # Features & user stories
│
├── packages/
│   ├── shared/                    # Shared code
│   │   ├── src/
│   │   │   ├── types/             # TypeScript interfaces
│   │   │   │   └── index.ts       # All shared types
│   │   │   ├── constants.ts       # Shared constants
│   │   │   └── index.ts           # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                   # Express API server
│   │   ├── src/
│   │   │   ├── routes/            # REST API routes
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── project.routes.ts
│   │   │   │   ├── template.routes.ts
│   │   │   │   └── credential.routes.ts
│   │   │   ├── services/          # Business logic
│   │   │   │   ├── docker.service.ts
│   │   │   │   ├── vault.service.ts
│   │   │   │   └── terminal-bridge.service.ts
│   │   │   ├── websocket/         # WebSocket handlers
│   │   │   │   └── index.ts
│   │   │   ├── middleware/        # Express middleware
│   │   │   │   ├── auth.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── request-logger.ts
│   │   │   ├── db/                # Database
│   │   │   │   └── index.ts       # SQLite + migrations
│   │   │   ├── utils/
│   │   │   │   └── logger.ts
│   │   │   ├── app.ts             # Express app setup
│   │   │   ├── config.ts          # Configuration
│   │   │   └── index.ts           # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                  # Lit web application
│       ├── src/
│       │   ├── components/        # Web components
│       │   │   ├── pages/         # Page components
│       │   │   │   ├── login-page.ts
│       │   │   │   ├── dashboard-page.ts
│       │   │   │   └── project-page.ts
│       │   │   └── app-shell.ts   # Main app component
│       │   ├── services/          # Client-side services
│       │   │   ├── api.service.ts
│       │   │   └── auth.service.ts
│       │   ├── styles/
│       │   │   └── global.css
│       │   └── main.ts            # Entry point
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── container-templates/           # Docker image definitions
│   ├── base-dev/                  # Base Ubuntu + tools
│   ├── nodejs-dev/                # Node.js environment
│   ├── python-dev/                # Python environment
│   ├── dotnet-dev/                # .NET environment
│   ├── cpp-dev/                   # C++ environment
│   ├── rust-dev/                  # Rust environment
│   ├── go-dev/                    # Go environment
│   ├── java-dev/                  # Java environment
│   └── build-images.sh            # Build script
│
├── data/                          # Runtime data (gitignored)
│   ├── remote-control.db          # SQLite database
│   └── volumes/                   # Project volumes
│       └── {uuid}/                # Per-project workspace
│
├── docker-compose.yml             # Production deployment
├── Dockerfile.backend             # Backend container build
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # pnpm workspace definition
├── tsconfig.base.json             # Shared TypeScript config
├── .env.example                   # Environment template
├── .gitignore
└── README.md
```

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker Desktop
- Git

### Installation

```bash
# Clone repository
git clone <repo-url>
cd remote-control

# Install dependencies
pnpm install

# Build shared package
pnpm --filter @remote-control/shared build

# Copy environment template
cp .env.example .env
```

### Build Container Images

```bash
cd container-templates
chmod +x build-images.sh
./build-images.sh
```

### Start Development Servers

```bash
# Start both backend and frontend
pnpm dev

# Or start separately:
pnpm dev:backend    # http://localhost:3000
pnpm dev:frontend   # http://localhost:5173
```

### First Run

1. Open http://localhost:5173
2. Register an account (first user becomes admin)
3. Create a project, select a development environment
4. Start the container
5. Access the terminal and run `claude` or `codex`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Backend server port |
| `JWT_SECRET` | (required) | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | 7d | Token expiration |
| `DATABASE_PATH` | ./data/remote-control.db | SQLite file path |
| `VOLUMES_PATH` | ./data/volumes | Project volumes directory |
| `DOCKER_SOCKET` | /var/run/docker.sock | Docker socket path |
| `VAULT_ADDR` | http://127.0.0.1:8200 | Vault server address |
| `VAULT_TOKEN` | (optional) | Vault authentication token |
| `ENCRYPTION_KEY` | (required) | Key for encrypting env vars |

### Container Templates

Templates are defined in `container_templates` database table. Each template specifies:

- `name`: Display name
- `cli_type`: Category (currently always 'dev')
- `docker_image`: Docker image tag
- `default_command`: Container entrypoint (usually `/bin/bash`)
- `description`: Template description

## API Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed API endpoints.

### Quick Reference

```bash
# Authentication
POST /api/auth/register   # Create account
POST /api/auth/login      # Get JWT token
GET  /api/auth/me         # Get current user

# Projects
GET    /api/projects           # List projects
POST   /api/projects           # Create project
GET    /api/projects/:id       # Get project
PATCH  /api/projects/:id       # Update project
DELETE /api/projects/:id       # Delete project
POST   /api/projects/:id/start # Start container
POST   /api/projects/:id/stop  # Stop container
GET    /api/projects/:id/logs  # Get logs

# Templates
GET /api/templates        # List available templates

# Credentials
GET  /api/credentials     # List credentials
POST /api/credentials/setup/start  # Start auth flow
```

### WebSocket Endpoints

```
ws://host/ws/terminal?projectId={id}&token={jwt}
ws://host/ws/files?projectId={id}&token={jwt}
```

## Testing

```bash
# Type checking
pnpm typecheck

# Build all packages
pnpm build
```

## Deployment

### Docker Compose (Recommended)

```bash
# Set environment variables
export JWT_SECRET=your-secure-secret
export ENCRYPTION_KEY=your-32-character-key-here

# Build and start
docker-compose up -d
```

### Manual Deployment

1. Build packages:
   ```bash
   pnpm build
   ```

2. Build container images:
   ```bash
   cd container-templates && ./build-images.sh
   ```

3. Start backend:
   ```bash
   node packages/backend/dist/index.js
   ```

4. Serve frontend static files from `packages/frontend/dist/`

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Ensure `pnpm typecheck` passes
4. Submit PR with description

## License

MIT License - see LICENSE file
