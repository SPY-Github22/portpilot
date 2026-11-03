import React, { useState, useMemo } from 'react';
import { Search, Skull, Copy, Check, Ghost, ExternalLink } from 'lucide-react';
import { ListeningPort } from '../core/types';
import { lookupKnownPort } from '../core/portRegistry';

interface PortTableProps {
  ports: ListeningPort[];
  onOpenKillModal: (port: ListeningPort) => void;
}

export const PortTable: React.FC<PortTableProps> = ({
  ports,
  onOpenKillModal,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'web' | 'db' | 'ghost'>('all');
  const [copiedPid, setCopiedPid] = useState<number | null>(null);

  const handleCopyPid = (pid: number) => {
    navigator.clipboard.writeText(pid.toString());
    setCopiedPid(pid);
    setTimeout(() => setCopiedPid(null), 1500);
  };

  const filteredPorts = useMemo(() => {
    return ports.filter(p => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesPort = p.port.toString().includes(q);
        const matchesName = p.processName.toLowerCase().includes(q);
        const matchesCmd = p.commandLine?.toLowerCase().includes(q) ?? false;
        const known = lookupKnownPort(p.port);
        const matchesService = known?.service.toLowerCase().includes(q) ?? false;
        if (!matchesPort && !matchesName && !matchesCmd && !matchesService) return false;
      }

      // Filter chips
      const known = lookupKnownPort(p.port);
      if (filterType === 'web') {
        return known?.category === 'web_dev' || p.port >= 3000 && p.port <= 9999;
      }
      if (filterType === 'db') {
        return known?.category === 'database' || known?.category === 'cache_queue';
      }
      if (filterType === 'ghost') {
        return Boolean(p.isGhost);
      }

      return true;
    });
  }, [ports, search, filterType]);

  const getPortBadgeColor = (port: number) => {
    const known = lookupKnownPort(port);
    if (!known) return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    switch (known.category) {
      case 'web_dev':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
      case 'database':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
      case 'cache_queue':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
      {/* Search and Filters */}
      <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search port number, PID, process name (node, vite, postgres)..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-9 pr-3 py-1.5 text-neutral-200 outline-none focus:border-cyan-500 placeholder-neutral-500 font-mono text-xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'all'
                ? 'bg-neutral-800 text-white border-neutral-700 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            All Ports ({ports.length})
          </button>
          <button
            onClick={() => setFilterType('web')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'web'
                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-cyan-300'
            }`}
          >
            Web Dev ({ports.filter(p => lookupKnownPort(p.port)?.category === 'web_dev' || (p.port >= 3000 && p.port <= 9999)).length})
          </button>
          <button
            onClick={() => setFilterType('db')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'db'
                ? 'bg-blue-950/50 text-blue-300 border-blue-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-blue-300'
            }`}
          >
            Databases ({ports.filter(p => {
              const k = lookupKnownPort(p.port);
              return k?.category === 'database' || k?.category === 'cache_queue';
            }).length})
          </button>
          <button
            onClick={() => setFilterType('ghost')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'ghost'
                ? 'bg-amber-950/50 text-amber-300 border-amber-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-amber-300'
            }`}
          >
            Ghosts ({ports.filter(p => p.isGhost).length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-20 select-none">
            <tr>
              <th className="py-2.5 px-4 font-semibold text-neutral-300 w-28">Port</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-300 w-44">Service</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-300 min-w-[200px]">Process / Command</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-400 w-28">PID</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-400 w-36">Bind Address</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-400 w-28 text-right pr-4">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-850">
            {filteredPorts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-500 font-medium">
                  No listening ports match your filter.
                </td>
              </tr>
            ) : (
              filteredPorts.map((item) => {
                const known = lookupKnownPort(item.port);
                const isCopied = copiedPid === item.pid;
                const isGhost = Boolean(item.isGhost);

                return (
                  <tr
                    key={`${item.protocol}-${item.port}-${item.pid}`}
                    className={`hover:bg-neutral-900/40 transition group ${
                      isGhost ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Port Badge */}
                    <td className="py-3 px-4 font-mono font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded border ${getPortBadgeColor(item.port)}`}>
                          :{item.port}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-normal">{item.protocol}</span>
                      </div>
                    </td>

                    {/* Service Name */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-200">
                          {known ? known.service : 'Custom Service'}
                        </span>
                        {known && (
                          <span className="text-[10px] text-neutral-500 truncate max-w-xs">
                            {known.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Process / Command */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-mono text-neutral-200 font-medium">
                          <span>{item.processName}</span>
                          {isGhost && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1 rounded flex items-center gap-0.5">
                              <Ghost className="w-2.5 h-2.5" />
                              <span>Ghost / Orphan</span>
                            </span>
                          )}
                        </div>
                        {item.commandLine && (
                          <span className="text-[10px] font-mono text-neutral-500 truncate max-w-md" title={item.commandLine}>
                            {item.commandLine}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PID */}
                    <td className="py-3 px-3 font-mono text-neutral-400">
                      {item.pid ? (
                        <button
                          onClick={() => handleCopyPid(item.pid!)}
                          className="hover:text-white flex items-center gap-1 group/pid"
                          title="Click to copy PID"
                        >
                          <span>{item.pid}</span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-0 group-hover/pid:opacity-100 text-neutral-500" />
                          )}
                        </button>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>

                    {/* Bind Address */}
                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-400">
                      <span className="truncate block max-w-xs">{item.address}:{item.port}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right pr-4">
                      {item.pid && item.pid > 1 ? (
                        <button
                          onClick={() => onOpenKillModal(item)}
                          className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-[11px] font-medium transition inline-flex items-center gap-1 shadow-sm"
                          title={`Kill process ${item.processName} (PID ${item.pid})`}
                        >
                          <Skull className="w-3 h-3" />
                          <span>Free Port</span>
                        </button>
                      ) : (
                        <a
                          href={`http://${item.address === '0.0.0.0' ? 'localhost' : item.address}:${item.port}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-500 hover:text-neutral-300 inline-flex items-center gap-0.5 text-[11px]"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
