// =========================================================================
// ADDERLEY MOSS — practice logic. Conflicts, intake → consult → matter,
// court-rule deadlines, timekeeping (6-minute units, timers), billing (hourly /
// fixed / capped, VAT on fees not disbursements), client trust accounting with
// three-way reconciliation, KYC/AML, templates & e-signature, reports.
// =========================================================================
const { one, all, run, tx, log, token, setting, now, today, addDays, addMonths, addMinutes, toMin, hhmm, dow, J } = require('./db');

const money = (c) => (c < 0 ? '−' : '') + 'B$' + (Math.abs(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const VAT = () => Number(setting('vat_rate', '0.10'));
const hrs = (m) => Math.round((m / 60) * 10) / 10;
function nextNumber(prefix, table, col = 'number', start = 1000) { const r = one(`SELECT ${col} AS n FROM ${table} WHERE ${col} LIKE ? ORDER BY id DESC LIMIT 1`, prefix + '%'); return prefix + String((r ? Number(String(r.n).slice(prefix.length)) || start : start) + 1).padStart(4, '0'); }
function notify({ client_id, to, kind, subject, body, channel = 'email' }) {
  const c = client_id ? one('SELECT * FROM clients WHERE id=?', client_id) : null;
  run('INSERT INTO outbox (client_id, channel, kind, recipient, subject, body, created_at) VALUES (?,?,?,?,?,?,?)', client_id || null, channel, kind, to || c?.email || null, subject || null, body, now());
}

// ------------------------------------------------------------ practice areas & stages
const AREAS = {
  corporate: { name: 'Corporate & Commercial', fee: 30000, stages: ['Instructions', 'Due diligence', 'Drafting', 'Negotiation', 'Execution', 'Post-completion'] },
  realestate: { name: 'Real Estate & Conveyancing', fee: 15000, stages: ['Instructions', 'Title search', 'Agreement for sale', 'Stamping & VAT', 'Completion', 'Recording'] },
  litigation: { name: 'Litigation & Disputes', fee: 35000, stages: ['Pre-action', 'Writ issued', 'Pleadings', 'Discovery', 'Trial preparation', 'Trial', 'Judgment', 'Appeal'] },
  private: { name: 'Wills, Trusts & Probate', fee: 0, stages: ['Instructions', 'Drafting', 'Execution / Grant applied', 'Administration', 'Distribution'] },
  family: { name: 'Family Law', fee: 25000, stages: ['Consultation', 'Petition filed', 'Interim orders', 'Settlement / Hearing', 'Decree'] },
  immigration: { name: 'Immigration & Work Permits', fee: 15000, stages: ['Instructions', 'Documents gathered', 'Submitted', 'Department review', 'Decision'] },
  financial: { name: 'Financial Services & Regulatory', fee: 40000, stages: ['Scoping', 'Application drafted', 'Filed with regulator', 'Regulator queries', 'Approval', 'Ongoing compliance'] },
  employment: { name: 'Employment', fee: 25000, stages: ['Advice', 'Grievance / negotiation', 'Tribunal filing', 'Hearing', 'Resolution'] },
};
const ACTIVITIES = ['Research', 'Drafting', 'Review', 'Correspondence', 'Telephone conference', 'Meeting', 'Court attendance', 'Travel', 'Filing', 'Negotiation', 'Due diligence', 'Preparation'];

// ------------------------------------------------------------ court-rule deadlines (verify against current rules)
const RULES = {
  ack_service: { label: 'Acknowledgment of service due', days: 14, from: 'service of writ' },
  defence: { label: 'Defence due', days: 28, from: 'service of writ' },
  reply: { label: 'Reply to defence due', days: 14, from: 'service of defence' },
  discovery: { label: 'List of documents due', days: 14, from: 'close of pleadings' },
  appeal_ca: { label: 'Notice of appeal — Court of Appeal', days: 42, from: 'judgment' },
  privy: { label: 'Application for leave — Privy Council', days: 21, from: 'Court of Appeal judgment' },
  limitation_contract: { label: 'Limitation — contract claim', years: 6, from: 'breach' },
  limitation_pi: { label: 'Limitation — personal injury', years: 3, from: 'injury / knowledge' },
  stamping: { label: 'Stamp & pay VAT on conveyance', days: 30, from: 'execution' },
  permit_renewal: { label: 'File work-permit renewal', days: -90, from: 'permit expiry' },
};
function computeDeadline(rule, base) {
  const r = RULES[rule]; if (!r) throw new Error('Unknown rule'); let d = r.years ? addMonths(base, r.years * 12) : addDays(base, r.days);
  while ([0, 6].includes(dow(d))) d = addDays(d, r.days < 0 ? -1 : 1); // never on a weekend — roll to the next (or previous) business day
  return d;
}
function addDeadline(matterId, rule, base, userId, actor) {
  const d = computeDeadline(rule, base), r = RULES[rule];
  const id = run('INSERT INTO events (matter_id, kind, title, start_at, user_id, rule, client_visible, created_at) VALUES (?,?,?,?,?,?,?,?)', matterId, rule.startsWith('limitation') ? 'limitation' : 'deadline', r.label, d + ' 17:00:00', userId, `${rule}: ${r.years ? r.years + ' years' : Math.abs(r.days) + ' days ' + (r.days < 0 ? 'before' : 'after')} ${r.from} (${base})`, 0, now()).lastInsertRowid;
  log('matter:' + matterId, actor, `Deadline: ${r.label} → ${d}`); return one('SELECT * FROM events WHERE id=?', id);
}

// ------------------------------------------------------------ conflicts
const SUFFIX = /\b(ltd|limited|inc|incorporated|llc|plc|co|company|corp|corporation|the|ibc|sa|bv|group|holdings?)\b/g;
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) { if (Math.abs(a.length - b.length) > 3) return 9; const d = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return d[b.length]; }
function similar(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const A = new Set(a.split(' ')), B = new Set(b.split(' ')), inter = [...A].filter((x) => B.has(x) || [...B].some((y) => y.length > 4 && lev(x, y) <= 1)).length;
  const jac = inter / new Set([...A, ...B]).size; return Math.max(jac, a.length > 5 && lev(a, b) <= 2 ? 0.9 : 0);
}
// adverse: names we'd act against. side: names on our client's side (the prospect, its owners/related parties)
function checkConflicts({ adverse = [], side = [] }) {
  const clients = all('SELECT id, name, number FROM clients'), parties = all("SELECT p.*, m.number AS matter_no, m.title AS matter_title, m.status AS matter_status, c.name AS client_name FROM parties p JOIN matters m ON m.id=p.matter_id JOIN clients c ON c.id=m.client_id WHERE p.role<>'client'");
  const hits = [];
  for (const raw of adverse.filter(Boolean)) { const n = norm(raw);
    for (const c of clients) { const s = similar(n, norm(c.name)); if (s >= 0.6) hits.push({ name: raw, matched: c.name, severity: s >= 0.9 ? 'direct' : 'potential', reason: `Proposed adverse party matches our client ${c.name} (${c.number})`, score: s }); }
    for (const p of parties.filter((x) => ['co-defendant', 'related'].includes(x.role))) { const s = similar(n, p.norm); if (s >= 0.75) hits.push({ name: raw, matched: p.name, severity: 'potential', reason: `Related to our client in ${p.matter_no} (${p.client_name})`, score: s }); } }
  for (const raw of side.filter(Boolean)) { const n = norm(raw);
    for (const p of parties.filter((x) => x.role === 'adverse')) { const s = similar(n, p.norm); if (s >= 0.6) hits.push({ name: raw, matched: p.name, severity: p.matter_status === 'closed' ? 'potential' : 'direct', reason: `We ${p.matter_status === 'closed' ? 'acted' : 'act'} against ${p.name} for ${p.client_name} in ${p.matter_no}`, score: s }); }
    for (const c of clients) { const s = similar(n, norm(c.name)); if (s >= 0.85) hits.push({ name: raw, matched: c.name, severity: 'info', reason: `Existing client ${c.number} — returning client`, score: s }); } }
  const seen = new Set(); return hits.sort((a, b) => b.score - a.score).filter((h) => { const k = h.name + '|' + h.matched; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20);
}

// ------------------------------------------------------------ intake & consultations
const CONSULT_MIN = 60;
function consultSlots(userId, date) {
  if ([0, 6].includes(dow(date)) || date < today()) return [];
  const busy = all("SELECT start_at, end_at FROM events WHERE user_id=? AND substr(start_at,1,10)=? AND done=0 AND kind IN ('hearing','meeting','consult')", userId, date);
  const out = []; const n = new Date(); for (let m = 9 * 60; m + CONSULT_MIN <= 17 * 60; m += 30) { if (m >= 12 * 60 + 30 && m < 13 * 60 + 30) continue;
    const s = `${date} ${hhmm(m)}:00`, e = addMinutes(s, CONSULT_MIN); if (date === today() && m < n.getHours() * 60 + n.getMinutes() + 180) continue;
    if (!busy.some((b) => s < (b.end_at || addMinutes(b.start_at, 60)) && b.start_at < e)) out.push(hhmm(m)); }
  return out;
}
function createIntake(b) {
  return tx(() => {
    const adverse = (b.adverse || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 12), related = (b.related || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
    const hits = checkConflicts({ adverse, side: [b.name, b.company, ...related].filter(Boolean) });
    const status = hits.some((h) => h.severity !== 'info') ? 'conflict_review' : 'cleared';
    const t = token(); const id = run('INSERT INTO intakes (number, token, name, email, phone, company, area, summary, adverse, related, urgency, budget, source, status, conflicts, consult_fee_cents, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      nextNumber('IN-', 'intakes', 'number', 5000), t, b.name, b.email || null, b.phone || null, b.company || null, b.area, b.summary || null, JSON.stringify(adverse), JSON.stringify(related), b.urgency || 'normal', b.budget || null, b.source || 'website', status, JSON.stringify(hits), AREAS[b.area]?.fee ?? 25000, b.created_at || now()).lastInsertRowid;
    for (const n of adverse) run('INSERT INTO parties (intake_id, name, norm, role) VALUES (?,?,?,?)', id, n, norm(n), 'adverse');
    log('intake:' + id, 'Website', `Intake received · conflict check: ${hits.length ? hits.length + ' hit(s)' : 'clear'}`);
    return one('SELECT * FROM intakes WHERE id=?', id);
  });
}
function bookConsult(intake, { user_id, date, time, mode = 'in_person', paid = false }, actor) {
  if (intake.status === 'conflict_review') throw new Error('This enquiry is with our conflicts team — we will contact you within one business day');
  if (intake.status === 'declined') throw new Error('We are unable to act in this matter');
  if (!consultSlots(user_id, date).includes(time)) throw new Error('That time was just taken — please choose another');
  if (intake.consult_fee_cents > 0 && !paid) throw new Error('The consultation fee is payable when booking');
  return tx(() => { const at = `${date} ${time}:00`, u = one('SELECT * FROM users WHERE id=?', user_id);
    run('INSERT INTO events (intake_id, kind, title, start_at, end_at, location, user_id, client_visible, created_at) VALUES (?,?,?,?,?,?,?,?,?)', intake.id, 'consult', `Consultation — ${intake.name}`, at, addMinutes(at, CONSULT_MIN), mode === 'video' ? 'Video (secure link)' : 'Chambers, Nassau', user_id, 1, now());
    run("UPDATE intakes SET status='consult_booked', consult_at=?, consult_user_id=?, consult_paid=?, consult_mode=? WHERE id=?", at, user_id, paid ? 1 : 0, mode, intake.id);
    notify({ to: intake.email, kind: 'consult', subject: 'Your consultation is confirmed', body: `Dear ${intake.name}, your consultation with ${u.name} is confirmed for ${at.slice(0, 16)} (${mode === 'video' ? 'secure video' : 'at our chambers'}). Details and documents to bring: ${setting('public_url', '')}/i/${intake.token}` });
    log('intake:' + intake.id, actor, `Consultation booked with ${u.name}`); return one('SELECT * FROM intakes WHERE id=?', intake.id); });
}
function convertIntake(intake, { responsible_id, title, billing = 'hourly', fixed_fee_cents, cap_cents, evergreen_cents = 0, client_id }, actor) {
  if (!['cleared', 'consult_booked'].includes(intake.status)) throw new Error('Clear conflicts before opening a matter');
  return tx(() => {
    let cid = client_id; if (!cid) { cid = run('INSERT INTO clients (number, kind, name, contact_name, email, phone, origin_id, created_at) VALUES (?,?,?,?,?,?,?,?)', nextNumber('C-', 'clients', 'number', 3000), intake.company ? 'company' : 'individual', intake.company || intake.name, intake.company ? intake.name : null, intake.email, intake.phone, intake.consult_user_id || responsible_id, now()).lastInsertRowid; requestKyc(cid); }
    const m = openMatter({ client_id: cid, title: title || `${AREAS[intake.area].name} — ${intake.company || intake.name}`, area: intake.area, responsible_id, originating_id: intake.consult_user_id || responsible_id, billing, fixed_fee_cents, cap_cents, evergreen_cents, description: intake.summary, adverse: J(intake.adverse, []) }, actor);
    run("UPDATE intakes SET status='converted', client_id=?, matter_id=? WHERE id=?", cid, m.id, intake.id);
    return m;
  });
}
function openMatter({ client_id, title, area, responsible_id, originating_id, billing = 'hourly', fixed_fee_cents, cap_cents, evergreen_cents = 0, description, adverse = [], court, case_no, opened_on }, actor) {
  if (!AREAS[area]) throw new Error('Choose a practice area');
  return tx(() => {
    const yr = (opened_on || today()).slice(0, 4), number = nextNumber(`AM-${yr}-`, 'matters', 'number', 0);
    const id = run('INSERT INTO matters (number, client_id, title, area, stage, responsible_id, originating_id, billing, fixed_fee_cents, cap_cents, evergreen_cents, description, court, case_no, opened_on, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      number, client_id, title, area, AREAS[area].stages[0], responsible_id, originating_id || responsible_id, billing, fixed_fee_cents || null, cap_cents || null, evergreen_cents || 0, description || null, court || null, case_no || null, opened_on || today(), now()).lastInsertRowid;
    run('INSERT INTO matter_team (matter_id, user_id, role) VALUES (?,?,?)', id, responsible_id, 'Responsible attorney');
    const c = one('SELECT * FROM clients WHERE id=?', client_id); run('INSERT INTO parties (matter_id, client_id, name, norm, role) VALUES (?,?,?,?,?)', id, client_id, c.name, norm(c.name), 'client');
    for (const n of adverse) run('INSERT INTO parties (matter_id, name, norm, role) VALUES (?,?,?,?)', id, n, norm(n), 'adverse');
    const m = one('SELECT * FROM matters WHERE id=?', id); generateDoc(m, 'engagement', actor, { send: !opened_on }); log('matter:' + id, actor, 'Matter opened'); return m;
  });
}
function setStage(m, stage, actor) { const st = AREAS[m.area].stages; if (!st.includes(stage)) throw new Error('Unknown stage'); run('UPDATE matters SET stage=? WHERE id=?', stage, m.id); log('matter:' + m.id, actor, 'Stage → ' + stage);
  notify({ client_id: m.client_id, kind: 'stage', subject: `Update on ${m.number}`, body: `Your matter "${m.title}" has moved to: ${stage}. Details in your client portal.` }); }

// ------------------------------------------------------------ KYC / AML
const KYC_REQ = { individual: [['passport', 'Passport or national ID'], ['address', 'Proof of address (≤ 3 months)'], ['funds', 'Source of funds declaration']], company: [['incorporation', 'Certificate of incorporation'], ['registers', 'Register of directors & shareholders'], ['ubo', 'Beneficial owner ID (25%+)'], ['funds', 'Source of funds declaration']] };
function requestKyc(clientId) { const c = one('SELECT * FROM clients WHERE id=?', clientId); for (const [k] of KYC_REQ[c.kind]) if (!one('SELECT 1 FROM kyc_docs WHERE client_id=? AND kind=?', clientId, k)) run("INSERT INTO kyc_docs (client_id, kind, status) VALUES (?,?,'requested')", clientId, k); run("UPDATE clients SET kyc_status='pending' WHERE id=?", clientId); }
function kycState(clientId) {
  const c = one('SELECT * FROM clients WHERE id=?', clientId), docs = all('SELECT * FROM kyc_docs WHERE client_id=? ORDER BY id', clientId), req = KYC_REQ[c.kind];
  const items = req.map(([k, label]) => { const d = docs.filter((x) => x.kind === k).pop(); return { kind: k, label, status: d?.status || 'requested', filename: d?.filename, expires_on: d?.expires_on, id: d?.id, expired: !!(d?.expires_on && d.expires_on < today()) }; });
  const refreshDue = c.kyc_verified_at ? addMonths(c.kyc_verified_at.slice(0, 10), c.risk === 'high' ? 12 : 24) : null;
  return { client: c, items, complete: items.every((i) => i.status === 'accepted' && !i.expired), refresh_due: refreshDue };
}
function uploadKyc(clientId, kind, filename, actor) { const d = one("SELECT * FROM kyc_docs WHERE client_id=? AND kind=? ORDER BY id DESC LIMIT 1", clientId, kind);
  if (d && d.status === 'requested') run("UPDATE kyc_docs SET filename=?, status='received', uploaded_at=? WHERE id=?", filename, now(), d.id); else run("INSERT INTO kyc_docs (client_id, kind, filename, status, uploaded_at) VALUES (?,?,?,'received',?)", clientId, kind, filename, now());
  run("UPDATE clients SET kyc_status=CASE WHEN kyc_status='verified' THEN kyc_status ELSE 'in_review' END WHERE id=?", clientId); log('client:' + clientId, actor, `KYC document received: ${kind}`); }
function reviewKyc(docId, ok, actor, { expires_on, note } = {}) {
  const d = one('SELECT * FROM kyc_docs WHERE id=?', docId); if (!d) throw new Error('Not found');
  run('UPDATE kyc_docs SET status=?, reviewed_by=?, expires_on=COALESCE(?,expires_on), note=? WHERE id=?', ok ? 'accepted' : 'rejected', actor, expires_on || null, note || null, docId);
  const st = kycState(d.client_id); if (st.complete) { run("UPDATE clients SET kyc_status='verified', kyc_verified_at=?, kyc_reviewer=? WHERE id=?", now(), actor, d.client_id); notify({ client_id: d.client_id, kind: 'kyc', subject: 'Identity verification complete', body: 'Thank you — your client due diligence is complete.' }); }
  else if (!ok) { run("UPDATE clients SET kyc_status='in_review' WHERE id=?", d.client_id); notify({ client_id: d.client_id, kind: 'kyc', subject: 'Please re-upload a document', body: `We could not accept your ${d.kind} document${note ? ': ' + note : ''}. Please upload a new copy in the portal.` }); }
  return st;
}

// ------------------------------------------------------------ time
const roundUp = (m) => Math.max(6, Math.ceil(m / 6) * 6); // tenth-of-an-hour units
function rateFor(userId, matter) { const u = one('SELECT rate_cents FROM users WHERE id=?', userId); return Math.round((u?.rate_cents || 0) * (1 - (matter.rate_discount_pct || 0) / 100)); }
function addTime({ matter_id, user_id, date, minutes, activity, description, billable = true }, actor) {
  const m = one('SELECT * FROM matters WHERE id=?', matter_id); if (!m) throw new Error('Matter not found'); if (m.status === 'closed') throw new Error('Matter is closed');
  if (!(minutes > 0)) throw new Error('Enter time'); if (!String(description || '').trim()) throw new Error('Describe the work — it appears on the bill');
  const id = run('INSERT INTO time_entries (matter_id, user_id, date, minutes, activity, description, rate_cents, billable, created_at) VALUES (?,?,?,?,?,?,?,?,?)', m.id, user_id, date || today(), roundUp(minutes), activity || null, String(description).slice(0, 600), rateFor(user_id, m), billable ? 1 : 0, now()).lastInsertRowid;
  return one('SELECT * FROM time_entries WHERE id=?', id);
}
function startTimer(userId, matterId, description) {
  return tx(() => { for (const t of all('SELECT * FROM time_entries WHERE user_id=? AND running_since IS NOT NULL', userId)) stopTimer(t);
    const m = one('SELECT * FROM matters WHERE id=?', matterId); if (!m || m.status === 'closed') throw new Error('Choose an open matter');
    const id = run('INSERT INTO time_entries (matter_id, user_id, date, minutes, description, rate_cents, running_since, created_at) VALUES (?,?,?,?,?,?,?,?)', m.id, userId, today(), 0, description || 'Work in progress', rateFor(userId, m), now(), now()).lastInsertRowid;
    return one('SELECT * FROM time_entries WHERE id=?', id); });
}
function stopTimer(t) { const el = Math.max(1, Math.round((Date.now() - new Date(t.running_since.replace(' ', 'T'))) / 60000)); run('UPDATE time_entries SET minutes=?, running_since=NULL WHERE id=?', roundUp(t.minutes + el), t.id); return one('SELECT * FROM time_entries WHERE id=?', t.id); }

// ------------------------------------------------------------ trust (client account)
const trustBal = (clientId, matterId) => one(`SELECT COALESCE(SUM(amount_cents),0) n FROM trust WHERE client_id=?${matterId ? ' AND matter_id=?' : ''}`, ...[clientId, matterId].filter(Boolean)).n;
function trustDeposit({ client_id, matter_id, amount_cents, reference, date, cleared = 1 }, actor) {
  const c = one('SELECT * FROM clients WHERE id=?', client_id); if (!c) throw new Error('Client not found');
  if (c.kyc_status !== 'verified') throw new Error('AML: client due diligence must be verified before we accept funds into the client account');
  if (!(amount_cents > 0)) throw new Error('Enter an amount');
  const id = run('INSERT INTO trust (client_id, matter_id, date, kind, amount_cents, description, reference, cleared, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', client_id, matter_id || null, date || today(), 'deposit', amount_cents, 'Funds received on account', reference || null, cleared ? 1 : 0, actor, now()).lastInsertRowid;
  if (!date) notify({ client_id, kind: 'trust', subject: 'Funds received into client account', body: `We received ${money(amount_cents)} into our client account for your matter. Ref ${reference || '—'}.` });
  return one('SELECT * FROM trust WHERE id=?', id);
}
function trustDisburse({ client_id, matter_id, amount_cents, description, kind = 'disbursement', invoice_id, reference, date, cleared = 1 }, actor) {
  if (!(amount_cents > 0)) throw new Error('Enter an amount'); const bal = trustBal(client_id, matter_id);
  if (amount_cents > bal) throw new Error(`Insufficient client funds on this matter (${money(bal)} available) — the client account can never go overdrawn`);
  return run('INSERT INTO trust (client_id, matter_id, date, kind, amount_cents, description, reference, invoice_id, cleared, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', client_id, matter_id, date || today(), kind, -amount_cents, description, reference || null, invoice_id || null, cleared ? 1 : 0, actor, now()).lastInsertRowid;
}
function reconciliation() {
  const book = one('SELECT COALESCE(SUM(amount_cents),0) n FROM trust').n;
  const ledgers = all("SELECT t.client_id, t.matter_id, c.name, c.number AS client_no, m.number AS matter_no, m.title, SUM(t.amount_cents) AS bal, MAX(t.date) AS last FROM trust t JOIN clients c ON c.id=t.client_id LEFT JOIN matters m ON m.id=t.matter_id GROUP BY t.client_id, t.matter_id HAVING bal<>0 ORDER BY bal DESC");
  const intransit = all("SELECT t.*, c.name FROM trust t JOIN clients c ON c.id=t.client_id WHERE cleared=0 AND amount_cents>0"), outstanding = all("SELECT t.*, c.name FROM trust t JOIN clients c ON c.id=t.client_id WHERE cleared=0 AND amount_cents<0");
  const bank = Number(setting('trust_bank_balance', '0')), bankDate = setting('trust_bank_date', today());
  const adjusted = bank + intransit.reduce((s, t) => s + t.amount_cents, 0) + outstanding.reduce((s, t) => s + t.amount_cents, 0), clientsTotal = ledgers.reduce((s, l) => s + l.bal, 0);
  return { bank_cents: bank, bank_date: bankDate, deposits_in_transit: intransit, outstanding, adjusted_bank_cents: adjusted, book_cents: book, client_ledgers_cents: clientsTotal, negative: ledgers.filter((l) => l.bal < 0), ledgers, balanced: adjusted === book && book === clientsTotal };
}

// ------------------------------------------------------------ billing
function unbilled(matterId) {
  return { time: all('SELECT t.*, u.name AS user FROM time_entries t JOIN users u ON u.id=t.user_id WHERE t.matter_id=? AND t.invoice_id IS NULL AND t.running_since IS NULL AND t.minutes>0 ORDER BY t.date, t.id', matterId), expenses: all('SELECT * FROM expenses WHERE matter_id=? AND invoice_id IS NULL AND billable=1 AND from_trust=0 ORDER BY date', matterId) };
}
function createInvoice(matterId, actor, { through, date } = {}) {
  return tx(() => {
    const m = one('SELECT * FROM matters WHERE id=?', matterId), u = unbilled(matterId), t = (through ? u.time.filter((x) => x.date <= through) : u.time), ex = (through ? u.expenses.filter((x) => x.date <= through) : u.expenses);
    const billedFees = one("SELECT COALESCE(SUM(fees_cents - discount_cents),0) n FROM invoices WHERE matter_id=? AND status NOT IN ('void','draft')", m.id).n;
    if (!t.length && !ex.length && !(m.billing === 'fixed' && billedFees < m.fixed_fee_cents)) throw new Error('Nothing to bill on this matter');
    const id = run('INSERT INTO invoices (number, token, matter_id, client_id, status, created_by, created_at) VALUES (?,?,?,?,?,?,?)', nextNumber('INV-', 'invoices', 'number', 20000), token(), m.id, m.client_id, 'draft', actor, (date || today()) + ' 09:00:00').lastInsertRowid;
    const worked = t.filter((x) => x.billable).reduce((s, x) => s + Math.round((x.minutes / 60) * x.rate_cents), 0);
    let fees = 0, discount = 0;
    for (const x of t) { const amt = x.billable ? Math.round((x.minutes / 60) * x.rate_cents) : 0; run('INSERT INTO invoice_lines (invoice_id, kind, date, user_id, description, minutes, rate_cents, amount_cents, ref_id) VALUES (?,?,?,?,?,?,?,?,?)', id, 'time', x.date, x.user_id, x.description + (x.billable ? '' : ' (no charge)'), x.minutes, x.rate_cents, m.billing === 'fixed' ? 0 : amt, x.id); run('UPDATE time_entries SET invoice_id=? WHERE id=?', id, x.id); if (m.billing !== 'fixed') fees += amt; }
    if (m.billing === 'fixed') { const f = Math.max(0, m.fixed_fee_cents - billedFees); if (f) { run('INSERT INTO invoice_lines (invoice_id, kind, description, amount_cents) VALUES (?,?,?,?)', id, 'fixed', `Agreed fixed fee — ${m.title}`, f); fees = f; } }
    if (m.billing === 'capped' && m.cap_cents) { const room = Math.max(0, m.cap_cents - billedFees); if (fees > room) { discount = fees - room; run('INSERT INTO invoice_lines (invoice_id, kind, description, amount_cents) VALUES (?,?,?,?)', id, 'discount', `Fee cap applied (agreed cap ${money(m.cap_cents)})`, -discount); } }
    let exp = 0, vatable = fees - discount; for (const e of ex) { run('INSERT INTO invoice_lines (invoice_id, kind, date, description, amount_cents, ref_id) VALUES (?,?,?,?,?,?)', id, e.disbursement ? 'disbursement' : 'expense', e.date, e.description, e.amount_cents, e.id); run('UPDATE expenses SET invoice_id=? WHERE id=?', id, e.id); exp += e.amount_cents; if (!e.disbursement) vatable += e.amount_cents; }
    const vat = Math.round(vatable * VAT()), total = fees - discount + exp + vat;
    run('UPDATE invoices SET fees_cents=?, discount_cents=?, expenses_cents=?, vat_cents=?, total_cents=?, worked_cents=? WHERE id=?', fees, discount, exp, vat, total, m.billing === 'fixed' ? worked : worked, id);
    log('invoice:' + id, actor, 'Pre-bill created'); return invoiceFull(id);
  });
}
function issueInvoice(inv, actor, { date, apply_trust = false } = {}) {
  if (inv.status !== 'draft') throw new Error('Only drafts can be issued');
  return tx(() => { const d = date || today(); run("UPDATE invoices SET status='issued', issued_on=?, due_on=? WHERE id=?", d, addDays(d, 30), inv.id);
    if (!date) notify({ client_id: inv.client_id, kind: 'invoice', subject: `Invoice ${inv.number}`, body: `Your invoice ${inv.number} for ${money(inv.total_cents)} is ready. View and pay securely: ${setting('public_url', '')}/pay/${inv.token}` });
    if (apply_trust) { const avail = trustBal(inv.client_id, inv.matter_id); if (avail > 0) payInvoice(one('SELECT * FROM invoices WHERE id=?', inv.id), { amount_cents: Math.min(avail, inv.total_cents), method: 'trust', from_trust: true, date: date || undefined }, actor); }
    log('invoice:' + inv.id, actor, 'Issued'); return invoiceFull(inv.id); });
}
function payInvoice(inv, { amount_cents, method = 'card', reference, from_trust = false, date }, actor) {
  if (!['issued', 'partial'].includes(inv.status)) throw new Error('Invoice is not open');
  const due = inv.total_cents - inv.paid_cents - inv.written_off_cents; const amt = Math.min(Math.round(amount_cents), due); if (!(amt > 0)) throw new Error('Enter an amount');
  return tx(() => {
    if (from_trust) { trustDisburse({ client_id: inv.client_id, matter_id: inv.matter_id, amount_cents: amt, kind: 'transfer', invoice_id: inv.id, description: `Transfer to office account — ${inv.number}`, date }, actor); }
    run('INSERT INTO payments (invoice_id, client_id, date, amount_cents, method, reference, from_trust, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)', inv.id, inv.client_id, date || today(), amt, from_trust ? 'trust' : method, reference || null, from_trust ? 1 : 0, actor, now());
    const paid = inv.paid_cents + amt; run('UPDATE invoices SET paid_cents=?, status=? WHERE id=?', paid, paid + inv.written_off_cents >= inv.total_cents ? 'paid' : 'partial', inv.id);
    if (from_trust) { const m = one('SELECT * FROM matters WHERE id=?', inv.matter_id), left = trustBal(inv.client_id, inv.matter_id); if (m.evergreen_cents && left < m.evergreen_cents && !date) notify({ client_id: inv.client_id, kind: 'replenish', subject: 'Please replenish your retainer', body: `Following payment of ${inv.number} from client funds, your retainer balance is ${money(left)}. Your engagement provides for a ${money(m.evergreen_cents)} evergreen retainer — please top up ${money(m.evergreen_cents - left)}.` }); }
    else if (!date) notify({ client_id: inv.client_id, kind: 'receipt', subject: `Payment received — ${inv.number}`, body: `Thank you. We received ${money(amt)}.` });
    return invoiceFull(inv.id);
  });
}
function invoiceFull(id) {
  const i = one('SELECT i.*, m.number AS matter_no, m.title AS matter_title, m.billing, c.name AS client, c.address, c.email FROM invoices i JOIN matters m ON m.id=i.matter_id JOIN clients c ON c.id=i.client_id WHERE i.id=?', id); if (!i) return null;
  return { ...i, lines: all('SELECT l.*, u.name AS user FROM invoice_lines l LEFT JOIN users u ON u.id=l.user_id WHERE invoice_id=? ORDER BY CASE kind WHEN \'fixed\' THEN 0 WHEN \'time\' THEN 1 WHEN \'discount\' THEN 2 ELSE 3 END, date, id', id), payments: all('SELECT * FROM payments WHERE invoice_id=? ORDER BY date', id), balance_cents: i.total_cents - i.paid_cents - i.written_off_cents, trust_available_cents: trustBal(i.client_id, i.matter_id) };
}
function voidInvoice(inv, actor) { if (inv.paid_cents) throw new Error('Invoices with payments cannot be voided — issue a credit instead'); tx(() => { run("UPDATE invoices SET status='void' WHERE id=?", inv.id); run('UPDATE time_entries SET invoice_id=NULL WHERE invoice_id=?', inv.id); run('UPDATE expenses SET invoice_id=NULL WHERE invoice_id=?', inv.id); log('invoice:' + inv.id, actor, 'Voided — entries released'); }); }
function writeOff(inv, amount_cents, actor) { const due = inv.total_cents - inv.paid_cents - inv.written_off_cents; const a = Math.min(due, Math.round(amount_cents)); if (!(a > 0)) throw new Error('Nothing to write off'); run('UPDATE invoices SET written_off_cents=written_off_cents+?, status=CASE WHEN paid_cents + written_off_cents + ? >= total_cents THEN (CASE WHEN paid_cents>0 THEN \'paid\' ELSE \'written_off\' END) ELSE status END WHERE id=?', a, a, inv.id); log('invoice:' + inv.id, actor, `Wrote off ${money(a)}`); }
function arAging(clientId) {
  const rows = all(`SELECT i.*, c.name AS client, m.number AS matter_no FROM invoices i JOIN clients c ON c.id=i.client_id JOIN matters m ON m.id=i.matter_id WHERE i.status IN ('issued','partial') ${clientId ? 'AND i.client_id=' + Number(clientId) : ''}`);
  const b = { current: 0, d30: 0, d60: 0, d90: 0 }, t = new Date(today() + 'T12:00:00');
  for (const r of rows) { const open = r.total_cents - r.paid_cents - r.written_off_cents, d = (t - new Date(r.due_on + 'T12:00:00')) / 864e5; b[d > 60 ? 'd90' : d > 30 ? 'd60' : d > 0 ? 'd30' : 'current'] += open; r.open_cents = open; r.days_over = Math.max(0, Math.round(d)); }
  return { buckets: b, rows: rows.sort((a, z) => z.days_over - a.days_over), total: Object.values(b).reduce((s, v) => s + v, 0) };
}
function matterFinancials(id) {
  const m = one('SELECT * FROM matters WHERE id=?', id), u = unbilled(id);
  const wip = u.time.filter((x) => x.billable).reduce((s, x) => s + Math.round((x.minutes / 60) * x.rate_cents), 0) + u.expenses.reduce((s, e) => s + e.amount_cents, 0);
  const billed = one("SELECT COALESCE(SUM(fees_cents - discount_cents),0) f, COALESCE(SUM(total_cents),0) t, COALESCE(SUM(paid_cents),0) p, COALESCE(SUM(worked_cents),0) w FROM invoices WHERE matter_id=? AND status NOT IN ('void','draft')", id);
  const hours = one('SELECT COALESCE(SUM(minutes),0) n FROM time_entries WHERE matter_id=?', id).n;
  return { wip_cents: wip, unbilled_minutes: u.time.reduce((s, x) => s + x.minutes, 0), billed_fees_cents: billed.f, billed_total_cents: billed.t, collected_cents: billed.p, outstanding_cents: billed.t - billed.p, realization: billed.w ? billed.f / billed.w : null, hours: hrs(hours), trust_cents: trustBal(m.client_id, id), budget_used: m.budget_cents ? (billed.f + wip) / m.budget_cents : null };
}

// ------------------------------------------------------------ documents & e-signature
const TEMPLATES = {
  engagement: { name: 'Letter of engagement', sign: true },
  fee_estimate: { name: 'Fee estimate', sign: false },
  demand: { name: 'Letter before action', sign: false },
  poa: { name: 'Power of attorney', sign: true },
  resolution: { name: 'Board resolution', sign: true },
  will_instructions: { name: 'Will instructions confirmation', sign: true },
};
function renderTemplate(kind, m, extra = {}) {
  const c = one('SELECT * FROM clients WHERE id=?', m.client_id), u = one('SELECT * FROM users WHERE id=?', m.responsible_id), firm = setting('firm_name', 'ADDERLEY MOSS'), d = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const fee = m.billing === 'fixed' ? `a fixed fee of ${money(m.fixed_fee_cents)} plus VAT and disbursements` : m.billing === 'capped' ? `our hourly rates, capped at ${money(m.cap_cents)} plus VAT and disbursements` : `our hourly rates (${u.name}: ${money(u.rate_cents)} per hour; associates and paralegals at lower rates), recorded in six-minute units`;
  const adverse = all("SELECT name FROM parties WHERE matter_id=? AND role='adverse'", m.id).map((x) => x.name);
  const T = {
    engagement: `${firm}\nCounsel & Attorneys-at-Law\n\n${d}\n\n${c.name}${c.address ? '\n' + c.address : ''}\n\nRe: ${m.title} (our ref ${m.number})\n\n1. Scope. You have instructed us to act in ${AREAS[m.area].name.toLowerCase()} matters described as: ${m.description || m.title}.${adverse.length ? ' The other parties are ' + adverse.join(', ') + '. We have checked for conflicts of interest and found none that prevent us acting.' : ''}\n\n2. Responsibility. ${u.name} (${u.title}) is responsible for this matter, supported by the team named in your client portal.\n\n3. Fees. We will charge ${fee}. VAT is charged at ${Math.round(VAT() * 100)}% on fees. Disbursements such as court fees and stamp duty are passed through at cost.\n\n4. Client account. ${m.evergreen_cents ? `You agree to keep ${money(m.evergreen_cents)} on account in our client (trust) account and authorise us to transfer funds to pay our invoices when issued.` : 'Any money you send on account is held in our client (trust) account and used only for this matter.'}\n\n5. Due diligence. The law requires us to verify your identity and the source of funds before we accept money or complete transactions.\n\n6. Communication. We will update you at each stage through your secure client portal.\n\n7. Termination. You may end this engagement at any time; fees for work done up to that date remain payable.\n\nSigned for ${firm}: ${u.name}\n\nI agree to these terms.`,
    fee_estimate: `${firm}\n\nFee estimate — ${m.title} (${m.number})\n\nBased on the information available today we estimate our fees at ${money(extra.estimate_cents || m.budget_cents || 0)} plus VAT and disbursements. We will tell you promptly if this changes.`,
    demand: `${firm}\n\n${d}\n\nTo: ${adverse[0] || '[other party]'}\n\nLetter before action — ${m.title}\n\nWe act for ${c.name}. ${extra.facts || 'Our client has a claim against you.'} Unless you pay ${extra.amount ? money(extra.amount) : 'the sum due'} within 14 days of this letter, our client will issue proceedings in the Supreme Court without further notice and seek costs.\n\nYours faithfully,\n${u.name}\n${firm}`,
    poa: `POWER OF ATTORNEY\n\nI, ${c.name}, appoint ${extra.attorney_in_fact || '[name]'} to act on my behalf in connection with ${m.title}.`,
    resolution: `WRITTEN RESOLUTION OF THE DIRECTORS OF ${c.name.toUpperCase()}\n\nIT IS RESOLVED that the company enter into the transaction described as ${m.title}, and that any director be authorised to sign all documents required.`,
    will_instructions: `Confirmation of will instructions — ${c.name}\n\nYou have asked us to prepare a will on the terms set out in the attached schedule. Please confirm these instructions are complete and correct.`,
  };
  return T[kind];
}
function generateDoc(m, kind, actor, { send = false, extra } = {}) {
  const t = TEMPLATES[kind]; if (!t) throw new Error('Unknown template'); const body = renderTemplate(kind, m, extra || {});
  const id = run('INSERT INTO documents (matter_id, client_id, name, kind, template, body, size_kb, status, token, client_visible, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', m.id, m.client_id, `${t.name} — ${m.number}`, 'generated', kind, body, Math.round(body.length / 900) + 18, 'draft', token(), 0, actor, now()).lastInsertRowid;
  const d = one('SELECT * FROM documents WHERE id=?', id); if (send && t.sign) sendForSignature(d, actor); return one('SELECT * FROM documents WHERE id=?', id);
}
function sendForSignature(d, actor) { const c = one('SELECT * FROM clients WHERE id=?', d.client_id); run("UPDATE documents SET status='sent', client_visible=1, signer_name=?, signer_email=? WHERE id=?", c.contact_name || c.name, c.email, d.id);
  notify({ client_id: d.client_id, kind: 'esign', subject: `Please review and sign: ${d.name}`, body: `Your document is ready to sign securely: ${setting('public_url', '')}/sign/${d.token}` }); log('doc:' + d.id, actor, 'Sent for signature'); }
function signDoc(d, { signature, name, ip }) {
  if (d.status !== 'sent') throw new Error(d.status === 'signed' ? 'Already signed' : 'This document is not awaiting signature');
  if (!signature || !String(name || '').trim()) throw new Error('Draw your signature and type your full name');
  return tx(() => { run("UPDATE documents SET status='signed', signature=?, signer_name=?, signed_at=?, signed_ip=? WHERE id=?", String(signature).slice(0, 200000), String(name).trim().slice(0, 80), now(), ip || null, d.id);
    if (d.template === 'engagement') { run('UPDATE matters SET engagement_signed=1 WHERE id=?', d.matter_id); const m = one('SELECT * FROM matters WHERE id=?', d.matter_id); if (m.stage === AREAS[m.area].stages[0]) run('UPDATE matters SET stage=? WHERE id=?', AREAS[m.area].stages[1], m.id); }
    log('doc:' + d.id, name, 'Signed electronically'); return one('SELECT * FROM documents WHERE id=?', d.id); });
}

// ------------------------------------------------------------ public estimators
function conveyancingEstimate({ price_cents, side = 'buyer', mortgage = false, first_home = false }) {
  const tiers = [[10000000, 2.5], [30000000, 4], [50000000, 6], [Infinity, 10]], p = price_cents; let rate = tiers.find(([cap]) => p <= cap)[1];
  let duty = Math.round((p * rate) / 100); if (first_home && side === 'buyer') { const exempt = Math.round((Math.min(p, 50000000) * rate) / 100); duty = Math.max(0, duty - exempt); }
  const share = Math.round(duty / 2), legal = Math.round(p * 0.025), lines = [{ label: `Real property transfer tax (${rate}%, customarily split)`, cents: share, vat: false }, { label: 'Legal fees (2.5% of price)', cents: legal, vat: true }, { label: `VAT on legal fees (${Math.round(VAT() * 100)}%)`, cents: Math.round(legal * VAT()), vat: false }, { label: 'Searches, recording & registry', cents: side === 'buyer' ? 150000 : 50000, vat: false }];
  if (mortgage && side === 'buyer') lines.push({ label: 'Mortgage documentation (est.)', cents: Math.round(p * 0.01), vat: false });
  return { lines, total_cents: lines.reduce((s, l) => s + l.cents, 0), note: first_home ? 'First-home exemption applied to the first B$500,000 (Bahamian citizens).' : null };
}
const PACKAGES = [
  { key: 'ibc', area: 'corporate', name: 'IBC incorporation', fixed: 185000, includes: ['Name search & reservation', 'Memorandum & articles', 'Registered office & agent for year one', 'Register of members & directors', 'Government filing fees (est.)'] },
  { key: 'will', area: 'private', name: 'Will (individual)', fixed: 95000, includes: ['Instructions meeting', 'Drafting & one round of revisions', 'Signing ceremony with witnesses', 'Safe custody of the original'] },
  { key: 'mirror_wills', area: 'private', name: 'Mirror wills (couple)', fixed: 160000, includes: ['Two wills', 'Guardianship clauses', 'Signing & safe custody'] },
  { key: 'work_permit', area: 'immigration', name: 'Work permit application', fixed: 125000, includes: ['Eligibility review', 'Labour certificate guidance', 'Application & submissions', 'Follow-up with the Department'] },
  { key: 'probate', area: 'private', name: 'Grant of probate (uncontested)', fixed: 450000, includes: ['Estate inventory', 'Oath & application', 'Advertisement', 'Obtaining the grant'] },
  { key: 'uncontested_divorce', area: 'family', name: 'Uncontested divorce', fixed: 350000, includes: ['Petition & filings', 'Settlement agreement', 'Attendance at hearing', 'Decree absolute'] },
];

// ------------------------------------------------------------ reports
function reports(from, to) {
  const toE = to + ' 23:59:59', days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1, workDays = Math.round((days * 5) / 7);
  const people = all("SELECT id, name, role, title, color, rate_cents, target_hours FROM users WHERE role IN ('managing_partner','partner','associate','paralegal') AND active=1 ORDER BY rate_cents DESC").map((u) => {
    const t = one('SELECT COALESCE(SUM(CASE WHEN billable=1 THEN minutes END),0) b, COALESCE(SUM(CASE WHEN billable=0 THEN minutes END),0) nb, COALESCE(SUM(CASE WHEN billable=1 THEN minutes*rate_cents/60.0 END),0) v FROM time_entries WHERE user_id=? AND date BETWEEN ? AND ?', u.id, from, to);
    const billed = one("SELECT COALESCE(SUM(l.amount_cents),0) n, COALESCE(SUM(l.minutes*l.rate_cents/60.0),0) w FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id JOIN matters m ON m.id=i.matter_id WHERE l.user_id=? AND l.kind='time' AND m.billing<>'fixed' AND i.status NOT IN ('void','draft') AND i.issued_on BETWEEN ? AND ?", u.id, from, to);
    const orig = one("SELECT COALESCE(SUM(p.amount_cents),0) n FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN matters m ON m.id=i.matter_id WHERE m.originating_id=? AND p.date BETWEEN ? AND ?", u.id, from, to).n;
    const target = (u.target_hours / 260) * workDays;
    return { ...u, billable_h: hrs(t.b), nonbillable_h: hrs(t.nb), worked_cents: Math.round(t.v), target_h: Math.round(target), utilization: target ? hrs(t.b) / target : 0, realization: billed.w ? billed.n / billed.w : null, origination_cents: orig };
  });
  const inv = one("SELECT COALESCE(SUM(fees_cents - discount_cents),0) fees, COALESCE(SUM(total_cents),0) total, COUNT(*) n FROM invoices WHERE status NOT IN ('void','draft') AND issued_on BETWEEN ? AND ?", from, to);
  const coll = one("SELECT COALESCE(SUM(amount_cents),0) n FROM payments WHERE date BETWEEN ? AND ?", from, to).n;
  const worked = one('SELECT COALESCE(SUM(minutes*rate_cents/60.0),0) n FROM time_entries WHERE billable=1 AND date BETWEEN ? AND ?', from, to).n;
  const byArea = Object.entries(AREAS).map(([k, a]) => ({ key: k, name: a.name, opened: one('SELECT COUNT(*) n FROM matters WHERE area=? AND opened_on BETWEEN ? AND ?', k, from, to).n, open: one("SELECT COUNT(*) n FROM matters WHERE area=? AND status='open'", k).n,
    fees_cents: one("SELECT COALESCE(SUM(i.fees_cents - i.discount_cents),0) n FROM invoices i JOIN matters m ON m.id=i.matter_id WHERE m.area=? AND i.status NOT IN ('void','draft') AND i.issued_on BETWEEN ? AND ?", k, from, to).n })).sort((a, b) => b.fees_cents - a.fees_cents);
  const wipRows = all("SELECT t.date, t.minutes*t.rate_cents/60.0 AS v FROM time_entries t WHERE t.invoice_id IS NULL AND t.billable=1 AND t.running_since IS NULL"), wip = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const w of wipRows) { const d = (Date.now() - new Date(w.date + 'T12:00:00')) / 864e5; wip[d > 90 ? 'd90' : d > 60 ? 'd60' : d > 30 ? 'd30' : 'current'] += Math.round(w.v); }
  const funnel = one(`SELECT COUNT(*) n, SUM(status IN ('cleared','consult_booked','converted')) cleared, SUM(status IN ('consult_booked','converted')) consult, SUM(status='converted') converted, SUM(status='declined') declined FROM intakes WHERE created_at BETWEEN ? AND ?`, from, toE);
  const top = all("SELECT m.id, m.number, m.title, c.name AS client, SUM(i.fees_cents - i.discount_cents) AS fees FROM invoices i JOIN matters m ON m.id=i.matter_id JOIN clients c ON c.id=m.client_id WHERE i.status NOT IN ('void','draft') AND i.issued_on BETWEEN ? AND ? GROUP BY m.id ORDER BY fees DESC LIMIT 8", from, to);
  const monthly = all("SELECT substr(issued_on,1,7) AS ym, SUM(fees_cents - discount_cents) AS fees FROM invoices WHERE status NOT IN ('void','draft') AND issued_on >= ? GROUP BY ym ORDER BY ym", addMonths(today(), -12).slice(0, 7) + '-01');
  const coll12 = all("SELECT substr(date,1,7) AS ym, SUM(amount_cents) AS n FROM payments WHERE date >= ? GROUP BY ym ORDER BY ym", addMonths(today(), -12).slice(0, 7) + '-01');
  return { from, to, people, billed_fees_cents: inv.fees, billed_total_cents: inv.total, invoices: inv.n, collected_cents: coll, worked_cents: Math.round(worked), realization: worked ? inv.fees / worked : 0, collection_rate: inv.total ? coll / inv.total : 0, by_area: byArea, wip, wip_total: Object.values(wip).reduce((s, v) => s + v, 0), ar: arAging(), funnel, top, monthly, coll12, trust_cents: one('SELECT COALESCE(SUM(amount_cents),0) n FROM trust').n };
}

module.exports = { money, VAT, hrs, nextNumber, notify, AREAS, ACTIVITIES, RULES, computeDeadline, addDeadline, norm, similar, checkConflicts, consultSlots, createIntake, bookConsult, convertIntake, openMatter, setStage,
  KYC_REQ, requestKyc, kycState, uploadKyc, reviewKyc, roundUp, rateFor, addTime, startTimer, stopTimer, trustBal, trustDeposit, trustDisburse, reconciliation, unbilled, createInvoice, issueInvoice, payInvoice, invoiceFull,
  voidInvoice, writeOff, arAging, matterFinancials, TEMPLATES, renderTemplate, generateDoc, sendForSignature, signDoc, conveyancingEstimate, PACKAGES, reports };
