/**
 * Shared Type Definitions for PortPilot
 */

export interface ListeningPort {
  port: number;
  protocol: 'TCP' | 'UDP';
  ipVersion: 'IPv4' | 'IPv6';
  address: string; // e.g. "127.0.0.1", "0.0.0.0", "::"
  pid: number | null;
  processName: string;
  commandLine?: string;
  memoryMb?: number;
  cpuPercent?: number;
  user?: string;
  isGhost?: boolean; // Process without active tty / parentless orphan
  serviceTag?: string; // e.g. "PostgreSQL", "Vite", "Redis"
}

export interface PortConflict {
  port: number;
  competingProcesses: {
    pid: number | null;
    processName: string;
    commandLine?: string;
  }[];
  reason: string;
}

export interface KillRequest {
  pid: number;
  signal?: 'SIGTERM' | 'SIGKILL';
  port?: number;
  token: string;
}

export interface KillResult {
  success: boolean;
  pid: number;
  message: string;
  fallbackCommand: {
    linux: string;
    macos: string;
    windows: string;
  };
}
