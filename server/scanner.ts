/**
 * Port Scanner & Process Inspector for PortPilot
 * 
 * Inspects listening TCP/UDP ports, maps them to PIDs, process names,
 * memory usage, and detects orphaned ghost processes.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { ListeningPort } from '../src/core/types';
import { validatePid, isProtectedProcess, SecurityGuardError, generateKillCommands } from './security';

const execAsync = promisify(exec);

/**
 * Parses Linux hex IP address from /proc/net/tcp
 * e.g., "0100007F" -> "127.0.0.1", "00000000" -> "0.0.0.0"
 */
export function parseHexIpv4(hex: string): string {
  if (hex.length !== 8) return '0.0.0.0';
  const b1 = parseInt(hex.substring(6, 8), 16);
  const b2 = parseInt(hex.substring(4, 6), 16);
  const b3 = parseInt(hex.substring(2, 4), 16);
  const b4 = parseInt(hex.substring(0, 2), 16);
  return `${b1}.${b2}.${b3}.${b4}`;
}

/**
 * Parses Linux hex port
 * e.g., "0BB8" -> 3000, "1F90" -> 8080
 */
export function parseHexPort(hex: string): number {
  return parseInt(hex, 16);
}

/**
 * Parses /proc/net/tcp file content directly without subprocesses
 */
export function parseProcNetTcp(content: string, ipVersion: 'IPv4' | 'IPv6' = 'IPv4'): {
  port: number;
  address: string;
  inode: string;
}[] {
  const lines = content.split('\n');
  const results: { port: number; address: string; inode: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 10) continue;

    const localAddress = parts[1];
    const state = parts[3];

    // TCP_LISTEN is state "0A" in Linux
    if (state !== '0A') continue;

    const [hexIp, hexPort] = localAddress.split(':');
    if (!hexIp || !hexPort) continue;

    const port = parseHexPort(hexPort);
    const address = ipVersion === 'IPv4' ? parseHexIpv4(hexIp) : ':::';
    const inode = parts[9];

    results.push({ port, address, inode });
  }

  return results;
}

/**
 * Scans listening ports using `ss -tulpn` on Linux or `lsof` on macOS/Linux fallback
 */
export async function scanSystemPorts(): Promise<ListeningPort[]> {
  const portsMap = new Map<number, ListeningPort>();

  // Try `ss -tulpn` first (fastest on modern Linux)
  try {
    const { stdout } = await execAsync('ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null');
    const lines = stdout.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('tcp') && !trimmed.startsWith('udp')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;

      const protoRaw = parts[0].toUpperCase();
      const proto: 'TCP' | 'UDP' = protoRaw.startsWith('UDP') ? 'UDP' : 'TCP';

      // Address is usually column 4 (e.g. 127.0.0.1:3000, [::]:8080, *:5432)
      const localAddr = parts[4];
      const lastColon = localAddr.lastIndexOf(':');
      if (lastColon === -1) continue;

      const port = parseInt(localAddr.slice(lastColon + 1), 10);
      if (isNaN(port) || port <= 0) continue;

      const address = localAddr.slice(0, lastColon).replace(/\[|\]/g, '');
      const ipVersion: 'IPv4' | 'IPv6' = address.includes(':') ? 'IPv6' : 'IPv4';

      // Extract PID and process name from "users:(("node",pid=1234,fd=19))"
      let pid: number | null = null;
      let processName = 'Unknown';

      const userCol = parts.slice(5).join(' ');
      const pidMatch = userCol.match(/pid=(\d+)/i);
      if (pidMatch) {
        pid = parseInt(pidMatch[1], 10);
      }

      const nameMatch = userCol.match(/"([^"]+)"/);
      if (nameMatch) {
        processName = nameMatch[1];
      }

      portsMap.set(port, {
        port,
        protocol: proto,
        ipVersion,
        address: address || '0.0.0.0',
        pid,
        processName,
      });
    }
  } catch {
    // If ss/netstat fails, fallback to lsof
    try {
      const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P -F pcn');
      // Parse lsof field output
      let currentPid: number | null = null;
      let currentProcess = 'Unknown';

      for (const line of stdout.split('\n')) {
        if (line.startsWith('p')) {
          currentPid = parseInt(line.slice(1), 10);
        } else if (line.startsWith('c')) {
          currentProcess = line.slice(1);
        } else if (line.startsWith('n')) {
          const namePart = line.slice(1);
          const lastColon = namePart.lastIndexOf(':');
          if (lastColon !== -1) {
            const port = parseInt(namePart.slice(lastColon + 1), 10);
            const address = namePart.slice(0, lastColon);
            if (!isNaN(port) && port > 0) {
              portsMap.set(port, {
                port,
                protocol: 'TCP',
                ipVersion: address.includes(':') ? 'IPv6' : 'IPv4',
                address,
                pid: currentPid,
                processName: currentProcess,
              });
            }
          }
        }
      }
    } catch {
      // Both commands unavailable or permissions limited
    }
  }

  // Augment with process command line, memory, and ghost detection
  const results: ListeningPort[] = [];

  for (const item of portsMap.values()) {
    if (item.pid && item.pid > 1) {
      try {
        // Read cmdline from /proc/<pid>/cmdline if on Linux
        if (fs.existsSync(`/proc/${item.pid}/cmdline`)) {
          const rawCmd = fs.readFileSync(`/proc/${item.pid}/cmdline`, 'utf8');
          const cleanCmd = rawCmd.split('\0').filter(Boolean).join(' ');
          if (cleanCmd) item.commandLine = cleanCmd;

          // Check if parent process is 1 (orphaned background daemon)
          if (fs.existsSync(`/proc/${item.pid}/stat`)) {
            const stat = fs.readFileSync(`/proc/${item.pid}/stat`, 'utf8');
            const statParts = stat.split(' ');
            const ppid = parseInt(statParts[3], 10);
            if (ppid === 1 && !item.processName.toLowerCase().includes('systemd')) {
              item.isGhost = true;
            }
          }
        }
      } catch {
        // Permission denied or process terminated
      }
    }

    results.push(item);
  }

  return results.sort((a, b) => a.port - b.port);
}

/**
 * Safely kills a process listening on a port
 */
export async function terminateProcess(
  pid: number,
  signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM',
  port?: number
): Promise<{ success: boolean; message: string; fallbackCommand: ReturnType<typeof generateKillCommands> }> {
  const validPid = validatePid(pid);
  const fallback = generateKillCommands(validPid, port);

  // Check if process belongs to protected core OS daemons
  try {
    const { stdout } = await execAsync(`ps -p ${validPid} -o comm= 2>/dev/null || true`);
    const procName = stdout.trim();
    if (procName && isProtectedProcess(procName)) {
      throw new SecurityGuardError(`Cannot kill protected system process: "${procName}" (PID ${validPid})`);
    }
  } catch (err: unknown) {
    if (err instanceof SecurityGuardError) throw err;
  }

  try {
    process.kill(validPid, signal);
    return {
      success: true,
      message: `Successfully sent ${signal} to process PID ${validPid}`,
      fallbackCommand: fallback,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to terminate PID ${validPid}: ${msg}`,
      fallbackCommand: fallback,
    };
  }
}
