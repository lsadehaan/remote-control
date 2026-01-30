# Remote Control - Features & User Stories

## Epic 1: User Authentication

### US-1.1: User Registration
**As a** new user
**I want to** create an account
**So that** I can access the platform

**Acceptance Criteria:**
- [ ] Registration form with email, username, password fields
- [ ] Email must be valid format
- [ ] Username must be 3-50 characters
- [ ] Password must be minimum 8 characters
- [ ] First registered user automatically becomes admin
- [ ] Duplicate email/username rejected with clear error
- [ ] Successful registration redirects to dashboard
- [ ] JWT token stored in localStorage

**API:** `POST /api/auth/register`

---

### US-1.2: User Login
**As a** registered user
**I want to** log into my account
**So that** I can access my projects

**Acceptance Criteria:**
- [ ] Login form with email and password
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to dashboard
- [ ] JWT token stored in localStorage
- [ ] "Remember me" option (stretch)

**API:** `POST /api/auth/login`

---

### US-1.3: Session Persistence
**As a** logged-in user
**I want to** stay logged in when I refresh the page
**So that** I don't have to log in repeatedly

**Acceptance Criteria:**
- [ ] JWT token persisted in localStorage
- [ ] App checks token validity on load
- [ ] Expired tokens redirect to login
- [ ] Invalid tokens cleared and redirect to login

**API:** `GET /api/auth/me`

---

### US-1.4: Logout
**As a** logged-in user
**I want to** log out
**So that** I can secure my session

**Acceptance Criteria:**
- [ ] Logout button in header
- [ ] Token removed from localStorage
- [ ] Redirects to login page
- [ ] WebSocket connections closed

---

## Epic 2: Project Management

### US-2.1: View Projects
**As a** user
**I want to** see a list of my projects
**So that** I can manage them

**Acceptance Criteria:**
- [ ] Dashboard shows all user's projects
- [ ] Each project card shows: name, template type, status
- [ ] Status indicator: running (green), stopped (red), not created (gray)
- [ ] Projects sorted by last updated
- [ ] Empty state with "Create your first project" prompt

**API:** `GET /api/projects`

---

### US-2.2: Create Project
**As a** user
**I want to** create a new project
**So that** I can start working with an AI assistant

**Acceptance Criteria:**
- [ ] "New Project" button on dashboard
- [ ] Modal with: name (required), description (optional), template (dropdown)
- [ ] Template dropdown shows all available environments
- [ ] Clear description of what each template includes
- [ ] Creating project shows loading state
- [ ] Success redirects to project view
- [ ] Volume directory created on disk

**API:** `POST /api/projects`

---

### US-2.3: View Project Details
**As a** user
**I want to** view a project's details
**So that** I can see its status and access its features

**Acceptance Criteria:**
- [ ] Project page shows name, description, template
- [ ] Container status displayed prominently
- [ ] Tabs for: Terminal, Files, Logs
- [ ] Back button to dashboard

**API:** `GET /api/projects/:id`

---

### US-2.4: Update Project
**As a** user
**I want to** update my project's name and description
**So that** I can keep it organized

**Acceptance Criteria:**
- [ ] Edit button on project page
- [ ] Inline editing or modal for name/description
- [ ] Save and cancel buttons
- [ ] Changes reflected immediately

**API:** `PATCH /api/projects/:id`

---

### US-2.5: Delete Project
**As a** user
**I want to** delete a project
**So that** I can clean up unused projects

**Acceptance Criteria:**
- [ ] Delete button with confirmation dialog
- [ ] Warning about data loss
- [ ] Container stopped and removed if running
- [ ] Volume kept on disk (manual cleanup)
- [ ] Redirects to dashboard after deletion

**API:** `DELETE /api/projects/:id`

---

## Epic 3: Container Management

### US-3.1: Start Container
**As a** user
**I want to** start my project's container
**So that** I can use the terminal and AI assistants

**Acceptance Criteria:**
- [ ] Start button visible when container not running
- [ ] Loading state while starting
- [ ] Container created if doesn't exist
- [ ] Volume mounted to /workspace
- [ ] Status updates to "running"
- [ ] Terminal tab becomes active

**API:** `POST /api/projects/:id/start`

---

### US-3.2: Stop Container
**As a** user
**I want to** stop my project's container
**So that** I can free up resources

**Acceptance Criteria:**
- [ ] Stop button visible when container running
- [ ] Confirmation if terminal has active session
- [ ] Loading state while stopping
- [ ] Status updates to "stopped"
- [ ] Terminal shows disconnection message

**API:** `POST /api/projects/:id/stop`

---

### US-3.3: Restart Container
**As a** user
**I want to** restart my container
**So that** I can apply configuration changes

