import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { PortTable } from './components/PortTable';
import { ConflictBanner } from './components/ConflictBanner';
import { PasteAnalyzer } from './components/PasteAnalyzer';
import { PortReference } from './components/PortReference';
import { KillModal } from './components/KillModal';
import { ListeningPort } from './core/types';
import { analyzePortConflicts } from './core/portRegistry';

// High-realism simulated ports for offline / demo mode
const DEFAULT_MOCK_PORTS: ListeningPort[] = [
  {
    port: 3000,
    protocol: 'TCP',
    ipVersion: 'IPv4',
    address: '127.0.0.1',
    pid: 14820,
    processName: 'node',
    commandLine: 'node /home/user/nextjs-saas/server.js',
    isGhost: false,
  },
  {
    port: 5173,
    protocol: 'TCP',
    ipVersion: 'IPv6',
    address: '::',
    pid: 14890,
    processName: 'vite',
    commandLine: 'vite --host',
    isGhost: false,
  },
  {
    port: 8080,
    protocol: 'TCP',
    ipVersion: 'IPv4',
    address: '0.0.0.0',
    pid: 22109,
    processName: 'node',
    commandLine: 'node (orphaned worker daemon without active terminal)',
    isGhost: true, // Zombie / Ghost process hogging port 8080!
  },
  {
    port: 5432,
    protocol: 'TCP',
    ipVersion: 'IPv4',
    address: '127.0.0.1',
    pid: 1120,
    processName: 'postgres',
    commandLine: '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/data',
    isGhost: false,
  },
  {
    port: 6379,
    protocol: 'TCP',
    ipVersion: 'IPv4',
    address: '0.0.0.0',
    pid: 1098,
    processName: 'redis-server',
    commandLine: 'redis-server *:6379',
    isGhost: false,
  },
  {
    port: 8000,
    protocol: 'TCP',
    ipVersion: 'IPv4',
    address: '127.0.0.1',
    pid: 19802,
    processName: 'python3',
    commandLine: 'python3 -m uvicorn app.main:app --port 8000',
    isGhost: false,
  },
];

export function App() {
  const [mode, setMode] = useState<'live' | 'paste' | 'registry'>('live');
  const [ports, setPorts] = useState<ListeningPort[]>(DEFAULT_MOCK_PORTS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [killTarget, setKillTarget] = useState<ListeningPort | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Scan live ports from local agent if running
  const fetchLivePorts = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:4999/api/ports', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ports) {
          setPorts(data.ports);
          setSessionToken(data.token || '');
          setIsLiveConnected(true);
          return;
        }
      }
    } catch {
      // Local server not running; gracefully retain local/demo mode
      setIsLiveConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePorts();
    const interval = setInterval(fetchLivePorts, 5000);
    return () => clearInterval(interval);
  }, [fetchLivePorts]);

  const conflicts = useMemo(() => {
    return analyzePortConflicts(ports);
  }, [ports]);

  const ghostCount = useMemo(() => {
    return ports.filter(p => p.isGhost).length;
  }, [ports]);

  const handleConfirmKill = async (pid: number, signal: 'SIGTERM' | 'SIGKILL', port?: number) => {
    if (isLiveConnected) {
      try {
        const res = await fetch('http://127.0.0.1:4999/api/kill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PortPilot-Token': sessionToken,
          },
          body: JSON.stringify({ pid, signal, port, token: sessionToken }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✓ Process PID ${pid} terminated.`);
          fetchLivePorts();
        } else {
          showToast(`✕ Error: ${data.error || data.message}`);
        }
      } catch {
        showToast(`✕ Connection error contacting local agent.`);
      }
    } else {
      // Offline / Simulated mode: remove from local state
      setPorts(prev => prev.filter(p => p.pid !== pid));
      showToast(`✓ Process PID ${pid} exorcised from port :${port}.`);
    }
  };

  const handleExorcisePort = (portNum: number) => {
    const target = ports.find(p => p.port === portNum);
    if (target) {
      setKillTarget(target);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header
        mode={mode}
        onSelectMode={setMode}
        isLiveConnected={isLiveConnected}
        onRefresh={fetchLivePorts}
        activePortCount={ports.length}
        conflictCount={conflicts.length}
        ghostCount={ghostCount}
      />

      {/* Collision Alerts Banner */}
      {conflicts.length > 0 && mode === 'live' && (
        <ConflictBanner
          conflicts={conflicts}
          onExorcisePort={handleExorcisePort}
        />
      )}

      {/* Main Mode View */}
      {mode === 'live' && (
        <PortTable
          ports={ports}
          onOpenKillModal={(item) => setKillTarget(item)}
        />
      )}

      {mode === 'paste' && (
        <PasteAnalyzer
          onLoadIntoLive={(loaded) => {
            setPorts(loaded);
            setMode('live');
            showToast(`Loaded ${loaded.length} ports into Live view.`);
          }}
        />
      )}

      {mode === 'registry' && (
        <PortReference />
      )}

      {/* Kill Modal */}
      <KillModal
        isOpen={Boolean(killTarget)}
        onClose={() => setKillTarget(null)}
        targetPort={killTarget}
        onConfirmKill={handleConfirmKill}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
