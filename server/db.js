// ADDERLEY MOSS — data layer (node:sqlite). Money in cents (BSD). Time in minutes.
// Timestamps are local wall-clock strings 'YYYY-MM-DD HH:MM:SS' (America/Nassau).
process.env.TZ = process.env.TZ || 'America/Nassau';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'adderley.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('managing_partner','partner','associate','paralegal','accounts','reception','client')),
  name TEXT NOT NULL, slug TEXT, title TEXT, phone TEXT, rate_cents INTEGER DEFAULT 0, target_hours INTEGER DEFAULT 0, color TEXT, bar_year INTEGER, education TEXT DEFAULT '[]',
  languages TEXT, areas TEXT DEFAULT '[]', bio TEXT, admissions TEXT, client_id INTEGER, active INTEGER DEFAULT 1, created_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, ref TEXT, actor TEXT, action TEXT NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY, client_id INTEGER, channel TEXT DEFAULT 'email', kind TEXT, recipient TEXT, subject TEXT, body TEXT NOT NULL, created_at TEXT);

-- ---------------------------------------------------------------- clients & compliance
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE, kind TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','company')), name TEXT NOT NULL, contact_name TEXT,
  email TEXT, phone TEXT, address TEXT, nationality TEXT, registration_no TEXT, origin_id INTEGER REFERENCES users(id),
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','expired','rejected')), risk TEXT DEFAULT 'standard' CHECK (risk IN ('low','standard','high')),
  pep INTEGER DEFAULT 0, source_of_funds TEXT, kyc_verified_at TEXT, kyc_reviewer TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS kyc_docs (id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, kind TEXT NOT NULL, filename TEXT, status TEXT DEFAULT 'received' CHECK (status IN ('requested','received','accepted','rejected')), expires_on TEXT, uploaded_at TEXT, reviewed_by TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS intakes (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE, token TEXT UNIQUE, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, area TEXT, summary TEXT, adverse TEXT DEFAULT '[]', related TEXT DEFAULT '[]',
  urgency TEXT DEFAULT 'normal', budget TEXT, source TEXT DEFAULT 'website', status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','conflict_review','cleared','declined','consult_booked','converted','lost')),
  conflicts TEXT DEFAULT '[]', conflict_note TEXT, cleared_by TEXT, consult_at TEXT, consult_user_id INTEGER, consult_fee_cents INTEGER DEFAULT 0, consult_paid INTEGER DEFAULT 0, consult_mode TEXT, client_id INTEGER, matter_id INTEGER, created_at TEXT
);

-- ---------------------------------------------------------------- matters
CREATE TABLE IF NOT EXISTS matters (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE, client_id INTEGER NOT NULL REFERENCES clients(id), title TEXT NOT NULL, area TEXT NOT NULL, stage TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
  responsible_id INTEGER REFERENCES users(id), originating_id INTEGER REFERENCES users(id), billing TEXT NOT NULL DEFAULT 'hourly' CHECK (billing IN ('hourly','fixed','capped')), fixed_fee_cents INTEGER, cap_cents INTEGER, budget_cents INTEGER, rate_discount_pct INTEGER DEFAULT 0,
  evergreen_cents INTEGER DEFAULT 0, court TEXT, case_no TEXT, opposing_counsel TEXT, description TEXT, opened_on TEXT, closed_on TEXT, engagement_signed INTEGER DEFAULT 0, created_at TEXT
);
CREATE TABLE IF NOT EXISTS matter_team (matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), role TEXT, PRIMARY KEY (matter_id, user_id));
CREATE TABLE IF NOT EXISTS parties (id INTEGER PRIMARY KEY, matter_id INTEGER REFERENCES matters(id) ON DELETE CASCADE, intake_id INTEGER REFERENCES intakes(id) ON DELETE CASCADE, client_id INTEGER, name TEXT NOT NULL, norm TEXT NOT NULL, role TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_parties_norm ON parties(norm);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, matter_id INTEGER REFERENCES matters(id) ON DELETE CASCADE, intake_id INTEGER, kind TEXT NOT NULL, title TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT, location TEXT, user_id INTEGER, rule TEXT, done INTEGER DEFAULT 0, client_visible INTEGER DEFAULT 1, created_at TEXT);
CREATE INDEX IF NOT EXISTS ix_events_start ON events(start_at);
CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, matter_id INTEGER REFERENCES matters(id) ON DELETE CASCADE, title TEXT NOT NULL, assignee_id INTEGER, due_on TEXT, status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal', for_client INTEGER DEFAULT 0, created_by TEXT, created_at TEXT, done_at TEXT);
CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, matter_id INTEGER REFERENCES matters(id) ON DELETE CASCADE, user_id INTEGER, body TEXT NOT NULL, privileged INTEGER DEFAULT 1, created_at TEXT);