**Acceptance Criteria:**
- [ ] Restart button visible when container running
- [ ] Loading state while restarting
- [ ] Terminal reconnects automatically
- [ ] Files remain intact (volume persisted)

**API:** `POST /api/projects/:id/restart`

---

### US-3.4: View Container Logs
**As a** user
**I want to** view container logs
**So that** I can debug issues

**Acceptance Criteria:**
- [ ] Logs tab in project view
- [ ] Shows recent container output
- [ ] Auto-scroll to bottom
- [ ] Refresh button to reload
- [ ] Shows message if no container

**API:** `GET /api/projects/:id/logs`

---

## Epic 4: Terminal Access

### US-4.1: Connect to Terminal
**As a** user
**I want to** access a terminal in my container
**So that** I can run commands and AI assistants

**Acceptance Criteria:**
- [ ] Terminal tab in project view
- [ ] Auto-connects when container running
- [ ] Shows "Container not running" message otherwise
- [ ] Uses lit-shell-terminal component
- [ ] Full PTY support (colors, cursor positioning)
- [ ] Bash shell with proper environment

**WebSocket:** `/ws/terminal`

---

### US-4.2: Terminal Input/Output
**As a** user
**I want to** type commands and see output
**So that** I can interact with the container

**Acceptance Criteria:**
- [ ] Keyboard input sent to container
- [ ] Output displayed in real-time
- [ ] Special keys work (arrows, tab, ctrl+c)
- [ ] Copy/paste supported
- [ ] Command history works

---

### US-4.3: Terminal Resize
**As a** user
**I want to** resize the terminal
**So that** I can see more content

**Acceptance Criteria:**
- [ ] Terminal fills available space
- [ ] Resizes when window resizes
- [ ] Sends resize event to container
- [ ] Text reflows correctly

---

### US-4.4: Terminal Reconnection
**As a** user
**I want to** reconnect if the connection drops
**So that** I don't lose my session

**Acceptance Criteria:**
- [ ] Auto-reconnect on disconnect
- [ ] Shows reconnecting indicator
- [ ] Session persists in container
- [ ] History replayed on reconnect

---

## Epic 5: File Browser

### US-5.1: Browse Files
**As a** user
**I want to** browse files in my project
**So that** I can see what the AI has created

**Acceptance Criteria:**
- [ ] Files tab in project view
- [ ] Shows /workspace directory contents
- [ ] Directory tree navigation
- [ ] File icons based on type
- [ ] Shows file size and modified date
- [ ] Uses x-files-browser component

**WebSocket:** `/ws/files`

---

### US-5.2: View File Contents
**As a** user
**I want to** view file contents
**So that** I can read the code

**Acceptance Criteria:**
- [ ] Click file to view contents
- [ ] Syntax highlighting based on extension
- [ ] Large files truncated with warning
- [ ] Binary files show warning message
- [ ] Read-only view (no editing)

---

### US-5.3: Navigate Directories
**As a** user
**I want to** navigate through directories
**So that** I can explore the project structure

**Acceptance Criteria:**
- [ ] Double-click folder to enter
- [ ] Breadcrumb navigation
- [ ] "Up" button to go to parent
- [ ] Shows hidden files (optional toggle)

---

### US-5.4: Download Files
**As a** user
**I want to** download files
**So that** I can use them locally

**Acceptance Criteria:**
- [ ] Download button on file selection
- [ ] Downloads single files
- [ ] Preserves filename
- [ ] Works for binary files

---

### US-5.5: Upload Files
**As a** user
**I want to** upload files to my project
**So that** I can provide context to the AI

**Acceptance Criteria:**
- [ ] Upload button in file browser
- [ ] Drag-and-drop support
- [ ] Progress indicator for large files
- [ ] Success/error notification
- [ ] Refresh file list after upload

---

## Epic 6: Credential Management

### US-6.1: View Credentials
**As a** user
**I want to** see my stored credentials
**So that** I know which CLIs are configured

**Acceptance Criteria:**
- [ ] Credentials page or section
- [ ] Shows credential name and CLI type
- [ ] Does NOT show actual secret values
- [ ] Shows when credential was created
- [ ] Delete button per credential

**API:** `GET /api/credentials`

---

### US-6.2: Setup CLI Credentials
**As a** user
**I want to** authenticate a CLI
**So that** I can use it in my containers

**Acceptance Criteria:**
- [ ] "Add Credential" button
- [ ] Select CLI type (Claude Code, Codex)
- [ ] Spawns temporary auth container
- [ ] CLI runs in `--no-browser` mode
- [ ] User copies auth URL to local browser
- [ ] User pastes auth code back to terminal
- [ ] Credential files extracted and stored in Vault
- [ ] Temporary container destroyed

