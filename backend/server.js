import crypto from 'node:crypto';
import { watch } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, 'data', 'emergency-requests.json'));
const USERS_FILE = path.resolve(process.env.USERS_FILE || path.join(__dirname, 'data', 'users.json'));
const FACILITIES_FILE = path.resolve(process.env.FACILITIES_FILE || path.join(__dirname, 'data', 'healthcare-facilities.json'));
const MAX_BODY_SIZE = '32kb';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const scrypt = promisify(crypto.scrypt);
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: MAX_BODY_SIZE }));

let requests = [];
let users = [];
let facilities = [];
const sessions = new Map();
let writeQueue = Promise.resolve();
let userWriteQueue = Promise.resolve();

async function loadJsonArray(filePath, label) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error(`${label} data file must contain a JSON array.`);
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '[]\n', 'utf8');
      return [];
    }
    throw error;
  }
}

function persistArray(filePath, entries, currentQueue) {
  const nextQueue = currentQueue.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryFile = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, filePath);
  });
  return nextQueue;
}

async function loadRequests() {
  requests = await loadJsonArray(DATA_FILE, 'Request');
  users = await loadJsonArray(USERS_FILE, 'User');
  facilities = await loadJsonArray(FACILITIES_FILE, 'Healthcare facility');
}

function watchJsonFile(filePath, label, updateData) {
  let debounceTimer;
  const targetName = path.basename(filePath);
  const watcher = watch(path.dirname(filePath), (_eventType, changedName) => {
    if (changedName && changedName.toString() !== targetName) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const updatedData = await loadJsonArray(filePath, label);
        updateData(updatedData);
        console.log(`Reloaded ${label} data from ${filePath}`);
      } catch (error) {
        console.error(`Could not reload ${label} data; keeping the last valid in-memory copy.`, error.message);
      }
    }, 200);
  });
  watcher.on('error', (error) => console.error(`File watcher error for ${filePath}:`, error.message));
}

function persistRequests() {
  writeQueue = persistArray(DATA_FILE, requests, writeQueue);
  return writeQueue;
}

function persistUsers() {
  userWriteQueue = persistArray(USERS_FILE, users, userWriteQueue);
  return userWriteQueue;
}

function cleanString(value, fieldName, maxLength, { required = false } = {}) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return '';
    throw Object.assign(new Error(`${fieldName} must be a string.`), { status: 400 });
  }
  const cleaned = value.trim();
  if (required && !cleaned) {
    throw Object.assign(new Error(`${fieldName} is required.`), { status: 400 });
  }
  if (cleaned.length > maxLength) {
    throw Object.assign(new Error(`${fieldName} must be ${maxLength} characters or fewer.`), { status: 400 });
  }
  return cleaned;
}

function formatValidationError(error, res) {
  res.status(error.status || 500).json({ error: error.status ? 'ValidationError' : 'InternalServerError', message: error.status ? error.message : 'An unexpected server error occurred.' });
}

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, createdAt: user.createdAt };
}

function normalizeEmail(value) {
  const email = cleanString(value, 'email', 254, { required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Masukkan alamat email yang valid.'), { status: 400 });
  }
  return email;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw Object.assign(new Error('Password harus terdiri dari 8 sampai 128 karakter.'), { status: 400 });
  }
  return value;
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = await scrypt(password, salt, 64);
  return { salt, hash: hash.toString('hex') };
}

async function passwordMatches(password, user) {
  const candidate = await scrypt(password, user.passwordSalt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(tokenHash, { userId, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9_-]+)$/i);
  if (!match) return res.status(401).json({ error: 'Unauthorized', message: 'Silakan login untuk melanjutkan.' });

  const tokenHash = crypto.createHash('sha256').update(match[1]).digest('hex');
  const session = sessions.get(tokenHash);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(tokenHash);
    return res.status(401).json({ error: 'Unauthorized', message: 'Sesi login sudah berakhir. Silakan login kembali.' });
  }

  const user = users.find((entry) => entry.id === session.userId);
  if (!user) {
    sessions.delete(tokenHash);
    return res.status(401).json({ error: 'Unauthorized', message: 'Akun tidak ditemukan. Silakan login kembali.' });
  }
  req.user = user;
  req.tokenHash = tokenHash;
  return next();
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.' },
});
const pushRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Terlalu banyak permintaan notifikasi. Coba lagi sebentar.' },
});