-- ---------------------------------------------------------------- time & billing
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY, matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), date TEXT NOT NULL, minutes INTEGER NOT NULL DEFAULT 0, activity TEXT,
  description TEXT, rate_cents INTEGER NOT NULL, billable INTEGER DEFAULT 1, invoice_id INTEGER, running_since TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_time_matter ON time_entries(matter_id); CREATE INDEX IF NOT EXISTS ix_time_user ON time_entries(user_id, date);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY, matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE, date TEXT NOT NULL, kind TEXT, description TEXT, amount_cents INTEGER NOT NULL, disbursement INTEGER DEFAULT 1, billable INTEGER DEFAULT 1, invoice_id INTEGER, from_trust INTEGER DEFAULT 0, created_by TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE, token TEXT UNIQUE, matter_id INTEGER NOT NULL REFERENCES matters(id), client_id INTEGER NOT NULL REFERENCES clients(id), issued_on TEXT, due_on TEXT,
  fees_cents INTEGER DEFAULT 0, discount_cents INTEGER DEFAULT 0, expenses_cents INTEGER DEFAULT 0, vat_cents INTEGER DEFAULT 0, total_cents INTEGER DEFAULT 0, paid_cents INTEGER DEFAULT 0, written_off_cents INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','partial','paid','void','written_off')), worked_cents INTEGER DEFAULT 0, note TEXT, created_by TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS invoice_lines (id INTEGER PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, kind TEXT NOT NULL, date TEXT, user_id INTEGER, description TEXT, minutes INTEGER, rate_cents INTEGER, amount_cents INTEGER NOT NULL, ref_id INTEGER);
CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), client_id INTEGER NOT NULL, date TEXT NOT NULL, amount_cents INTEGER NOT NULL, method TEXT, reference TEXT, from_trust INTEGER DEFAULT 0, created_by TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS trust (id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id), matter_id INTEGER REFERENCES matters(id), date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('deposit','disbursement','transfer','refund')), amount_cents INTEGER NOT NULL, description TEXT, reference TEXT, invoice_id INTEGER, cleared INTEGER DEFAULT 1, created_by TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS ix_trust_client ON trust(client_id, matter_id);

-- ---------------------------------------------------------------- documents, messages, content
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY, matter_id INTEGER REFERENCES matters(id) ON DELETE CASCADE, client_id INTEGER, name TEXT NOT NULL, kind TEXT, template TEXT, body TEXT, size_kb INTEGER, version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'filed' CHECK (status IN ('draft','filed','sent','signed','declined')), token TEXT UNIQUE, signer_name TEXT, signer_email TEXT, signature TEXT, signed_at TEXT, signed_ip TEXT,
  client_visible INTEGER DEFAULT 0, uploaded_by TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE, user_id INTEGER, from_client INTEGER DEFAULT 0, body TEXT NOT NULL, read_at TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT NOT NULL, area TEXT, dek TEXT, body TEXT, author_id INTEGER, published_on TEXT, minutes INTEGER);
`);

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = (d = new Date()) => `${dateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const now = () => stamp();
const today = () => dateStr();
const addDays = (s, n) => { const d = new Date(s.slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + n); return dateStr(d); };
const addMonths = (s, n) => { const d = new Date(s.slice(0, 10) + 'T12:00:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return dateStr(d); };
const addMinutes = (s, m) => { const d = new Date(s.replace(' ', 'T')); d.setMinutes(d.getMinutes() + m); return stamp(d); };
const toMin = (hm) => { const [h, m] = hm.slice(0, 5).split(':').map(Number); return h * 60 + m; };
const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dow = (s) => new Date(s.slice(0, 10) + 'T12:00:00').getDay();

function hashPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`; }
function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':'); if (!salt || !hash) return false;
  const a = crypto.scryptSync(pw, salt, 64), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const nz = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
const one = (sql, ...p) => db.prepare(sql).get(...nz(p));
const all = (sql, ...p) => db.prepare(sql).all(...nz(p));
const run = (sql, ...p) => db.prepare(sql).run(...nz(p));
let depth = 0;
function tx(fn) {
  const sp = `sp${depth}`;
  db.exec(depth === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`); depth++;
  try { const r = fn(); depth--; db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${sp}`); return r; }
  catch (e) { depth--; db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`); throw e; }
}
const token = () => crypto.randomBytes(18).toString('base64url');
const log = (ref, actor, action) => run('INSERT INTO activity (ref, actor, action, created_at) VALUES (?,?,?,?)', ref, actor, action, now());
const setting = (k, d) => { const r = one('SELECT value FROM settings WHERE key=?', k); return r ? r.value : d; };
const setSetting = (k, v) => run('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v));
const J = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };

module.exports = { db, one, all, run, tx, log, token, setting, setSetting, hashPassword, verifyPassword, now, today, stamp, dateStr, addDays, addMonths, addMinutes, toMin, hhmm, dow, J, DATA_DIR };