**API:** `POST /api/credentials/setup/start`

---

### US-6.3: Delete Credential
**As a** user
**I want to** delete a stored credential
**So that** I can revoke access

**Acceptance Criteria:**
- [ ] Delete button with confirmation
- [ ] Removes from Vault
- [ ] Removes metadata from database
- [ ] Running containers unaffected

**API:** `DELETE /api/credentials/:id`

---

### US-6.4: Inject Credentials
**As a** user
**I want to** have my credentials available in containers
**So that** I don't have to authenticate every time

**Acceptance Criteria:**
- [ ] Credentials injected at container start
- [ ] CLI config files copied to container
- [ ] Environment variables set if needed
- [ ] Works across container restarts

---

## Epic 7: Environment Variables

### US-7.1: View Project Environment Variables
**As a** user
**I want to** see environment variables for my project
**So that** I can manage API keys

**Acceptance Criteria:**
- [ ] Environment section in project settings
- [ ] List of variable names (values hidden)
- [ ] Add/edit/delete buttons

---

### US-7.2: Add Environment Variable
**As a** user
**I want to** add environment variables
**So that** I can configure my project

**Acceptance Criteria:**
- [ ] Add button opens form
- [ ] Name and value fields
- [ ] Value stored encrypted in database
- [ ] Variable injected on container start

---

### US-7.3: Delete Environment Variable
**As a** user
**I want to** delete environment variables
**So that** I can clean up unused config

**Acceptance Criteria:**
- [ ] Delete button per variable
- [ ] Confirmation dialog
- [ ] Takes effect on next container start

---

## Epic 8: User Experience

### US-8.1: Toast Notifications
**As a** user
**I want to** see feedback for my actions
**So that** I know what's happening

**Acceptance Criteria:**
- [ ] Success toasts (green)
- [ ] Error toasts (red)
- [ ] Info toasts (blue)
- [ ] Auto-dismiss after 5 seconds
- [ ] Manual dismiss button

---

### US-8.2: Loading States
**As a** user
**I want to** see loading indicators
**So that** I know the app is working

**Acceptance Criteria:**
- [ ] Button loading states (spinner)
- [ ] Page loading skeletons
- [ ] Disabled inputs during operations

---

### US-8.3: Error Handling
**As a** user
**I want to** see clear error messages
**So that** I can fix problems

**Acceptance Criteria:**
- [ ] API errors shown as toasts
- [ ] Form validation errors inline
- [ ] Network errors handled gracefully
- [ ] Option to retry failed operations

---

### US-8.4: Theme Support
**As a** user
**I want to** choose between dark and light themes
**So that** I can customize my experience

**Acceptance Criteria:**
- [ ] Theme toggle in header
- [ ] Dark theme (default)
- [ ] Light theme
- [ ] Theme persisted in localStorage
- [ ] Terminal and file browser respect theme

---

## Implementation Priority

### Phase 1 - MVP (Current)
- [x] US-1.1 User Registration
- [x] US-1.2 User Login
- [x] US-1.3 Session Persistence
- [x] US-1.4 Logout
- [x] US-2.1 View Projects
- [x] US-2.2 Create Project
- [x] US-2.3 View Project Details
- [x] US-3.1 Start Container
- [x] US-3.2 Stop Container
- [x] US-3.3 Restart Container
- [x] US-3.4 View Container Logs
- [ ] US-4.1 Connect to Terminal (needs lit-shell.js)
- [ ] US-4.2 Terminal Input/Output (needs lit-shell.js)
- [ ] US-4.3 Terminal Resize (needs lit-shell.js)
- [ ] US-5.1 Browse Files (needs x-files.js)
- [ ] US-5.2 View File Contents (needs x-files.js)
- [ ] US-5.3 Navigate Directories (needs x-files.js)

### Phase 2 - File Operations
- [ ] US-4.4 Terminal Reconnection
- [ ] US-5.4 Download Files
- [ ] US-5.5 Upload Files
- [ ] US-2.4 Update Project
- [ ] US-2.5 Delete Project

### Phase 3 - Credentials
- [ ] US-6.1 View Credentials
- [ ] US-6.2 Setup CLI Credentials
- [ ] US-6.3 Delete Credential
- [ ] US-6.4 Inject Credentials
- [ ] US-7.1 View Project Environment Variables
- [ ] US-7.2 Add Environment Variable
- [ ] US-7.3 Delete Environment Variable

### Phase 4 - Polish
- [ ] US-8.1 Toast Notifications
- [ ] US-8.2 Loading States
- [ ] US-8.3 Error Handling
- [ ] US-8.4 Theme Support
