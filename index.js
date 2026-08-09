
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const settings = require('./settings.js');
const app = express();

app.enable('trust proxy');
app.set('json spaces', 2);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const API_DIR = path.join(__dirname, 'api');

function log(...args) {
  console.log(chalk.hex('#86efac')('[portal]'), ...args);
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

function normalizePhone(phone = '') {
  let p = String(phone).replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return p;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(verify, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', settings.jwtSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', settings.jwtSecret).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function generateApiKey(prefix = 'RX') {
  return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true, trim: true },
  email: { type: String, unique: true, index: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  avatarUrl: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['free', 'premium', 'admin'], default: 'free' },
  dailyLimit: { type: Number, default: settings.freeDailyLimit },
  premiumUntil: { type: Date, default: null },
  apiKey: { type: String, default: settings.defaultFreeApiKey, index: true },
  blacklisted: { type: Boolean, default: false },
  lastExpiryNoticeAt: { type: Date, default: null },
  resetCodeHash: { type: String, default: '' },
  resetCodeExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

const blacklistSchema = new mongoose.Schema({
  ip: { type: String, unique: true, index: true },
  reason: { type: String, default: 'manual block' },
  createdBy: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

const User = mongoose.model('User', userSchema);
const BlacklistIP = mongoose.model('BlacklistIP', blacklistSchema);


global.apikeyf = [settings.defaultFreeApiKey];
global.apikeyp = [];

async function connectMongo() {
  if (!settings.mongoUri) {
    throw new Error('MONGODB_URI belum diisi di .env');
  }
  await mongoose.connect(settings.mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
  log('MongoDB connected');
}

async function refreshApiKeys() {
  const premiumKeys = await User.find({ role: 'premium', apiKey: { $exists: true, $ne: '' } }).distinct('apiKey');
  global.apikeyf = [settings.defaultFreeApiKey, ...premiumKeys];
  global.apikeyp = premiumKeys;
  return global.apikeyf;
}

function authHeader(req) {
  const raw = req.headers.authorization || '';
  if (raw.startsWith('Bearer ')) return raw.slice(7).trim();
  return req.headers['x-access-token'] || '';
}

async function authRequired(req, res, next) {
  try {
    const payload = verifyToken(authHeader(req));
    if (!payload?.id) return res.status(401).json({ status: false, message: 'Login dulu.' });
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ status: false, message: 'Sesi tidak valid.' });
    if (user.blacklisted) return res.status(403).json({ status: false, message: 'Akun diblokir.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
}

function adminRequired(req, res, next) {
  const isAdmin = req.user?.role === 'admin' || settings.adminEmails.includes(String(req.user?.email || '').toLowerCase());
  if (!isAdmin) return res.status(403).json({ status: false, message: 'Akses admin ditolak.' });
  next();
}

async function telegramNotify(text) {
  if (!settings.telegramToken || !settings.telegramOwnerId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${settings.telegramToken}/sendMessage`, {
      chat_id: settings.telegramOwnerId,
      text,
      parse_mode: 'HTML'
    }, { timeout: 15000 });
  } catch (err) {
    console.log(chalk.red('[telegram] gagal kirim notifikasi'));
  }
}

async function sendWhatsAppOtp(phone, message) {
  if (!settings.fonnteToken) throw new Error('Fonnte token belum diatur di .env');
  const target = normalizePhone(phone);
  const res = await axios.post('https://api.fonnte.com/send', new URLSearchParams({
    target,
    message,
    countryCode: '62',
  }), {
    headers: {
      Authorization: settings.fonnteToken,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 30000
  });
  return res.data;
}

async function syncGlobalApiKeys() {
  if (!mongoose.connection.readyState) {
    global.apikeyf = [settings.defaultFreeApiKey];
    global.apikeyp = [];
    return;
  }
  await refreshApiKeys();
  log(`API keys aktif: ${global.apikeyf.length}`);
}

async function loadApiModules() {
  const dirs = ['ai', 'am', 'stalk'];
  for (const dir of dirs) {
    const full = path.join(API_DIR, dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.js')) continue;
      const modPath = path.join(full, file);
      try {
        const mod = require(modPath);
        if (typeof mod === 'function') {
          mod(app);
        }
      } catch (err) {
        console.log(chalk.red(`[portal] Gagal load ${dir}/${file}: ${err.message}`));
      }
    }
  }
}

async function checkPremiumExpirations() {
  const now = new Date();
  const warnMs = Math.max(...settings.premiumWarnDays, 1) * 24 * 60 * 60 * 1000;
  const users = await User.find({
    role: 'premium',
    premiumUntil: { $ne: null }
  });

  for (const user of users) {
    const until = new Date(user.premiumUntil);
    const diff = until.getTime() - now.getTime();
    if (diff < 0 || diff > warnMs) continue;

    const shouldNotifyAgain = !user.lastExpiryNoticeAt || (now.getTime() - new Date(user.lastExpiryNoticeAt).getTime()) > 24 * 60 * 60 * 1000;
    if (!shouldNotifyAgain) continue;

    const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
    await telegramNotify(
      `<b>Notifikasi Premium</b>\n` +
      `User: <code>${user.username}</code>\n` +
      `Email: <code>${user.email}</code>\n` +
      `Sisa: <b>${daysLeft} hari</b>\n` +
      `Berakhir: <code>${until.toLocaleString('id-ID')}</code>`
    );
    user.lastExpiryNoticeAt = now;
    await user.save();
  }
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    dailyLimit: user.dailyLimit,
    premiumUntil: user.premiumUntil,
    apiKey: user.apiKey,
    blacklisted: user.blacklisted,
    createdAt: user.createdAt,
  };
}

async function ensureSeedAdmin() {
  if (!settings.adminEmails.length) return;
  for (const email of settings.adminEmails) {
    const found = await User.findOne({ email: email.toLowerCase() });
    if (found) {
      if (found.role !== 'admin') {
        found.role = 'admin';
        found.dailyLimit = settings.premiumDailyLimit;
        found.apiKey = found.apiKey || generateApiKey('ADM');
        await found.save();
      }
      continue;
    }
    const pw = crypto.randomBytes(10).toString('hex');
    const user = await User.create({
      username: email.split('@')[0],
      email: email.toLowerCase(),
      phone: '',
      avatarUrl: '',
      passwordHash: hashPassword(pw),
      role: 'admin',
      dailyLimit: settings.premiumDailyLimit,
      premiumUntil: null,
      apiKey: generateApiKey('ADM'),
    });
    await telegramNotify(
      `<b>Admin seed dibuat</b>\n` +
      `Email: <code>${user.email}</code>\n` +
      `Username: <code>${user.username}</code>\n` +
      `Password sementara: <code>${pw}</code>`
    );
    console.log(chalk.yellow(`[portal] Admin seed dibuat untuk ${email} (password sementara dikirim ke Telegram)`));
  }
}

app.use(async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    const isStatic = /\.(html|css|js|png|jpg|jpeg|gif|ico|json|svg|webp)$/i.test(req.path);
    if (!isStatic && mongoose.connection.readyState === 1) {
      const blocked = await BlacklistIP.findOne({ ip: clientIP });
      if (blocked) {
        return res.status(403).json({ status: false, message: 'IP telah di blokir silahkan hubungi owner' });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

app.use(express.static(PUBLIC_DIR));
app.use('/public', express.static(PUBLIC_DIR));
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'register.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

app.get('/health', (req, res) => res.json({ status: true, message: 'ok' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, phone, avatarUrl = '', password, confirmPassword } = req.body || {};
    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ status: false, message: 'Semua field wajib diisi.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ status: false, message: 'Konfirmasi password tidak cocok.' });
    }

    const exists = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() },
      ]
    });
    if (exists) return res.status(409).json({ status: false, message: 'Username atau email sudah terdaftar.' });

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
      avatarUrl: avatarUrl.trim(),
      passwordHash: hashPassword(password),
      role: 'free',
      dailyLimit: settings.freeDailyLimit,
      premiumUntil: null,
      apiKey: settings.defaultFreeApiKey,
    });

    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
    await telegramNotify(
      `<b>User baru daftar</b>\n` +
      `Username: <code>${user.username}</code>\n` +
      `Email: <code>${user.email}</code>\n` +
      `Phone: <code>${user.phone}</code>\n` +
      `Role: <b>${user.role}</b>`
    );
    await syncGlobalApiKeys();
    return res.json({ status: true, message: 'Pendaftaran berhasil.', token, user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ status: false, message: 'Identifier dan password wajib diisi.' });
    const user = await User.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
      ]
    });
    if (!user) return res.status(404).json({ status: false, message: 'Akun tidak ditemukan.' });
    if (user.blacklisted) return res.status(403).json({ status: false, message: 'Akun diblokir.' });
    if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ status: false, message: 'Password salah.' });
    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
    return res.json({ status: true, message: 'Login berhasil.', token, user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  return res.json({ status: true, user: publicUser(req.user) });
});

app.post('/api/auth/change-username', authRequired, async (req, res) => {
  try {
    const { newUsername } = req.body || {};
    if (!newUsername) return res.status(400).json({ status: false, message: 'Username baru wajib diisi.' });
    const exists = await User.findOne({ username: newUsername.trim(), _id: { $ne: req.user._id } });
    if (exists) return res.status(409).json({ status: false, message: 'Username sudah dipakai.' });
    req.user.username = newUsername.trim();
    await req.user.save();
    await telegramNotify(`<b>Username berubah</b>\nUser: <code>${req.user.email}</code>\nBaru: <code>${req.user.username}</code>`);
    return res.json({ status: true, message: 'Username berhasil diubah.', user: publicUser(req.user) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/auth/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ status: false, message: 'Password lama dan baru wajib diisi.' });
    if (!verifyPassword(currentPassword, req.user.passwordHash)) {
      return res.status(401).json({ status: false, message: 'Password lama salah.' });
    }
    req.user.passwordHash = hashPassword(newPassword);
    await req.user.save();
    return res.json({ status: true, message: 'Password berhasil diubah.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/auth/api-key/regenerate', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'premium' && req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Hanya premium yang boleh membuat custom apikey.' });
    }
    req.user.apiKey = generateApiKey(req.user.role === 'admin' ? 'ADM' : 'RX');
    await req.user.save();
    await syncGlobalApiKeys();
    return res.json({ status: true, message: 'API key baru dibuat.', apiKey: req.user.apiKey });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/auth/forgot/request', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ status: false, message: 'Identifier wajib diisi.' });
    const user = await User.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
        { phone: normalizePhone(identifier) }
      ]
    });
    if (!user) return res.status(404).json({ status: false, message: 'Akun tidak ditemukan.' });
    if (!user.phone) return res.status(400).json({ status: false, message: 'Nomor WhatsApp belum ada di akun.' });

    const code = generateOtp();
    user.resetCodeHash = hashPassword(code);
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendWhatsAppOtp(user.phone, `Kode reset password kamu: ${code}\nBerlaku 10 menit.`);
    return res.json({ status: true, message: 'Kode reset sudah dikirim ke WhatsApp.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/auth/forgot/verify', async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body || {};
    if (!identifier || !code || !newPassword) return res.status(400).json({ status: false, message: 'Data reset belum lengkap.' });

    const user = await User.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
        { phone: normalizePhone(identifier) }
      ]
    });
    if (!user) return res.status(404).json({ status: false, message: 'Akun tidak ditemukan.' });

    if (!user.resetCodeHash || !user.resetCodeExpiresAt || new Date(user.resetCodeExpiresAt) < new Date()) {
      return res.status(400).json({ status: false, message: 'Kode reset sudah kadaluarsa.' });
    }
    if (!verifyPassword(code, user.resetCodeHash)) {
      return res.status(401).json({ status: false, message: 'Kode salah.' });
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetCodeHash = '';
    user.resetCodeExpiresAt = null;
    await user.save();
    return res.json({ status: true, message: 'Password berhasil direset.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.get('/api/admin/users', authRequired, adminRequired, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ status: true, users: users.map(publicUser) });
});

app.patch('/api/admin/users/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: false, message: 'User tidak ditemukan.' });

    const { role, dailyLimit, premiumUntil, apiKey, blacklisted } = req.body || {};
    if (role) user.role = role;
    if (dailyLimit !== undefined) user.dailyLimit = Number(dailyLimit) || 0;
    if (premiumUntil !== undefined) user.premiumUntil = premiumUntil ? new Date(premiumUntil) : null;
    if (apiKey !== undefined) user.apiKey = apiKey.trim() || (user.role === 'free' ? settings.defaultFreeApiKey : generateApiKey());
    if (blacklisted !== undefined) user.blacklisted = Boolean(blacklisted);

    if (user.role === 'free') {
      user.apiKey = settings.defaultFreeApiKey;
      if (!dailyLimit) user.dailyLimit = settings.freeDailyLimit;
      user.premiumUntil = null;
    }
    if (user.role === 'premium') {
      if (!user.apiKey || user.apiKey === settings.defaultFreeApiKey) user.apiKey = generateApiKey('RX');
      if (!user.dailyLimit) user.dailyLimit = settings.premiumDailyLimit;
    }
    if (user.role === 'admin') {
      if (!user.apiKey || user.apiKey === settings.defaultFreeApiKey) user.apiKey = generateApiKey('ADM');
      if (!user.dailyLimit) user.dailyLimit = settings.premiumDailyLimit;
    }

    await user.save();
    await syncGlobalApiKeys();
    return res.json({ status: true, message: 'User diperbarui.', user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.post('/api/admin/users/:id/reset-password', authRequired, adminRequired, async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ status: false, message: 'Password baru wajib diisi.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: false, message: 'User tidak ditemukan.' });
    user.passwordHash = hashPassword(newPassword);
    await user.save();
    return res.json({ status: true, message: 'Password user diperbarui.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.get('/api/admin/blacklist-ip', authRequired, adminRequired, async (req, res) => {
  const items = await BlacklistIP.find().sort({ createdAt: -1 });
  return res.json({ status: true, items });
});

app.post('/api/admin/blacklist-ip', authRequired, adminRequired, async (req, res) => {
  try {
    const { ip, reason } = req.body || {};
    if (!ip) return res.status(400).json({ status: false, message: 'IP wajib diisi.' });
    await BlacklistIP.updateOne(
      { ip: ip.trim() },
      { $set: { ip: ip.trim(), reason: reason || 'manual block', createdBy: req.user.email } },
      { upsert: true }
    );
    return res.json({ status: true, message: 'IP diblokir.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.delete('/api/admin/blacklist-ip/:ip', authRequired, adminRequired, async (req, res) => {
  try {
    await BlacklistIP.deleteOne({ ip: req.params.ip });
    return res.json({ status: true, message: 'IP dihapus dari blacklist.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

app.get('/api/admin/health', authRequired, adminRequired, async (req, res) => {
  return res.json({
    status: true,
    mongo: mongoose.connection.readyState,
    apiKeys: global.apikeyf?.length || 0,
  });
});

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/ai') || req.path.startsWith('/ai') || req.path.startsWith('/api/am') || req.path.startsWith('/am') || req.path.startsWith('/api/stalk') || req.path.startsWith('/stalk')) {
    const apikey = req.query.apikey || req.body?.apikey;
    if (!apikey || !global.apikeyf.includes(apikey)) {
      return res.status(403).json({ status: false, message: 'Apikey tidak valid.' });
    }
  }
  next();
});

async function boot() {
  await connectMongo();
  await ensureSeedAdmin();
  await refreshApiKeys();
  await loadApiModules();
  await checkPremiumExpirations();
  setInterval(checkPremiumExpirations, 6 * 60 * 60 * 1000);
  setInterval(refreshApiKeys, 30 * 60 * 1000);

  app.listen(settings.port, () => {
    console.log(chalk.hex('#86efac')(`Server berjalan di port ${settings.port}`));
  });
}

boot().catch((err) => {
  console.error(chalk.red('[portal] boot gagal:'), err);
  process.exit(1);
});
