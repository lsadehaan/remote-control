import vault from 'node-vault';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

interface VaultOptions {
  apiVersion?: string;
  endpoint?: string;
  token?: string;
}

interface CredentialData {
  files: Record<string, string>; // filename -> base64 encoded content
  env?: Record<string, string>;  // environment variables
}

class VaultService {
  private client: vault.client | null = null;
  private initialized = false;
  private useLocalEncryption = false;

  // For local fallback when Vault is not available
  private localStore = new Map<string, string>();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const options: VaultOptions = {
        apiVersion: 'v1',
        endpoint: config.vault.addr,
      };

      if (config.vault.token) {
        options.token = config.vault.token;
      }

      this.client = vault(options);

      // Test connection
      await this.client.health();
      logger.info('Connected to Vault');
      this.initialized = true;
    } catch (error) {
      logger.warn('Vault not available, using local encrypted storage');
      this.useLocalEncryption = true;
      this.initialized = true;
    }
  }

  /**
   * Store credential data in Vault
   */
  async storeCredential(userId: number, credentialId: number, data: CredentialData): Promise<string> {
    await this.initialize();

    const vaultPath = `secret/data/remote-control/users/${userId}/credentials/${credentialId}`;

    if (this.useLocalEncryption) {
      // Fallback: encrypt and store locally
      const encrypted = this.encrypt(JSON.stringify(data));
      this.localStore.set(vaultPath, encrypted);
      logger.info({ vaultPath }, 'Credential stored locally (encrypted)');
      return vaultPath;
    }

    try {
      await this.client!.write(vaultPath, {
        data,
      });
      logger.info({ vaultPath }, 'Credential stored in Vault');
      return vaultPath;
    } catch (error) {
      logger.error({ error, vaultPath }, 'Failed to store credential in Vault');
      throw error;
    }
  }

  /**
   * Retrieve credential data from Vault
   */
  async getCredential(vaultPath: string): Promise<CredentialData | null> {
    await this.initialize();

    if (this.useLocalEncryption) {
      const encrypted = this.localStore.get(vaultPath);
      if (!encrypted) return null;
      try {
        const decrypted = this.decrypt(encrypted);
        return JSON.parse(decrypted);
      } catch {
        return null;
      }
    }

    try {
      const result = await this.client!.read(vaultPath);
      return result.data?.data as CredentialData;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      logger.error({ error, vaultPath }, 'Failed to retrieve credential from Vault');
      throw error;
    }
  }

  /**
   * Delete credential from Vault
   */
  async deleteCredential(vaultPath: string): Promise<void> {
    await this.initialize();

    if (this.useLocalEncryption) {
      this.localStore.delete(vaultPath);
      logger.info({ vaultPath }, 'Credential deleted from local store');
      return;
    }

    try {
      // Delete both data and metadata
      await this.client!.delete(vaultPath);
      await this.client!.delete(vaultPath.replace('/data/', '/metadata/'));
      logger.info({ vaultPath }, 'Credential deleted from Vault');
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('404')) {
        return; // Already deleted
      }
      logger.error({ error, vaultPath }, 'Failed to delete credential from Vault');
      throw error;
    }
  }

  /**
   * Check if Vault is available
   */
  async isAvailable(): Promise<boolean> {
    await this.initialize();
    return !this.useLocalEncryption;
  }

  /**
   * Local encryption using AES-256-GCM
   */
  private encrypt(text: string): string {
    const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    const [ivHex, authTagHex, encrypted] = parts as [string, string, string];

    const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const vaultService = new VaultService();
