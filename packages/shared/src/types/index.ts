import type { CLI_TYPES, CONTAINER_STATUS, USER_ROLES } from '../constants.js';

// Base types
export type CliType = typeof CLI_TYPES[number];
export type ContainerStatus = typeof CONTAINER_STATUS[number];
export type UserRole = typeof USER_ROLES[number];

// User types
export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

// Project types
export interface Project {
  id: number;
  name: string;
  description: string | null;
  cliType: CliType;
  containerId: string | null;
  containerStatus: ContainerStatus | null;
  volumePath: string;
  userId: number;
  templateId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  cliType: CliType;
  templateId: number;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// Container Template types
export interface ContainerTemplate {
  id: number;
  name: string;
  cliType: CliType;
  dockerImage: string;
  defaultCommand: string;
  description: string | null;
  createdAt: string;
}

// Environment Variable types
export interface ProjectEnvVar {
  id: number;
  projectId: number;
  name: string;
  encryptedValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEnvVarCreate {
  name: string;
  value: string;
}

// Credential types
export interface Credential {
  id: number;
  name: string;
  cliType: CliType;
  vaultPath: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialCreate {
  name: string;
  cliType: CliType;
}

// Credential Setup Session types
export interface CredentialSetupSession {
  id: number;
  userId: number;
  cliType: CliType;
  containerId: string;
  status: 'pending' | 'authenticating' | 'completed' | 'failed';
  createdAt: string;
  expiresAt: string;
}

// Auth types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// WebSocket Message types
export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface TerminalInputPayload {
  data: string;
}

export interface TerminalOutputPayload {
  data: string;
}

export interface TerminalResizePayload {
  cols: number;
  rows: number;
}

export interface FileListPayload {
  path: string;
}

export interface FileListResponsePayload {
  path: string;
  entries: FileEntry[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
}

export interface FileReadPayload {
  path: string;
}

export interface FileReadResponsePayload {
  path: string;
  content: string;
  encoding: string;
}

// Container Logs types
export interface ContainerLogsOptions {
  follow?: boolean;
  tail?: number;
  timestamps?: boolean;
}