async function sendExpoPushNotifications(tokens, { title, body, data }) {
  const tickets = [];
  for (let index = 0; index < tokens.length; index += 100) {
    const messages = tokens.slice(index, index + 100).map(({ token }) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
        signal: controller.signal,
      });
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'Layanan push notification terlalu lama merespons.'
        : 'Tidak dapat terhubung ke layanan push notification.';
      throw Object.assign(new Error(message), { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw Object.assign(new Error(`Layanan push notification menolak permintaan (HTTP ${response.status}).`), { status: 502 });
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw Object.assign(new Error('Layanan push notification mengirim respons yang tidak valid.'), { status: 502 });
    }
    if (!Array.isArray(payload.data)) {
      throw Object.assign(new Error(payload.errors?.[0]?.message || 'Respons layanan push notification tidak sesuai.'), { status: 502 });
    }
    tickets.push(...payload.data);
  }
  return tickets;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'medrespons-backend', timestamp: new Date().toISOString() });
});

app.get('/api/healthcare-facilities', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLocaleLowerCase('id-ID') : '';
  const filtered = query
    ? facilities.filter((facility) => `${facility.name} ${facility.address} ${(facility.emergencyServices || []).join(' ')}`.toLocaleLowerCase('id-ID').includes(query))
    : facilities;
  res.json({ data: filtered, count: filtered.length, notice: 'Data direktori ini adalah contoh untuk demonstrasi, bukan direktori resmi.' });
});

