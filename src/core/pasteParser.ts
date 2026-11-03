/**
 * Offline Terminal Output Paste Parser for PortPilot
 * 
 * Auto-detects and parses raw terminal outputs:
 * - `lsof -i :<port>` or `lsof -iTCP -sTCP:LISTEN`
 * - `ss -tulpn` / `ss -tlpn`
 * - `netstat -ano` / `netstat -tulpn`
 */

import { ListeningPort } from './types';
import { generateKillCommands } from './commands';

export interface ParsedPasteResult {
  detectedFormat: 'lsof' | 'ss' | 'netstat' | 'unknown';
  ports: (ListeningPort & { killCommands: ReturnType<typeof generateKillCommands> })[];
  rawLineCount: number;
}

/**
 * Parses `lsof` terminal output
 * Format example:
 * COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
 * node    12345 user   19u  IPv4 148123      0t0  TCP *:3000 (LISTEN)
 */
export function parseLsofOutput(text: string): ListeningPort[] {
  const lines = text.split('\n');
  const results: ListeningPort[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('COMMAND')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 8) continue;

    const processName = parts[0];
    const pid = parseInt(parts[1], 10);
    const user = parts[2];
    const ipVersion: 'IPv4' | 'IPv6' = parts[4].toLowerCase().includes('6') ? 'IPv6' : 'IPv4';

    // The name column is usually e.g. "*:3000", "127.0.0.1:8080", "localhost:5432"
    const nameCol = parts[parts.length - 2] || parts[parts.length - 1];
    const match = nameCol.match(/(?:.*:)?(\d+)/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    if (isNaN(port) || port <= 0) continue;

    const colonIdx = nameCol.lastIndexOf(':');
    const address = colonIdx !== -1 ? nameCol.slice(0, colonIdx) : '0.0.0.0';

    results.push({
      port,
      protocol: 'TCP',
      ipVersion,
      address,
      pid: isNaN(pid) ? null : pid,
      processName,
      user,
    });
  }

  return results;
}

/**
 * Parses `ss -tulpn` / `ss -tlpn` output
 * Format example:
 * Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
 * tcp   LISTEN 0      128    127.0.0.1:3000      0.0.0.0:*         users:(("node",pid=12345,fd=19))
 */
export function parseSsOutput(text: string): ListeningPort[] {
  const lines = text.split('\n');
  const results: ListeningPort[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('tcp') && !trimmed.startsWith('udp')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;

    const protoRaw = parts[0].toUpperCase();
    const proto: 'TCP' | 'UDP' = protoRaw.startsWith('UDP') ? 'UDP' : 'TCP';

    const localAddr = parts[4];
    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) continue;

    const port = parseInt(localAddr.slice(lastColon + 1), 10);
    if (isNaN(port) || port <= 0) continue;

    const address = localAddr.slice(0, lastColon).replace(/\[|\]/g, '');
    const ipVersion: 'IPv4' | 'IPv6' = address.includes(':') ? 'IPv6' : 'IPv4';

    let pid: number | null = null;
    let processName = 'Unknown';

    const remaining = parts.slice(5).join(' ');
    const pidMatch = remaining.match(/pid=(\d+)/i);
    if (pidMatch) pid = parseInt(pidMatch[1], 10);

    const nameMatch = remaining.match(/"([^"]+)"/);
    if (nameMatch) processName = nameMatch[1];

    results.push({
      port,
      protocol: proto,
      ipVersion,
      address: address || '0.0.0.0',
      pid,
      processName,
    });
  }

  return results;
}

/**
 * Parses Windows `netstat -ano` output
 * Format example:
 *   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
 */
export function parseNetstatOutput(text: string): ListeningPort[] {
  const lines = text.split('\n');
  const results: ListeningPort[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.toUpperCase().startsWith('TCP') && !trimmed.toUpperCase().startsWith('UDP')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;

    const proto: 'TCP' | 'UDP' = parts[0].toUpperCase().startsWith('UDP') ? 'UDP' : 'TCP';
    const localAddr = parts[1];
    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) continue;

    const port = parseInt(localAddr.slice(lastColon + 1), 10);
    if (isNaN(port) || port <= 0) continue;

    const address = localAddr.slice(0, lastColon);
    const ipVersion: 'IPv4' | 'IPv6' = address.includes(':') ? 'IPv6' : 'IPv4';

    // Last column is typically PID in `netstat -ano`
    const lastCol = parts[parts.length - 1];
    const pid = parseInt(lastCol, 10);

    results.push({
      port,
      protocol: proto,
      ipVersion,
      address,
      pid: isNaN(pid) ? null : pid,
      processName: 'netstat-process',
    });
  }

  return results;
}

/**
 * Universal auto-detection paste parser
 */
export function parsePastedOutput(text: string): ParsedPasteResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  let detectedFormat: 'lsof' | 'ss' | 'netstat' | 'unknown' = 'unknown';
  let ports: ListeningPort[] = [];

  if (lower.includes('command') && lower.includes('pid') && (lower.includes('listen') || lower.includes('node') || lower.includes('type'))) {
    detectedFormat = 'lsof';
    ports = parseLsofOutput(trimmed);
  } else if (lower.includes('netid') || lower.includes('local address:port') || lower.includes('users:((')) {
    detectedFormat = 'ss';
    ports = parseSsOutput(trimmed);
  } else if (lower.includes('listening') && lower.includes('proto') || /tcp\s+[0-9.:]+\s+[0-9.:]+\s+listening/i.test(trimmed)) {
    detectedFormat = 'netstat';
    ports = parseNetstatOutput(trimmed);
  } else {
    // Try heuristics in order
    const lsofTry = parseLsofOutput(trimmed);
    if (lsofTry.length > 0) {
      detectedFormat = 'lsof';
      ports = lsofTry;
    } else {
      const ssTry = parseSsOutput(trimmed);
      if (ssTry.length > 0) {
        detectedFormat = 'ss';
        ports = ssTry;
      }
    }
  }

  const enrichedPorts = ports.map(p => {
    const validPid = p.pid && p.pid > 1 ? p.pid : 99999;
    return {
      ...p,
      killCommands: generateKillCommands(validPid, p.port),
    };
  });

  return {
    detectedFormat,
    ports: enrichedPorts,
    rawLineCount: text.split('\n').length,
  };
}
