# Remote Control - AI Agent Manager

A web platform to manage coding AI agents (Claude Code, Codex CLI, etc.) in isolated Docker containers with remote terminal access and file viewing capabilities.

## Features

- **Project Management**: Create and manage development projects with isolated Docker containers
- **Remote Terminal**: Interactive terminal access to containers via WebSocket
- **File Browser**: Browse and view files in project volumes
- **Multiple Development Environments**:
  - Claude Code (polyglot with Node.js, Python, Rust, Go)
  - Codex CLI (polyglot with Node.js, Python, Rust, Go)
  - Node.js/TypeScript (npm, pnpm, Bun, Deno)
  - Python 3.12 (poetry, pytest, Django, FastAPI)
  - .NET 8.0 (C#, F#, Entity Framework)
  - C++ (GCC, Clang, CMake, vcpkg, Boost)
  - Rust (cargo, clippy, rustfmt)
  - Go 1.23 (with protobuf support)
  - Java 21 (Gradle, Maven, Kotlin, Scala)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker
- Docker Compose (optional)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Container Images

```bash
cd container-templates
chmod +x build-images.sh
./build-images.sh
```

This builds all development environment images:
- `remote-control/base-dev` - Base Ubuntu with common tools
- `remote-control/nodejs-dev` - Node.js development
- `remote-control/python-dev` - Python development
- `remote-control/dotnet-dev` - .NET development
- `remote-control/cpp-dev` - C++ development
- `remote-control/rust-dev` - Rust development
- `remote-control/go-dev` - Go development
- `remote-control/java-dev` - Java development
- `remote-control/claude-code` - Claude Code with polyglot support
- `remote-control/codex-cli` - Codex CLI with polyglot support

### 3. Start Development Servers

```bash
# Start both backend and frontend
pnpm dev

# Or start separately
pnpm dev:backend  # http://localhost:3000
pnpm dev:frontend # http://localhost:5173
```

### 4. Create Your First User

1. Open http://localhost:5173
2. Click "Register" and create an account (first user becomes admin)
3. Create a new project and select a development environment
4. Start the container and access the terminal

## Project Structure

```
remote-control/
├── packages/
│   ├── shared/          # Shared types and constants
│   ├── backend/         # Express API server
│   │   └── src/
│   │       ├── routes/      # REST endpoints
│   │       ├── services/    # Docker, Vault, Terminal Bridge
│   │       └── websocket/   # WebSocket handlers
│   └── frontend/        # Lit web application
│       └── src/
│           ├── components/  # Web components
│           └── services/    # API client
├── container-templates/ # Docker images
│   ├── base-dev/
│   ├── nodejs-dev/
│   ├── python-dev/
│   ├── dotnet-dev/
│   ├── cpp-dev/
│   ├── rust-dev/
│   ├── go-dev/
│   ├── java-dev/
│   ├── claude-code/
│   └── codex-cli/
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/start | Start container |
| POST | /api/projects/:id/stop | Stop container |
| POST | /api/projects/:id/restart | Restart container |
| GET | /api/projects/:id/logs | Get container logs |
| GET | /api/templates | List container templates |
| WS | /ws/terminal | Terminal WebSocket |
| WS | /ws/files | File browser WebSocket |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend server port |
| NODE_ENV | development | Environment |
| JWT_SECRET | dev-secret... | JWT signing secret |
| DATABASE_PATH | ./data/remote-control.db | SQLite database path |
| VOLUMES_PATH | ./data/volumes | Container volumes path |
| VAULT_ADDR | http://127.0.0.1:8200 | HashiCorp Vault address |
| VAULT_TOKEN | | Vault token (optional) |

## Production Deployment

### Using Docker Compose

```bash
# Set environment variables
export JWT_SECRET=your-secure-secret
export ENCRYPTION_KEY=your-32-character-key-here

# Start services
docker-compose up -d
```

### Manual Deployment

1. Build the backend:
```bash
pnpm --filter @remote-control/shared build
pnpm --filter @remote-control/backend build
```

2. Build the frontend:
```bash
pnpm --filter @remote-control/frontend build
```

3. Serve the frontend static files and run the backend.

## Security Notes

- Initial access is designed for Tailscale VPN
- JWT tokens expire after 7 days by default
- Container volumes are isolated per project
- File browser prevents path traversal attacks
- Containers run with:
  - Memory limit (2GB default)
  - CPU limits
  - No privileged mode
  - `no-new-privileges` security option

## Development

```bash
# Type checking
pnpm typecheck

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

## License

MIT
