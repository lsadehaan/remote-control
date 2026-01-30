import Docker from 'dockerode';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_CONTAINER_LIMITS, WORKSPACE_PATH } from '@remote-control/shared';

// Docker socket path varies by platform
const socketPath = process.platform === 'win32'
  ? '//./pipe/docker_engine'
  : config.docker.socketPath;

const docker = new Docker({ socketPath });

export interface CreateContainerOptions {
  name: string;
  image: string;
  volumePath: string;
  workDir?: string;
  env?: string[];
  cmd?: string[];
  credentialFiles?: Record<string, string>; // path -> base64 content
}

export interface ExecOptions {
  containerId: string;
  cmd?: string[];
  tty?: boolean;
  stdin?: boolean;
}

export interface ExecStream {
  stream: NodeJS.ReadWriteStream;
  resize: (cols: number, rows: number) => void;
  inspect: () => Promise<{ ExitCode: number | null }>;
}

class DockerService {
  async createContainer(options: CreateContainerOptions): Promise<string> {
    const {
      name,
      image,
      volumePath,
      workDir = WORKSPACE_PATH,
      env = [],
      cmd = ['/bin/bash'],
    } = options;

    logger.info({ name, image }, 'Creating container');

    // Ensure image exists
    try {
      await docker.getImage(image).inspect();
    } catch {
      logger.info({ image }, 'Pulling image');
      await this.pullImage(image);
    }

    const container = await docker.createContainer({
      name,
      Image: image,
      Cmd: cmd,
      WorkingDir: workDir,
      Env: env,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`${volumePath}:${WORKSPACE_PATH}`],
        Memory: DEFAULT_CONTAINER_LIMITS.memory,
        CpuShares: DEFAULT_CONTAINER_LIMITS.cpuShares,
        CpuQuota: DEFAULT_CONTAINER_LIMITS.cpuQuota,
        CpuPeriod: DEFAULT_CONTAINER_LIMITS.cpuPeriod,
        RestartPolicy: { Name: 'unless-stopped' },
        SecurityOpt: ['no-new-privileges'],
      },
    });

    logger.info({ containerId: container.id }, 'Container created');
    return container.id;
  }

  async startContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.start();
    logger.info({ containerId }, 'Container started');
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 10 });
      logger.info({ containerId }, 'Container stopped');
    } catch (error: unknown) {
      // Container might already be stopped
      if (error instanceof Error && !error.message.includes('is not running')) {
        throw error;
      }
    }
  }

  async restartContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.restart({ t: 10 });
    logger.info({ containerId }, 'Container restarted');
  }

  async removeContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.remove({ force: true });
    logger.info({ containerId }, 'Container removed');
  }

  async getContainerStatus(containerId: string): Promise<string> {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Status;
  }

  async getContainerLogs(
    containerId: string,
    options: { tail?: number; follow?: boolean } = {}
  ): Promise<string> {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail ?? 100,
      follow: false,
      timestamps: true,
    });

    // Docker logs come with header bytes, extract text
    return this.demuxLogs(logs as unknown as Buffer);
  }

  async exec(options: ExecOptions): Promise<ExecStream> {
    const { containerId, cmd = ['/bin/bash'], tty = true, stdin = true } = options;

    const container = docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdin: stdin,
      AttachStdout: true,
      AttachStderr: true,
      Tty: tty,
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
      Tty: tty,
    });

    return {
      stream,
      resize: (cols: number, rows: number) => {
        exec.resize({ w: cols, h: rows }).catch((err) => {
          logger.warn({ err }, 'Failed to resize exec');
        });
      },
      inspect: async () => {
        const info = await exec.inspect();
        return { ExitCode: info.ExitCode };
      },
    };
  }

  async pullImage(image: string): Promise<void> {
    return new Promise((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }

        docker.modem.followProgress(
          stream,
          (err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
          (event: { status: string }) => {
            logger.debug({ event: event.status }, 'Pull progress');
          }
        );
      });
    });
  }

  async listContainers(): Promise<Docker.ContainerInfo[]> {
    return docker.listContainers({ all: true });
  }

  async containerExists(containerId: string): Promise<boolean> {
    try {
      await docker.getContainer(containerId).inspect();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inject environment variables into a running container
   * Writes to /etc/profile.d/rc-env.sh so they're available in all sessions
   */
  async injectEnvVars(
    containerId: string,
    envVars: Record<string, string>
  ): Promise<void> {
    if (Object.keys(envVars).length === 0) return;

    const container = docker.getContainer(containerId);

    // Build the env file content
    const envContent = Object.entries(envVars)
      .map(([key, value]) => {
        // Escape single quotes in value
        const escapedValue = value.replace(/'/g, "'\\''");
        return `export ${key}='${escapedValue}'`;
      })
      .join('\n');

    try {
      // Write to /etc/profile.d/rc-env.sh for interactive shells
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', 'cat > /etc/profile.d/rc-env.sh'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await writeExec.start({
        hijack: true,
        stdin: true,
      });

      stream.write(envContent);
      stream.end();

      await new Promise<void>((resolve) => {
        stream.on('end', resolve);
        stream.on('close', resolve);
      });

      // Also write to ~/.bashrc for non-login shells
      const bashrcExec = await container.exec({
        Cmd: ['sh', '-c', 'cat >> /root/.bashrc'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      const bashrcStream = await bashrcExec.start({
        hijack: true,
        stdin: true,
      });

      bashrcStream.write('\n# Remote Control env vars\n' + envContent + '\n');
      bashrcStream.end();

      await new Promise<void>((resolve) => {
        bashrcStream.on('end', resolve);
        bashrcStream.on('close', resolve);
      });

      logger.info({ containerId, envVarCount: Object.keys(envVars).length }, 'Environment variables injected');
    } catch (error) {
      logger.error({ error, containerId }, 'Failed to inject environment variables');
      throw error;
    }
  }

  /**
   * Inject credential files into a running container
   */
  async injectCredentials(
    containerId: string,
    credentialFiles: Record<string, string>
  ): Promise<void> {
    const container = docker.getContainer(containerId);

    for (const [filePath, base64Content] of Object.entries(credentialFiles)) {
      // Expand ~ to /root
      const expandedPath = filePath.replace('~', '/root');
      const dirPath = expandedPath.substring(0, expandedPath.lastIndexOf('/'));

      try {
        // Create directory
        const mkdirExec = await container.exec({
          Cmd: ['mkdir', '-p', dirPath],
          AttachStdout: true,
          AttachStderr: true,
        });
        await mkdirExec.start({ hijack: false, stdin: false });

        // Decode base64 content
        const content = Buffer.from(base64Content, 'base64').toString('utf8');

        // Write file using tee (handles special characters better than echo)
        const writeExec = await container.exec({
          Cmd: ['sh', '-c', `cat > "${expandedPath}"`],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await writeExec.start({
          hijack: true,
          stdin: true,
        });

        // Write content and close
        stream.write(content);
        stream.end();

        // Wait for completion
        await new Promise<void>((resolve) => {
          stream.on('end', resolve);
          stream.on('close', resolve);
        });

        logger.debug({ containerId, filePath: expandedPath }, 'Injected credential file');
      } catch (error) {
        logger.error({ error, containerId, filePath }, 'Failed to inject credential file');
        throw error;
      }
    }

    logger.info({ containerId, fileCount: Object.keys(credentialFiles).length }, 'Credentials injected');
  }

  private demuxLogs(buffer: Buffer): string {
    // Docker multiplexes stdout/stderr with 8-byte headers
    // For TTY containers, output is not multiplexed
    const lines: string[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Check if this looks like a header (first byte is 0, 1, or 2)
      if (buffer[offset] === 0 || buffer[offset] === 1 || buffer[offset] === 2) {
        if (offset + 8 <= buffer.length) {
          const size = buffer.readUInt32BE(offset + 4);
          if (offset + 8 + size <= buffer.length) {
            lines.push(buffer.subarray(offset + 8, offset + 8 + size).toString('utf8'));
            offset += 8 + size;
            continue;
          }
        }
      }
      // Not a valid header, treat rest as raw output
      lines.push(buffer.subarray(offset).toString('utf8'));
      break;
    }

    return lines.join('');
  }
}

export const dockerService = new DockerService();
