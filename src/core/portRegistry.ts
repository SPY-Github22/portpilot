/**
 * Known Developer Port Registry & Conflict Analyzer for PortPilot
 */

import { ListeningPort, PortConflict } from './types';

export interface KnownPortInfo {
  port: number;
  service: string;
  category: 'web_dev' | 'database' | 'cache_queue' | 'monitoring' | 'infra';
  description: string;
}

export const KNOWN_PORTS: Record<number, KnownPortInfo> = {
  3000: { port: 3000, service: 'React / Next.js / Rails', category: 'web_dev', description: 'Default web frontend & API dev server' },
  3001: { port: 3001, service: 'Secondary Web Server', category: 'web_dev', description: 'Common secondary frontend or microservice' },
  5173: { port: 5173, service: 'Vite Dev Server', category: 'web_dev', description: 'Default Vite frontend bundler dev server' },
  4200: { port: 4200, service: 'Angular CLI', category: 'web_dev', description: 'Default Angular application dev server' },
  5000: { port: 5000, service: 'Flask / ASP.NET', category: 'web_dev', description: 'Python Flask or .NET core default port' },
  8000: { port: 8000, service: 'FastAPI / Django / PHP', category: 'web_dev', description: 'Python backend web frameworks' },
  8080: { port: 8080, service: 'Spring Boot / Tomcat / Proxy', category: 'web_dev', description: 'Java Spring or secondary HTTP proxy' },
  8888: { port: 8888, service: 'Jupyter Notebook', category: 'web_dev', description: 'Data science interactive notebook server' },

  // Databases & Storage
  5432: { port: 5432, service: 'PostgreSQL', category: 'database', description: 'Postgres relational database engine' },
  3306: { port: 3306, service: 'MySQL / MariaDB', category: 'database', description: 'MySQL relational database engine' },
  27017: { port: 27017, service: 'MongoDB', category: 'database', description: 'Mongo document database engine' },
  6379: { port: 6379, service: 'Redis', category: 'cache_queue', description: 'In-memory key-value cache and message broker' },
  11211: { port: 11211, service: 'Memcached', category: 'cache_queue', description: 'Distributed memory caching system' },
  5672: { port: 5672, service: 'RabbitMQ', category: 'cache_queue', description: 'AMQP messaging broker' },
  9092: { port: 9092, service: 'Apache Kafka', category: 'cache_queue', description: 'Distributed event streaming platform' },

  // Infra & Monitoring
  9200: { port: 9200, service: 'Elasticsearch', category: 'infra', description: 'Search and analytics engine REST API' },
  9090: { port: 9090, service: 'Prometheus', category: 'monitoring', description: 'Metrics monitoring system and time series DB' },
  3002: { port: 3002, service: 'Grafana / Alt Web', category: 'monitoring', description: 'Observability & visualization dashboards' },
};

/**
 * Identify known service matching a port
 */
export function lookupKnownPort(port: number): KnownPortInfo | null {
  return KNOWN_PORTS[port] || null;
}

/**
 * Detect port collisions and unexpected bindings
 */
export function analyzePortConflicts(ports: ListeningPort[]): PortConflict[] {
  const conflicts: PortConflict[] = [];
  const portGroup = new Map<number, ListeningPort[]>();

  for (const item of ports) {
    const list = portGroup.get(item.port) || [];
    list.push(item);
    portGroup.set(item.port, list);
  }

  for (const [port, items] of portGroup.entries()) {
    // 1. Multiple discrete processes competing on the same port (rare but happens with SO_REUSEPORT or docker proxy vs host)
    if (items.length > 1) {
      conflicts.push({
        port,
        competingProcesses: items.map(p => ({
          pid: p.pid,
          processName: p.processName,
          commandLine: p.commandLine,
        })),
        reason: `${items.length} competing socket listeners detected on port ${port}`,
      });
    }

    // 2. Unexpected process type sitting on a dedicated database port (e.g. Node sitting on 5432)
    const known = KNOWN_PORTS[port];
    if (known && known.category === 'database') {
      const item = items[0];
      const procLower = item.processName.toLowerCase();
      if (
        !procLower.includes('postgres') &&
        !procLower.includes('mysql') &&
        !procLower.includes('mongo') &&
        !procLower.includes('docker') &&
        !procLower.includes('containerd')
      ) {
        conflicts.push({
          port,
          competingProcesses: [{
            pid: item.pid,
            processName: item.processName,
            commandLine: item.commandLine,
          }],
          reason: `Unusual process "${item.processName}" is listening on standard ${known.service} port ${port}`,
        });
      }
    }
  }

  return conflicts;
}
