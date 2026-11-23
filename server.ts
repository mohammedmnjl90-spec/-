import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = 'mohammedmnjl90@gmail.com';

const ALLOWED_CATEGORIES = new Set([
  'auth',
  'sync',
  'chat',
  'friends',
  'network',
  'gameplay',
  'unknown',
]);

const SENSITIVE_KEY_PATTERN = /(password|secret|token|apikey|authorization|cookie|email|phone|contact)/i;

interface ServerDiagnosticEntry {
  eventId: string;
  receivedAtIso: string;
  clientTimestampIso: string;
  category: string;
  operation: string;
  collection: string;
  path: string | null;
  code: string;
  rawMessage: string;
  userId: string | null;
  retryable: boolean;
  context?: Record<string, unknown>;
}

const MAX_IN_MEMORY_LOGS = 250;
const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024; // 2 MB cap before simple rotation
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 60;

const recentServerLogs: ServerDiagnosticEntry[] = [];
const failureCountsBySignature = new Map<string, number>();
const rateLimitBuckets = new Map<string, { count: number; resetAtMs: number }>();

const LOGS_DIR = path.resolve(__dirname, 'logs');
const DIAGNOSTICS_LOG_FILE = path.join(LOGS_DIR, 'firestore-diagnostics.jsonl');

function sanitizeString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function sanitizeContext(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>).slice(0, 15);
  for (const [key, val] of entries) {
    const cleanKey = sanitizeString(key, 48);
    if (!cleanKey || SENSITIVE_KEY_PATTERN.test(cleanKey)) {
      continue;
    }
    if (typeof val === 'string') {
      result[cleanKey] = sanitizeString(val, 200);
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      result[cleanKey] = val;
    } else if (typeof val === 'boolean' || val === null) {
      result[cleanKey] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractCollectionFromPath(docPath: string | null): string {
  if (!docPath) return 'unknown';
  const cleaned = docPath.replace(/^\/+/, '');
  const firstSegment = cleaned.split('/')[0];
  return firstSegment || 'unknown';
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(clientKey);
  if (!bucket || now >= bucket.resetAtMs) {
    rateLimitBuckets.set(clientKey, {
      count: 1,
      resetAtMs: now + RATE_LIMIT_WINDOW_MS,
    });
    if (rateLimitBuckets.size > 500) {
      for (const [k, b] of rateLimitBuckets.entries()) {
        if (now >= b.resetAtMs) rateLimitBuckets.delete(k);
      }
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_EVENTS;
}

function appendDiagnosticToFile(entry: ServerDiagnosticEntry): void {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (fs.existsSync(DIAGNOSTICS_LOG_FILE)) {
      const stats = fs.statSync(DIAGNOSTICS_LOG_FILE);
      if (stats.size >= MAX_LOG_FILE_BYTES) {
        const rotatedPath = path.join(LOGS_DIR, 'firestore-diagnostics.prev.jsonl');
        fs.renameSync(DIAGNOSTICS_LOG_FILE, rotatedPath);
      }
    }
    fs.appendFileSync(DIAGNOSTICS_LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (fsErr) {
    console.error('[SERVER_DIAGNOSTICS] Failed to persist log file:', fsErr);
  }
}

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, timestampIso: new Date().toISOString() });
  });

  /**
   * Robust Server-Side Diagnostics Logging Endpoint
   * Receives sanitized technical error telemetry (e.g. Firestore permission-denied,
   * sync failures, auth errors) for server logs & investigation while keeping
   * player-facing UI completely clean of technical jargon.
   */
  app.post('/api/diagnostics/log', (req, res) => {
    const clientIp =
      sanitizeString(req.headers['x-forwarded-for'], 64).split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';

    if (isRateLimited(clientIp)) {
      res.status(429).json({ ok: false });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    const rawCategory = sanitizeString(body.category, 24).toLowerCase();
    const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'unknown';
    const operation = sanitizeString(body.operation, 64) || 'unknown';
    const docPath = sanitizeString(body.path, 160) || null;
    const collection = extractCollectionFromPath(docPath);
    const code = sanitizeString(body.code, 64) || 'unknown';
    const rawMessage = sanitizeString(body.rawMessage, 600);
    const userId = sanitizeString(body.userId, 128) || null;
    const retryable = Boolean(body.retryable);
    const clientTimestampIso =
      sanitizeString(body.timestampIso, 64) || new Date().toISOString();
    const context = sanitizeContext(body.context);

    const eventId = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: ServerDiagnosticEntry = {
      eventId,
      receivedAtIso: new Date().toISOString(),
      clientTimestampIso,
      category,
      operation,
      collection,
      path: docPath,
      code,
      rawMessage,
      userId,
      retryable,
      ...(context ? { context } : {}),
    };

    recentServerLogs.unshift(entry);
    if (recentServerLogs.length > MAX_IN_MEMORY_LOGS) {
      recentServerLogs.length = MAX_IN_MEMORY_LOGS;
    }

    const sigKey = `${collection}|${operation}|${code}`;
    failureCountsBySignature.set(sigKey, (failureCountsBySignature.get(sigKey) || 0) + 1);

    // Structured server-side logging (stdout/stderr for container & cloud log collectors)
    const isPermissionError =
      code.toLowerCase().includes('permission') ||
      rawMessage.toLowerCase().includes('permission-denied') ||
      rawMessage.toLowerCase().includes('missing or insufficient permissions');

    if (isPermissionError) {
      console.error('[SERVER_DIAGNOSTICS][FIRESTORE_PERMISSION_DENIED]', JSON.stringify(entry));
    } else {
      console.warn('[SERVER_DIAGNOSTICS]', JSON.stringify(entry));
    }

    appendDiagnosticToFile(entry);

    res.status(202).json({ ok: true, eventId });
  });

  /**
   * Admin-only developer diagnostics summary endpoint.
   * Requires explicit admin header to inspect recent server-captured failures.
   */
  app.get('/api/diagnostics/summary', (req, res) => {
    const adminHeader = sanitizeString(req.headers['x-admin-email'], 120).toLowerCase();
    if (adminHeader !== ADMIN_EMAIL) {
      res.status(403).json({ ok: false });
      return;
    }

    const signatureBreakdown = Array.from(failureCountsBySignature.entries())
      .map(([signature, count]) => {
        const [collection, operation, code] = signature.split('|');
        return { collection, operation, code, count };
      })
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      ok: true,
      totalBuffered: recentServerLogs.length,
      signatureBreakdown,
      recent: recentServerLogs.slice(0, 50),
    });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Server] Peak of Challenge server listening on http://0.0.0.0:${PORT} (${
        IS_PRODUCTION ? 'production' : 'development'
      })`
    );
  });
}

void startServer();
