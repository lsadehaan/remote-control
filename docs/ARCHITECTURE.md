# Remote Control - Architecture Documentation

## Overview

Remote Control is a web platform for managing AI coding agents (Claude Code, Codex CLI, etc.) in isolated Docker containers with remote terminal access and file browsing capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Frontend (Lit + Vite)                            │   │
│  │  ┌─────────────┐  ┌─────────────────────┐  ┌───────────────────┐   │   │
│  │  │  Dashboard  │  │  <lit-shell-terminal> │  │ <x-files-browser> │   │   │
│  │  │   (Lit)     │  │   (lit-shell.js)     │  │   (x-files.js)    │   │   │
│  │  └─────────────┘  └──────────┬──────────┘  └─────────┬─────────┘   │   │
│  └──────────────────────────────┼───────────────────────┼─────────────┘   │
│                                 │ WebSocket             │ WebSocket        │
└─────────────────────────────────┼───────────────────────┼─────────────────┘
                                  │                       │
┌─────────────────────────────────┼───────────────────────┼─────────────────┐
│                              Backend Server                               │
│  ┌──────────────────────────────┼───────────────────────┼─────────────┐  │
│  │                         WebSocket Layer                             │  │
│  │  ┌───────────────────────────┴───────────────────────┴───────────┐ │  │
│  │  │                    ws (WebSocket Server)                       │ │  │
│  │  │  ┌─────────────────────┐      ┌─────────────────────────┐    │ │  │
│  │  │  │ Terminal Handler    │      │  XFilesHandler          │    │ │  │
│  │  │  │ (docker exec + PTY) │      │  (x-files.js/server)    │    │ │  │
│  │  │  └──────────┬──────────┘      └───────────┬─────────────┘    │ │  │
│  │  └─────────────┼─────────────────────────────┼──────────────────┘ │  │
│  └────────────────┼─────────────────────────────┼────────────────────┘  │
│                   │                             │                        │
│  ┌────────────────┼─────────────────────────────┼────────────────────┐  │
│  │                │      Service Layer          │                     │  │
│  │  ┌─────────────▼───────────┐  ┌──────────────▼──────────────┐    │  │
│  │  │    Docker Service       │  │     Vault Service           │    │  │
│  │  │    (dockerode)          │  │     (node-vault)            │    │  │
│  │  │  - Container lifecycle  │  │  - Credential storage       │    │  │
│  │  │  - Exec with PTY        │  │  - Secret injection         │    │  │
│  │  │  - Volume management    │  │  - Auth token management    │    │  │
│  │  └─────────────┬───────────┘  └──────────────┬──────────────┘    │  │
│  └────────────────┼─────────────────────────────┼────────────────────┘  │
│                   │                             │                        │
│  ┌────────────────┼─────────────────────────────┼────────────────────┐  │
│  │                │      REST API Layer         │                     │  │
│  │  ┌─────────────▼───────────────────────────────────────────────┐  │  │
│  │  │                    Express.js                                │  │  │
│  │  │  /api/auth/*     - Authentication (JWT)                      │  │  │
│  │  │  /api/projects/* - Project CRUD + container control          │  │  │
│  │  │  /api/templates/* - Container template listing               │  │  │
│  │  │  /api/credentials/* - Credential management                  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      Data Layer                                     │  │
│  │  ┌──────────────────────┐      ┌──────────────────────────────┐   │  │
│  │  │   SQLite Database    │      │    Project Volumes           │   │  │
│  │  │   (better-sqlite3)   │      │    (./data/volumes/{uuid})   │   │  │
│  │  │  - Users             │      │  - Workspace files           │   │  │
│  │  │  - Projects          │      │  - Mounted to /workspace     │   │  │
│  │  │  - Templates         │      │    in containers             │   │  │
│  │  │  - Credentials (ref) │      └──────────────────────────────┘   │  │
│  │  └──────────────────────┘                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────────────┐
│                          Docker Environment                               │
│  ┌────────────────────────────────┼────────────────────────────────────┐ │
│  │                    Docker Socket (/var/run/docker.sock)              │ │
│  └────────────────────────────────┼────────────────────────────────────┘ │
│                                   │                                       │
│  ┌────────────────────────────────▼────────────────────────────────────┐ │
│  │                    Project Containers                                │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │  rc-project-{id}                                              │   │ │
│  │  │  ┌──────────────────────────────────────────────────────┐    │   │ │
│  │  │  │  Development Environment (e.g., nodejs-dev)           │    │   │ │
│  │  │  │  - Full Linux (Ubuntu 24.04)                          │    │   │ │
│  │  │  │  - Language toolchain (Node, Python, Rust, etc.)      │    │   │ │
│  │  │  │  - AI CLIs: claude, codex                             │    │   │ │
│  │  │  │  - Volume: /workspace → host ./data/volumes/{uuid}    │    │   │ │
│  │  │  └──────────────────────────────────────────────────────┘    │   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    HashiCorp Vault Container                         │ │
│  │  - Stores CLI authentication tokens                                  │ │
│  │  - Provides secrets to containers at startup                         │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Components

| Component | Library | Purpose |
|-----------|---------|---------|
| App Shell | Lit | Main application layout, routing, auth state |
| Dashboard | Lit | Project list, create/delete projects |
| Project View | Lit | Tabs for terminal, files, logs |
| Terminal | lit-shell.js | WebSocket terminal with xterm.js |
| File Browser | x-files.js | WebSocket file browser with upload/download |
| Login/Register | Lit | JWT authentication forms |

### Backend Services

| Service | Library | Responsibility |
|---------|---------|----------------|
| Docker Service | dockerode | Container CRUD, exec, logs, volume management |
| Terminal Handler | ws + dockerode | Bridge WebSocket to docker exec with PTY |
| File Handler | x-files.js | Secure file browsing within project volumes |
| Vault Service | node-vault | Store/retrieve CLI credentials |
| Auth Middleware | jsonwebtoken | JWT validation, user context |

### Data Models

```
┌─────────────────┐     ┌─────────────────────┐
│     users       │     │  container_templates │
├─────────────────┤     ├─────────────────────┤
│ id (PK)         │     │ id (PK)             │
│ email           │     │ name                │
│ username        │     │ cli_type            │
│ password_hash   │     │ docker_image        │
│ role            │     │ default_command     │
│ created_at      │     │ description         │
│ updated_at      │     └─────────────────────┘
└────────┬────────┘              │
         │                       │
         │ 1:N                   │ 1:N
         ▼                       ▼
┌─────────────────────────────────────────┐
│              projects                    │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ name                                    │
│ description                             │
│ cli_type                                │
│ container_id                            │
│ container_status                        │
│ volume_path                             │
│ user_id (FK → users)                    │
│ template_id (FK → container_templates)  │
│ created_at                              │
│ updated_at                              │
└────────┬────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐
│   project_env_vars      │
├─────────────────────────┤
│ id (PK)                 │
│ project_id (FK)         │
│ name                    │
│ encrypted_value         │
│ created_at              │
│ updated_at              │
└─────────────────────────┘

┌─────────────────┐
│   credentials   │
├─────────────────┤
│ id (PK)         │
│ name            │
│ cli_type        │
│ vault_path      │  ──► Points to secret in Vault
│ user_id (FK)    │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

## Communication Protocols

### REST API

All REST endpoints use JSON. Authentication via `Authorization: Bearer <jwt>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create user account |
| POST | /api/auth/login | Get JWT token |
| GET | /api/auth/me | Get current user |
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project details |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project + container |
| POST | /api/projects/:id/start | Start container |
| POST | /api/projects/:id/stop | Stop container |
| POST | /api/projects/:id/restart | Restart container |
| GET | /api/projects/:id/logs | Get container logs |
| GET | /api/templates | List available templates |
| GET | /api/credentials | List user's credentials |
| POST | /api/credentials/setup/start | Start CLI auth flow |

### WebSocket Endpoints

#### Terminal WebSocket (`/ws/terminal`)

Connection: `ws://host/ws/terminal?projectId={id}&token={jwt}`

Uses lit-shell.js protocol internally. The server bridges WebSocket messages to `docker exec` with PTY support.

**Client → Server:**
- Spawn session
- Send input data
- Resize terminal (cols, rows)
- Kill session

**Server → Client:**
- Terminal output
- Session spawned confirmation
- Session exit notification
- Error messages

#### Files WebSocket (`/ws/files`)

Connection: `ws://host/ws/files?projectId={id}&token={jwt}`

Uses x-files.js protocol. Server restricts access to project's volume path.

**Operations:**
- List directory contents
- Read file (text/binary)
- Write file (with write permission)
- Upload binary files
- Download files

## Security Model

### Authentication
- JWT tokens with configurable expiration (default: 7 days)
- Passwords hashed with bcrypt (12 rounds)
- First registered user becomes admin

### Authorization
- Users can only access their own projects
- WebSocket connections validate JWT on upgrade
- Project ownership checked on all operations

### Container Isolation
- Each project runs in its own container
- Containers have resource limits (CPU, memory)
- No privileged mode
- `no-new-privileges` security option
- Volume mounts restricted to project directory

### File System Security
- x-files.js `allowedPaths` restricts to project volume
- Path traversal protection via canonicalization
- Optional read-only mode per project

### Credential Security
- CLI tokens stored in HashiCorp Vault
- Never stored in SQLite database
- Injected as environment variables at container start
- Credential setup uses temporary isolated containers

## Deployment Architecture

### Development
```
Host Machine
├── Backend (tsx watch, port 3000)
├── Frontend (vite dev, port 5173 → proxy to 3000)
├── SQLite (./data/remote-control.db)
├── Volumes (./data/volumes/*)
└── Docker Desktop
    ├── Project containers
    └── Vault container (optional)
```

### Production
```
Host Server (behind Tailscale VPN)
├── Docker Compose
│   ├── Backend container (port 3000)
│   ├── Vault container (port 8200)
│   └── Project containers (dynamic)
├── Reverse Proxy (nginx/caddy)
│   └── TLS termination
├── SQLite (./data/remote-control.db)
└── Volumes (./data/volumes/*)
```

## Key Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| lit-shell.js | latest | Terminal WebSocket server + UI component |
| x-files.js | latest | File browser WebSocket server + UI component |
| dockerode | ^4.0.4 | Docker API client |
| node-vault | ^0.10.2 | HashiCorp Vault client |
| better-sqlite3 | ^11.7.0 | SQLite database |
| express | ^4.21.0 | REST API server |
| ws | ^8.18.0 | WebSocket server |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| zod | ^3.24.0 | Request validation |
| lit | ^3.2.0 | Web components |
| @vaadin/router | ^2.0.0 | Client-side routing |