app.post('/api/auth/register', authRateLimit, async (req, res, next) => {
  try {
    const body = req.body || {};
    const fullName = cleanString(body.fullName, 'fullName', 120, { required: true });
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'Conflict', message: 'Email tersebut sudah terdaftar. Silakan login.' });
    }

    const credentials = await hashPassword(password);
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'Conflict', message: 'Email tersebut sudah terdaftar. Silakan login.' });
    }
    const user = {
      id: `USR-${crypto.randomUUID()}`,
      fullName,
      email,
      passwordSalt: credentials.salt,
      passwordHash: credentials.hash,
      createdAt: new Date().toISOString(),
    };
    users = [...users, user];
    await persistUsers();
    const session = createSession(user.id);
    return res.status(201).json({ data: { token: session.token, expiresAt: session.expiresAt, user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const password = validatePassword(body.password);
    const user = users.find((entry) => entry.email === email);
    if (!user || !(await passwordMatches(password, user))) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Email atau password tidak sesuai.' });
    }
    const session = createSession(user.id);
    return res.json({ data: { token: session.token, expiresAt: session.expiresAt, user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ data: { user: publicUser(req.user) } });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  sessions.delete(req.tokenHash);
  res.json({ data: { message: 'Berhasil logout.' } });
});

app.post('/api/push-tokens', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const token = cleanString(body.token, 'token', 512, { required: true });
    const platform = cleanString(body.platform, 'platform', 20, { required: true });
    if (!/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
      throw Object.assign(new Error('Expo push token tidak valid.'), { status: 400 });
    }
    if (!['ios', 'android'].includes(platform)) {
      throw Object.assign(new Error('Platform harus berupa ios atau android.'), { status: 400 });
    }

    users = users.map((user) => {
      const pushTokens = Array.isArray(user.pushTokens) ? user.pushTokens : [];
      const withoutThisToken = pushTokens.filter((entry) => entry.token !== token);
      if (user.id === req.user.id) {
        return {
          ...user,
          pushTokens: [...withoutThisToken, { token, platform, updatedAt: new Date().toISOString() }],
        };
      }
      return withoutThisToken.length === pushTokens.length ? user : { ...user, pushTokens: withoutThisToken };
    });
    await persistUsers();
    return res.status(200).json({ data: { registered: true } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/push-notifications/test', authenticate, pushRateLimit, async (req, res, next) => {
  try {
    const body = req.body || {};
    const title = cleanString(body.title, 'title', 120, { required: true });
    const message = cleanString(body.body, 'body', 2000, { required: true });
    const data = body.data === undefined ? { screen: 'history' } : body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) || Buffer.byteLength(JSON.stringify(data)) > 4096) {
      throw Object.assign(new Error('Data notifikasi harus berupa objek JSON maksimal 4 KB.'), { status: 400 });
    }
    const tokens = (Array.isArray(req.user.pushTokens) ? req.user.pushTokens : [])
      .filter((entry) => entry && typeof entry.token === 'string');
    if (!tokens.length) {
      return res.status(409).json({ error: 'DeviceNotRegistered', message: 'Belum ada perangkat terdaftar untuk menerima notifikasi.' });
    }

    const tickets = await sendExpoPushNotifications(tokens, { title, body: message, data });
    const failedTickets = tickets.filter((ticket) => ticket.status === 'error');
    if (failedTickets.length) {
      const invalidTokens = new Set();
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' && tokens[index]) {
          invalidTokens.add(tokens[index].token);
        }
      });
      if (invalidTokens.size) {
        users = users.map((user) => user.id === req.user.id
          ? { ...user, pushTokens: (user.pushTokens || []).filter((entry) => !invalidTokens.has(entry.token)) }
          : user);
        await persistUsers();
      }
    }
    return res.json({
      data: {
        sent: tickets.filter((ticket) => ticket.status === 'ok').length,
        failed: failedTickets.length,
        tickets,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/emergency-requests', authenticate, (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const ownedRequests = requests.filter((item) => item.userId === req.user.id);
  const filtered = status ? ownedRequests.filter((item) => item.status === status) : ownedRequests;
  res.json({ data: filtered, count: filtered.length });
});

app.get('/api/emergency-requests/:id', authenticate, (req, res) => {
  const item = requests.find((entry) => entry.id === req.params.id && entry.userId === req.user.id);
  if (!item) return res.status(404).json({ error: 'NotFound', message: 'Emergency request was not found.' });
  return res.json({ data: item });
});

app.post('/api/emergency-requests', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const patient = body.patient || {};
    const pickup = body.pickup || {};
    const now = new Date().toISOString();
    const record = {
      id: `MR-${crypto.randomUUID()}`,
      userId: req.user.id,
      patient: {
        name: cleanString(patient.name, 'patient.name', 160, { required: true }),
        condition: cleanString(patient.condition, 'patient.condition', 500, { required: true }),
      },
      pickup: {
        address: cleanString(pickup.address, 'pickup.address', 500, { required: true }),
      },
      notes: cleanString(body.notes, 'notes', 2000),
      status: 'submitted',
      ambulanceId: null,
      createdAt: now,
      updatedAt: now,
    };

    requests = [record, ...requests];
    await persistRequests();
    return res.status(201).location(`/api/emergency-requests/${encodeURIComponent(record.id)}`).json({ data: record });
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Route was not found.' });
});

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'BadRequest', message: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'PayloadTooLarge', message: `Request body must be no larger than ${MAX_BODY_SIZE}.` });
  }
  return formatValidationError(error, res);
});

await loadRequests();
watchJsonFile(DATA_FILE, 'Request', (data) => { requests = data; });
watchJsonFile(USERS_FILE, 'User', (data) => { users = data; });
watchJsonFile(FACILITIES_FILE, 'Healthcare facility', (data) => { facilities = data; });
app.listen(PORT, HOST, () => {
  console.log(`MedRespons API listening on http://${HOST}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
