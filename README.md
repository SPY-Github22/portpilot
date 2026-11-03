# PortPilot 🔌✈️

> **The Local Port & Ghost Process Exorcist**  
> *Inspect listening dev ports, exorcise zombie background processes, prevent port collisions, and generate instant cross-platform kill commands.*

---

## 🚀 The Daily Friction It Solves

Every developer repeatedly encounters this error:
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
Fixing it requires interrupting flow, switching to terminal, running `lsof -i :3000` or `ss -tulpn`, parsing numeric PIDs, and running `kill -9 <PID>`, or hunting down zombie background Docker/Node/Python processes.

**PortPilot** eliminates this friction with a unified interactive dashboard, 1-click process termination, and offline terminal output diagnostics.

---

## 🔒 Security Architecture & System Shield

Because process management involves `kill` capabilities, PortPilot implements strict enterprise-grade security boundaries:
- **Strict Localhost Binding**: The local agent binds exclusively to `127.0.0.1` (never exposed to external networks).
- **CSRF Token Shield**: Generates a random session token on startup; cross-site browser tabs cannot send unauthorized kill requests.
- **System Process Shield**: Hard blocks killing PID 1 (`init` / `systemd`), PID 0, kernel threads, or root system processes (`dbus-daemon`, `sshd`, `polkitd`, `NetworkManager`). Only user-space processes on mapped dev ports can be terminated.
- **CSP Protection**: Strict Content Security Policy (`connect-src 'self' http://127.0.0.1:* http://localhost:*`).

---

## ✨ Features

- **🔍 Live Port Scanner**:
  Inspects listening TCP/UDP ports, PIDs, process names (`node`, `vite`, `python`, `docker-proxy`, `postgres`), and command line strings.
- **👻 Ghost Process Detector**:
  Identifies orphaned background processes running without an active terminal, and flags duplicate workers contending for the same port.
- **⚡ 1-Click Exorcist (Kill & Free Port)**:
  Supports graceful stop (`SIGTERM`) and force termination (`SIGKILL`). Also provides copyable fallback commands for Linux (`fuser -k`), macOS (`kill -9 $(lsof...)`), and Windows (`taskkill /PID ... /F`).
- **📋 Offline Terminal Paste Diagnostic Mode**:
  Paste raw output from `lsof -i`, `ss -tulpn`, or `netstat -ano` from remote SSH servers or local machines for instant visual inspection and kill commands.
- **📖 Standard Port Reference Catalog**:
  Interactive guide for standard framework ports (React 3000, Vite 5173, Django 8000, Spring 8080) and databases (Postgres 5432, Redis 6379, Mongo 27017).

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 6](https://vitejs.dev/)
- **Backend / CLI**: Node.js HTTP Server (`server/api.ts`) + `/proc/net/tcp` scanner
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (100% passing test coverage for PID guards, procfs scanner, paste parser, and port registry)

---

## 🚀 Quickstart

### Run as Local Web Application

```bash
# Clone the repository
git clone https://github.com/SPY-Github22/portpilot.git
cd portpilot

# Install dependencies
npm install

# Run unit tests
npm test

# Launch local app
npm run dev
```

Open [http://localhost:5176](http://localhost:5176) in your browser.

### Run via CLI

```bash
# Start dashboard on http://127.0.0.1:4999
./bin/portpilot.js

# Kill process on port 3000 directly from CLI
./bin/portpilot.js --kill 3000

# Inspect port 8080
./bin/portpilot.js --port 8080

# Output listening ports as JSON
./bin/portpilot.js --json
```

---

## 🧪 Automated Tests

Run the Vitest suite:
```bash
npm test
```

Includes 14 automated tests covering:
- Native `/proc/net/tcp` hex IP and port decoding
- System PID protection guard and CSRF session token verification
- Raw `lsof`, `ss`, and `netstat` terminal paste parser
- Known port lookup and port collision detection

---

## 📄 License

MIT © 2026 PortPilot Contributors
