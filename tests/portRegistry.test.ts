import { describe, it, expect } from 'vitest';
import { lookupKnownPort, analyzePortConflicts } from '../src/core/portRegistry';
import { ListeningPort } from '../src/core/types';

describe('Port Registry & Conflict Analyzer', () => {
  it('should lookup well-known developer ports', () => {
    const pg = lookupKnownPort(5432);
    expect(pg?.service).toBe('PostgreSQL');
    expect(pg?.category).toBe('database');

    const vite = lookupKnownPort(5173);
    expect(vite?.service).toContain('Vite');
  });

  it('should detect conflicting duplicate port bindings', () => {
    const ports: ListeningPort[] = [
      { port: 3000, protocol: 'TCP', ipVersion: 'IPv4', address: '0.0.0.0', pid: 1001, processName: 'node' },
      { port: 3000, protocol: 'TCP', ipVersion: 'IPv6', address: '::', pid: 1002, processName: 'docker-proxy' },
    ];

    const conflicts = analyzePortConflicts(ports);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].port).toBe(3000);
    expect(conflicts[0].competingProcesses).toHaveLength(2);
  });

  it('should warn when unexpected process sits on a database port', () => {
    const ports: ListeningPort[] = [
      { port: 5432, protocol: 'TCP', ipVersion: 'IPv4', address: '127.0.0.1', pid: 7777, processName: 'node' },
    ];

    const conflicts = analyzePortConflicts(ports);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain('PostgreSQL');
  });
});
