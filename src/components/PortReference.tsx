import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Database, Globe, Cpu, Server } from 'lucide-react';
import { KNOWN_PORTS } from '../core/portRegistry';

export const PortReference: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const portList = useMemo(() => {
    return Object.values(KNOWN_PORTS).filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.port.toString().includes(q) ||
          p.service.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, categoryFilter]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'web_dev':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      case 'cache_queue':
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Server className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 overflow-auto bg-neutral-950 text-xs">
      {/* Header and Search */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white text-xs">Standard Developer Port Reference Catalog</span>
          <span className="text-neutral-500 font-mono text-[11px]">
            (Quick reference for standard framework ports & database listeners)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by port number or framework (postgres, vite, redis)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md pl-9 pr-3 py-1.5 text-neutral-200 outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-md border transition ${
                categoryFilter === 'all'
                  ? 'bg-neutral-800 text-white border-neutral-700 font-medium'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('web_dev')}
              className={`px-2.5 py-1 rounded-md border transition ${
                categoryFilter === 'web_dev'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800 font-medium'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-cyan-300'
              }`}
            >
              Web Dev
            </button>
            <button
              onClick={() => setCategoryFilter('database')}
              className={`px-2.5 py-1 rounded-md border transition ${
                categoryFilter === 'database'
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800 font-medium'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-blue-300'
              }`}
            >
              Databases
            </button>
            <button
              onClick={() => setCategoryFilter('cache_queue')}
              className={`px-2.5 py-1 rounded-md border transition ${
                categoryFilter === 'cache_queue'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800 font-medium'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-amber-300'
              }`}
            >
              Cache & Queues
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {portList.map((item) => (
          <div
            key={item.port}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 space-y-2 hover:border-neutral-700 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                :{item.port}
              </span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                {getCategoryIcon(item.category)}
                <span className="text-[10px] capitalize font-mono">{item.category.replace('_', ' ')}</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-white text-xs">{item.service}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
