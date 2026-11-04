// ADDERLEY MOSS — demo firm. ~30 months of practice generated through the real
// engine: matters opened with engagement letters, time recorded by the team,
// monthly bills built from WIP, payments and trust transfers, reconciliation.
const { one, all, run, tx, hashPassword, now, today, addDays, addMonths, dow, setSetting, token } = require('./db');
const L = require('./logic');

let s0 = 19740611; const rnd = () => ((s0 = (s0 * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)], between = (a, b) => a + Math.floor(rnd() * (b - a + 1)), chance = (p) => rnd() < p;
const FIRST = ['Andre', 'Natasha', 'Kevin', 'Simone', 'Darren', 'Latoya', 'Philip', 'Monique', 'Gregory', 'Shantell', 'Craig', 'Dionne', 'Leon', 'Tiffany', 'Ricardo', 'Keva', 'Brent', 'Alexis', 'Neil', 'Charmaine', 'Owen', 'Valencia', 'Stephen', 'Krystal', 'Jerome', 'Patrice', 'Martin', 'Daphne', 'Elliot', 'Rochelle', 'Hugh', 'Sasha', 'Victor', 'Lorraine', 'Graham', 'Ingrid'];
const LAST = ['Rolle', 'Ferguson', 'Smith', 'Johnson', 'Thompson', 'Knowles', 'Pinder', 'Bethel', 'Sands', 'Moxey', 'Cartwright', 'Russell', 'Strachan', 'McKinney', 'Saunders', 'Albury', 'Curry', 'Deveaux', 'Bowe', 'Brown', 'Taylor', 'Wilson', 'Williams', 'Major', 'Darville', 'Hanna', 'Gibson', 'Lightbourne', 'Munnings', 'Symonette', 'Butler', 'Fox', 'Higgs', 'Kemp', 'Lockhart', 'Turnquest'];
const CO_A = ['Coral', 'Harbour', 'Atlantic', 'Lucayan', 'Exuma', 'Sapphire', 'Pelican', 'Conch', 'Windward', 'Palmetto', 'Blue Hole', 'Tradewinds', 'Bimini', 'Cable Bay', 'Montagu', 'Clifton', 'Sandyport', 'Andros', 'Seabreeze', 'Old Fort', 'Westward', 'Long Cay'];
const CO_B = ['Holdings', 'Developments', 'Marine Services', 'Capital', 'Construction', 'Hospitality', 'Logistics', 'Realty', 'Energy', 'Trading', 'Insurance Brokers', 'Fisheries', 'Resorts', 'Shipping', 'Ventures', 'Medical Group', 'Telecom', 'Foods'];
const CO_C = ['Ltd.', 'Limited', 'IBC', 'Ltd.', 'Co. Ltd.'];

function seed({ reset = false } = {}) {
  if (one('SELECT 1 FROM users LIMIT 1')) { if (!reset) return false;
    for (const t of ['messages', 'documents', 'payments', 'invoice_lines', 'invoices', 'trust', 'expenses', 'time_entries', 'notes', 'tasks', 'events', 'parties', 'matter_team', 'matters', 'kyc_docs', 'intakes', 'clients', 'articles', 'outbox', 'activity', 'sessions', 'users', 'settings']) run(`DELETE FROM ${t}`); }
  const t0 = Date.now(), T = (l) => process.env.SEED_TIMING && console.log(l.padEnd(12), ((Date.now() - t0) / 1000).toFixed(1));
  tx(() => {
    for (const [k, v] of Object.entries({ firm_name: 'ADDERLEY MOSS', firm_long: 'Adderley Moss · Counsel & Attorneys-at-Law', address: 'Moss Chambers, 14 Shirley Street, Nassau, N.P., The Bahamas', address2: 'Freeport office: Regent Centre, Grand Bahama', phone: '(242) 555-0114', email: 'chambers@adderleymoss.bs', vat_rate: '0.10', public_url: process.env.PUBLIC_URL || '', est: '1974' })) setSetting(k, v);
    const user = (email, pw, role, name, o = {}) => run('INSERT INTO users (email,password_hash,role,name,slug,title,rate_cents,target_hours,color,bar_year,education,languages,areas,bio,admissions,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', email, hashPassword(pw), role, name, name.toLowerCase().replace(/[^a-z]+/g, '-'), o.title || null, o.rate || 0, o.target || 0, o.color || '#111', o.bar || null, JSON.stringify(o.edu || []), o.lang || 'English', JSON.stringify(o.areas || []), o.bio || null, o.adm || 'The Bahamas', now()).lastInsertRowid;
    const U = {
      adderley: user('cadderley@adderleymoss.bs', process.env.OWNER_PASSWORD || 'am-partner', 'managing_partner', 'Cassandra Adderley', { title: 'Managing Partner', rate: 75000, target: 1300, color: '#d6281e', bar: 1996, edu: ['LL.B., University of the West Indies', 'LL.M., London School of Economics', 'Eugene Dupuch Law School'], areas: ['corporate', 'financial'], adm: 'The Bahamas · England & Wales', bio: 'Advises banks, trust companies and funds on licensing, restructurings and cross-border transactions. Former chair of the Bar\'s financial-services committee.' }),
      moss: user('jmoss@adderleymoss.bs', 'am-partner', 'partner', 'Julian Moss', { title: 'Partner · Head of Litigation', rate: 65000, target: 1500, color: '#111111', bar: 1999, edu: ['LL.B. (Hons), University of Buckingham', 'Barrister, Gray\'s Inn'], areas: ['litigation', 'employment'], adm: 'The Bahamas · England & Wales (Barrister)', bio: 'Commercial and insurance litigation from the Supreme Court to the Privy Council. Known for short, surgical pleadings.' }),
      bethel: user('rbethel@adderleymoss.bs', 'am-partner', 'partner', 'Renée Bethel', { title: 'Partner · Real Estate & Private Client', rate: 55000, target: 1450, color: '#2b4c7e', bar: 2004, edu: ['LL.B., University of Leicester', 'Eugene Dupuch Law School'], areas: ['realestate', 'private'], lang: 'English, French', bio: 'Conveyancing for resort developments and family homes alike; estate planning for families with assets in several countries.' }),
      rolle: user('drolle@adderleymoss.bs', 'am-associate', 'associate', 'Desmond Rolle', { title: 'Senior Associate', rate: 40000, target: 1650, color: '#6b4f2a', bar: 2012, edu: ['LL.B., University of the West Indies', 'Eugene Dupuch Law School'], areas: ['litigation', 'employment'], bio: 'Employment disputes and debt recovery; runs the firm\'s Industrial Tribunal practice.' }),
      pinder: user('apinder@adderleymoss.bs', 'am-associate', 'associate', 'Alicia Pinder', { title: 'Associate', rate: 32500, target: 1700, color: '#3f6b55', bar: 2017, edu: ['LL.B., University of Kent', 'LL.M., Georgetown University'], areas: ['corporate', 'immigration', 'financial'], lang: 'English, Spanish', bio: 'Company formation, work permits and regulatory filings for businesses relocating to The Bahamas.' }),
      knowles: user('mknowles@adderleymoss.bs', 'am-associate', 'associate', 'Marcus Knowles', { title: 'Associate', rate: 30000, target: 1700, color: '#7a3b5e', bar: 2019, edu: ['LL.B., University of Manchester', 'Eugene Dupuch Law School'], areas: ['family', 'private'], bio: 'Divorce, custody and probate, handled with discretion and plain speaking.' }),
      ferguson: user('tferguson@adderleymoss.bs', 'am-paralegal', 'paralegal', 'Tamika Ferguson', { title: 'Senior Paralegal', rate: 15000, target: 1400, color: '#8a8a8a', areas: ['realestate', 'corporate'] }),
      sands: user('ksands@adderleymoss.bs', 'am-paralegal', 'paralegal', 'Kendrick Sands', { title: 'Litigation Paralegal', rate: 14000, target: 1400, color: '#9a7d3b', areas: ['litigation'] }),
      moxey: user('accounts@adderleymoss.bs', 'am-accounts', 'accounts', 'Patricia Moxey', { title: 'Firm Accountant', color: '#555' }),
      thompson: user('reception@adderleymoss.bs', 'am-reception', 'reception', 'Shanell Thompson', { title: 'Client Services', color: '#777' }),
    };
    const lawyers = [U.adderley, U.moss, U.bethel, U.rolle, U.pinder, U.knowles], LEAD = { corporate: [U.adderley, U.pinder], financial: [U.adderley, U.pinder], litigation: [U.moss, U.rolle], employment: [U.rolle, U.moss], realestate: [U.bethel], private: [U.bethel, U.knowles], family: [U.knowles], immigration: [U.pinder] };
    const SUPPORT = { corporate: [U.pinder, U.ferguson], financial: [U.pinder], litigation: [U.rolle, U.sands], employment: [U.sands], realestate: [U.ferguson], private: [U.knowles, U.ferguson], family: [U.ferguson], immigration: [U.ferguson] };
    T('team');

    // ---------------------------------------------------------- clients
    const clients = [];
    const mkClient = (o) => { const id = run('INSERT INTO clients (number, kind, name, contact_name, email, phone, address, nationality, registration_no, origin_id, kyc_status, risk, pep, source_of_funds, kyc_verified_at, kyc_reviewer, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      'C-' + (3001 + clients.length), o.kind, o.name, o.contact || null, o.email, o.phone, o.address || pick(['Lyford Cay', 'Cable Beach', 'Palmdale', 'Freeport', 'Paradise Island', 'Eastern Road', 'Sandyport', 'Marsh Harbour']), o.nat || 'Bahamian', o.kind === 'company' ? 'No. ' + between(100000, 999999) + ' B' : null, o.origin, o.kyc, o.risk || (chance(0.08) ? 'high' : chance(0.3) ? 'low' : 'standard'), o.pep ? 1 : 0, pick(['Employment income', 'Business revenue', 'Sale of property', 'Inheritance', 'Investment returns']), o.kyc === 'verified' ? o.created + ' 10:00:00' : null, o.kyc === 'verified' ? 'Patricia Moxey' : null, o.created + ' 09:00:00').lastInsertRowid;
      for (const [k] of L.KYC_REQ[o.kind]) { const st = o.kyc === 'verified' ? 'accepted' : o.kyc === 'in_review' ? pick(['received', 'accepted']) : pick(['requested', 'received', 'requested']); run('INSERT INTO kyc_docs (client_id, kind, filename, status, expires_on, uploaded_at, reviewed_by) VALUES (?,?,?,?,?,?,?)', id, k, st === 'requested' ? null : `${k}-${id}.pdf`, st, k === 'passport' || k === 'ubo' ? addMonths(o.created, between(14, 110)) : null, st === 'requested' ? null : o.created + ' 11:00:00', st === 'accepted' ? 'Patricia Moxey' : null); }
      clients.push(id); return id; };
    const demoClient = mkClient({ kind: 'company', name: 'Harbourline Holdings Ltd.', contact: 'Daniel Strachan', email: 'client@adderleymoss.bs', phone: '(242) 555-0181', address: 'Harbour Bay Plaza, East Bay Street, Nassau', origin: U.adderley, kyc: 'verified', created: addDays(today(), -760), risk: 'standard' });
    for (let i = 0; i < 250; i++) { const co = chance(0.45), created = addDays(today(), -between(20, 1000));
      const name = co ? `${pick(CO_A)} ${pick(CO_B)} ${pick(CO_C)}` : `${pick(FIRST)} ${pick(LAST)}`; if (one('SELECT 1 FROM clients WHERE name=?', name)) continue;
      mkClient({ kind: co ? 'company' : 'individual', name, contact: co ? `${pick(FIRST)} ${pick(LAST)}` : null, email: name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.+$/, '') + '@example.com', phone: `(242) ${between(320, 559)}-${between(1000, 9999)}`, origin: pick(lawyers), kyc: chance(0.86) ? 'verified' : pick(['pending', 'in_review']), created, nat: chance(0.75) ? 'Bahamian' : pick(['British', 'American', 'Canadian', 'Swiss']), pep: chance(0.03) }); }
    // a couple of verified clients whose passports have lapsed — KYC refresh alerts
    for (const id of clients.slice(5, 9)) run("UPDATE kyc_docs SET expires_on=? WHERE client_id=? AND kind IN ('passport','ubo')", addDays(today(), -between(5, 60)), id);
    T('clients');

    // ---------------------------------------------------------- matters + time + billing, month by month
    const AREA_W = ['litigation', 'litigation', 'litigation', 'corporate', 'corporate', 'realestate', 'realestate', 'realestate', 'private', 'private', 'family', 'immigration', 'immigration', 'financial', 'employment', 'employment'];
    const TITLES = {
      litigation: (c) => pick([`${c} v ${pick(CO_A)} ${pick(CO_B)} — breach of contract`, `Insurance claim — ${c}`, `Debt recovery — ${c}`, `${c} — construction dispute`, `Judicial review — ${c}`, `${c} — defamation claim`]),
      corporate: (c) => pick([`Acquisition of ${pick(CO_A)} ${pick(CO_B)}`, `Shareholders' agreement — ${c}`, `Group restructuring — ${c}`, `Commercial lease portfolio — ${c}`, `Joint venture — ${c}`]),
      realestate: (c) => pick([`Purchase of Lot ${between(1, 240)}, ${pick(['Lyford Cay', 'Old Fort Bay', 'Ocean Club Estates', 'Palm Cay', 'Westridge', 'Cable Beach'])}`, `Sale of property — ${c}`, `Mortgage refinancing — ${c}`, `Condominium declaration — ${pick(CO_A)} Residences`]),
      private: (c) => pick([`Will & estate plan — ${c}`, `Estate of the late ${pick(FIRST)} ${pick(LAST)}`, `Family trust settlement — ${c}`, `Power of attorney — ${c}`]),
      family: (c) => pick([`Divorce — ${c}`, `Custody & access — ${c}`, `Maintenance variation — ${c}`, `Prenuptial agreement — ${c}`]),
      immigration: (c) => pick([`Work permit — ${pick(FIRST)} ${pick(LAST)}`, `Permanent residency application — ${c}`, `Work permit renewal — ${c}`, `Spousal permit — ${c}`]),
      financial: (c) => pick([`Fund licensing — ${pick(CO_A)} Capital SMART Fund`, `SCB registration — ${c}`, `Payment-services licence — ${c}`, `AML compliance review — ${c}`]),
      employment: (c) => pick([`Unfair dismissal — ${c}`, `Redundancy programme — ${c}`, `Executive contract — ${c}`, `Industrial Tribunal claim — ${c}`]),
    };
    const DESC = { litigation: ['Reviewed defence and prepared reply', 'Drafted witness statement', 'Telephone conference with client re settlement', 'Prepared bundle for hearing', 'Researched authorities on limitation', 'Attended Supreme Court — directions hearing', 'Correspondence with opposing counsel', 'Reviewed discovery documents', 'Drafted skeleton argument'], corporate: ['Reviewed share purchase agreement', 'Due diligence — corporate records', 'Drafted disclosure letter', 'Call with client re warranties', 'Revised board minutes', 'Prepared completion checklist'], realestate: ['Title search — 30-year abstract', 'Drafted agreement for sale', 'Reviewed survey plan', 'Prepared conveyance', 'Attended stamping at Treasury', 'Recorded conveyance at Registry'], private: ['Will instructions meeting', 'Drafted will and letter of wishes', 'Prepared probate oath', 'Estate inventory and valuation', 'Correspondence with beneficiaries'], family: ['Drafted petition', 'Prepared financial statement', 'Attended mediation', 'Correspondence re access arrangements', 'Prepared consent order'], immigration: ['Reviewed eligibility and documents', 'Prepared work permit application', 'Follow-up with Department of Immigration', 'Prepared labour certificate documents'], financial: ['Drafted offering memorandum', 'Prepared licence application', 'Responded to regulator queries', 'AML policy review'], employment: ['Reviewed employment contract', 'Drafted response to grievance', 'Prepared tribunal submissions', 'Call with HR re redundancy consultation'] };
    const ACT = { litigation: ['Drafting', 'Research', 'Court attendance', 'Correspondence', 'Preparation'], corporate: ['Drafting', 'Due diligence', 'Review', 'Meeting'], realestate: ['Review', 'Drafting', 'Filing'], private: ['Meeting', 'Drafting'], family: ['Drafting', 'Meeting', 'Correspondence'], immigration: ['Filing', 'Drafting'], financial: ['Drafting', 'Review'], employment: ['Drafting', 'Correspondence'] };
    const matters = []; const start = addMonths(today().slice(0, 7) + '-01', -30);
    const adverseName = () => (chance(0.55) ? `${pick(CO_A)} ${pick(CO_B)} ${pick(CO_C)}` : `${pick(FIRST)} ${pick(LAST)}`);
    for (let k = 0; k < 900; k++) {
      const area = pick(AREA_W), opened = addDays(start, between(0, (new Date(today()) - new Date(start)) / 864e5 - 3)); if ([0, 6].includes(dow(opened))) continue;
      const cid = k < 6 ? demoClient : pick(clients), c = one('SELECT * FROM clients WHERE id=?', cid); if (c.created_at.slice(0, 10) > opened) run('UPDATE clients SET created_at=? WHERE id=?', addDays(opened, -3) + ' 09:00:00', cid);
      const lead = pick(LEAD[area]), billing = ['realestate', 'immigration', 'private'].includes(area) ? (chance(0.7) ? 'fixed' : 'hourly') : area === 'corporate' && chance(0.25) ? 'capped' : 'hourly';
      const price = area === 'realestate' ? between(35, 450) * 1000000 : 0, fixed = billing === 'fixed' ? (area === 'realestate' ? Math.round(price * 0.025) : pick({ immigration: [125000, 150000, 225000], private: [95000, 160000, 450000] }[area])) : null;
      const m = L.openMatter({ client_id: cid, title: TITLES[area](c.name.replace(/ (Ltd\.|Limited|IBC|Co\. Ltd\.)$/, '')), area, responsible_id: lead, originating_id: chance(0.7) ? lead : pick(lawyers), billing, fixed_fee_cents: fixed, cap_cents: billing === 'capped' ? pick([2500000, 4000000, 6000000]) : null, evergreen_cents: area === 'litigation' && chance(0.5) ? pick([1000000, 2500000]) : 0, description: area === 'realestate' ? `Consideration B$${(price / 100).toLocaleString('en-US')}` : null, adverse: ['litigation', 'family', 'employment'].includes(area) ? [adverseName()] : area === 'realestate' && chance(0.6) ? [`${pick(FIRST)} ${pick(LAST)} (vendor)`] : [], court: area === 'litigation' ? pick(['Supreme Court — Commercial Division', 'Supreme Court — Civil Side', 'Court of Appeal']) : area === 'employment' ? 'Industrial Tribunal' : null, case_no: area === 'litigation' ? `${opened.slice(0, 4)}/CLE/gen/${between(100, 1999)}` : null, opened_on: opened }, 'Seed');
      run('UPDATE matters SET rate_discount_pct=?, budget_cents=? WHERE id=?', chance(0.15) ? 10 : 0, billing === 'hourly' && chance(0.4) ? pick([1500000, 3000000, 5000000, 8000000]) : null, m.id);
      for (const sid of SUPPORT[area]) if (sid !== lead) run('INSERT OR IGNORE INTO matter_team (matter_id, user_id, role) VALUES (?,?,?)', m.id, sid, one('SELECT role FROM users WHERE id=?', sid).role === 'paralegal' ? 'Paralegal' : 'Associate');
      const dur = { litigation: [120, 700], corporate: [45, 260], realestate: [35, 120], private: [20, 300], family: [60, 400], immigration: [30, 120], financial: [60, 300], employment: [40, 260] }[area], end = addDays(opened, between(...dur)), closed = end < today();
      matters.push({ ...one('SELECT * FROM matters WHERE id=?', m.id), endDate: closed ? end : today(), closed, price });
      // engagement letter: signed a few days after opening
      run("UPDATE documents SET status='signed', client_visible=1, signer_name=?, signature='seed', signed_at=?, signer_email=? WHERE matter_id=? AND template='engagement'", c.contact_name || c.name, addDays(opened, between(1, 5)) + ' 12:00:00', c.email, m.id);
      run('UPDATE matters SET engagement_signed=1 WHERE id=?', m.id);
    }
    T('matters');

    // time entries
    const team = (mid) => all('SELECT u.* FROM matter_team t JOIN users u ON u.id=t.user_id WHERE t.matter_id=?', mid);
    const ins = (mid, uid, date, minutes, act, desc, rate, billable) => run('INSERT INTO time_entries (matter_id, user_id, date, minutes, activity, description, rate_cents, billable, created_at) VALUES (?,?,?,?,?,?,?,?,?)', mid, uid, date, minutes, act, desc, rate, billable, date + ' 18:00:00');
    const byUser = {}; for (const m of matters) for (const u of team(m.id)) (byUser[u.id] ||= { u, ms: [] }).ms.push(m);
    for (const { u, ms } of Object.values(byUser)) { const dayTarget = (u.target_hours / 230) * 60 * 0.82;
      for (let d = start; d <= today(); d = addDays(d, 1)) { if ([0, 6].includes(dow(d)) || (d < today() && chance(0.07))) continue; const live = ms.filter((m) => m.opened_on <= d && m.endDate >= d); if (!live.length) continue;
        let left = dayTarget * (d === today() ? 0.3 + rnd() * 0.2 : 0.75 + rnd() * 0.5); while (left > 10) { const m = pick(live), min = Math.min(pick([12, 18, 24, 30, 42, 48, 60, 72, 90, 120, 150]), Math.ceil(left / 6) * 6); left -= min;
          ins(m.id, u.id, d, min, pick(ACT[m.area]), pick(DESC[m.area]), Math.round(u.rate_cents * (1 - (m.rate_discount_pct || 0) / 100)), chance(0.93) ? 1 : 0); }
        if (chance(0.5)) ins(pick(live).id, u.id, d, pick([30, 60, 90]), 'Preparation', pick(['Internal training', 'Practice development', 'File review']), u.rate_cents, 0); } }
    for (const m of matters) { const span = Math.max(1, (new Date(m.endDate) - new Date(m.opened_on)) / 864e5);
      if (span > 0) for (let e = 0; e < between(0, m.area === 'litigation' ? 4 : 2); e++) { const d = addDays(m.opened_on, between(1, Math.max(2, Math.floor(span) - 1))); if (d > today()) continue;
        const ex = pick(m.area === 'litigation' ? [['Court filing fee', 15000, 1], ['Process server', 7500, 1], ['Transcript', 32000, 1], ['Courier', 4500, 0]] : m.area === 'realestate' ? [['Registry search fees', 12500, 1], ['Recording fee', 10000, 1], ['Courier', 4500, 0]] : [['Government filing fee', 35000, 1], ['Courier', 4500, 0], ['Certified copies', 6000, 1]]);
        run('INSERT INTO expenses (matter_id, date, kind, description, amount_cents, disbursement, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)', m.id, d, ex[0], ex[0], ex[1], ex[2], 'Seed', now()); } }
    T('time');

    // trust: retainers & conveyancing funds
    for (const m of matters) { const c = one('SELECT * FROM clients WHERE id=?', m.client_id); if (c.kyc_status !== 'verified') continue;
      if (m.evergreen_cents) L.trustDeposit({ client_id: m.client_id, matter_id: m.id, amount_cents: m.evergreen_cents, reference: 'Wire ' + between(100000, 999999), date: addDays(m.opened_on, 3) }, 'Seed');
      if (m.area === 'realestate' && /Purchase/.test(m.title)) { const price = m.price || between(40, 600) * 1000000; L.trustDeposit({ client_id: m.client_id, matter_id: m.id, amount_cents: price + Math.round(price * 0.04), reference: 'Purchase funds', date: addDays(m.opened_on, 10) }, 'Seed');
        if (m.closed || chance(0.4)) { const cd = m.closed ? m.endDate : addDays(m.opened_on, 30); if (cd <= today()) { L.trustDisburse({ client_id: m.client_id, matter_id: m.id, amount_cents: price, description: "Completion monies to vendor's attorneys", reference: 'CHQ ' + between(1000, 9999), date: cd }, 'Seed'); L.trustDisburse({ client_id: m.client_id, matter_id: m.id, amount_cents: Math.round(price * 0.02), description: 'Transfer tax (buyer share) — Treasury', reference: 'CHQ ' + between(1000, 9999), date: cd }, 'Seed'); } } }
      if (['corporate', 'family', 'financial'].includes(m.area) && chance(0.35)) L.trustDeposit({ client_id: m.client_id, matter_id: m.id, amount_cents: pick([500000, 750000, 1000000]), reference: 'Retainer', date: addDays(m.opened_on, 2) }, 'Seed'); }
    T('trust');

    // monthly billing run on the 1st, from WIP through month end
    for (let ms = addMonths(start, 1); ms <= today(); ms = addMonths(ms, 1)) { const through = addDays(ms, -1);
      for (const m of matters) { if (m.opened_on > through || (m.closed && m.endDate < addMonths(ms, -1))) continue;
        if (m.billing === 'fixed' && one("SELECT 1 FROM invoices WHERE matter_id=? AND status<>'void'", m.id) && !(m.closed && m.endDate <= through)) continue; // fixed fee: billed at opening, settled at completion
        let inv; try { inv = L.createInvoice(m.id, 'Seed', { through, date: ms }); } catch { continue; }
        if (!inv.total_cents) { run("UPDATE invoices SET status='void' WHERE id=?", inv.id); continue; }
        const tAvail = L.trustBal(m.client_id, m.id), useTrust = (m.evergreen_cents || (m.area !== 'realestate' && tAvail > 0)) && tAvail > 0;
        L.issueInvoice(inv, 'Seed', { date: ms, apply_trust: !!useTrust });
        const fresh = one('SELECT * FROM invoices WHERE id=?', inv.id), age = (new Date(today()) - new Date(ms)) / 864e5;
        if (fresh.status !== 'paid') { const r = rnd(), payIn = between(8, 70); if (age > payIn && r < 0.91) L.payInvoice(fresh, { amount_cents: fresh.total_cents - fresh.paid_cents, method: pick(['wire', 'wire', 'cheque', 'card']), reference: 'Ref ' + between(10000, 99999), date: addDays(ms, payIn) }, 'Seed');
          else if (age > 30 && r < 0.93) L.payInvoice(fresh, { amount_cents: Math.round((fresh.total_cents - fresh.paid_cents) * 0.5), method: 'wire', date: addDays(ms, between(20, 50)) }, 'Seed'); }
        if (m.evergreen_cents && age > 10 && one('SELECT kyc_status FROM clients WHERE id=?', m.client_id).kyc_status === 'verified') { const left = L.trustBal(m.client_id, m.id); if (left < m.evergreen_cents && chance(0.8) && !(m.closed && m.endDate < ms)) L.trustDeposit({ client_id: m.client_id, matter_id: m.id, amount_cents: m.evergreen_cents - left, reference: 'Replenishment', date: addDays(ms, between(5, 15)) }, 'Seed'); } } }
    for (const i of all("SELECT * FROM invoices WHERE status IN ('issued','partial') AND issued_on < ?", addDays(today(), -150))) { if (chance(0.55)) L.payInvoice(i, { amount_cents: i.total_cents - i.paid_cents, method: 'wire', reference: 'Late settlement', date: addDays(i.issued_on, between(95, 140)) }, 'Seed'); else if (chance(0.6)) L.writeOff(i, i.total_cents - i.paid_cents, 'Seed'); }
    T('billing');
    // close finished matters; refund leftover trust on closed matters
    for (const m of matters.filter((x) => x.closed)) { run("UPDATE matters SET status='closed', closed_on=?, stage=? WHERE id=?", m.endDate, L.AREAS[m.area].stages.at(-1), m.id); const left = L.trustBal(m.client_id, m.id); if (left > 0 && m.endDate < addDays(today(), -40)) L.trustDisburse({ client_id: m.client_id, matter_id: m.id, amount_cents: left, kind: 'refund', description: 'Balance of client funds returned', date: addDays(m.endDate, 14) }, 'Seed'); }
    for (const m of matters.filter((x) => !x.closed)) { const st = L.AREAS[m.area].stages, prog = Math.min(1, (new Date(today()) - new Date(m.opened_on)) / 864e5 / 200); run('UPDATE matters SET stage=? WHERE id=?', st[Math.min(st.length - 2, Math.max(1, Math.floor(prog * (st.length - 1))))], m.id); }
    run("UPDATE matters SET status='pending' WHERE status='open' AND id IN (SELECT id FROM matters WHERE status='open' ORDER BY RANDOM() LIMIT 12)");
    T('close');

    // ---------------------------------------------------------- calendar, tasks, notes, documents
    const open = all("SELECT * FROM matters WHERE status<>'closed'");
    for (const m of open) {
      if (m.area === 'litigation') { L.addDeadline(m.id, pick(['defence', 'reply', 'discovery', 'appeal_ca']), addDays(today(), -between(0, 30)), m.responsible_id, 'Seed');
        const hd = addDays(today(), between(1, 50)); if (![0, 6].includes(dow(hd))) run('INSERT INTO events (matter_id, kind, title, start_at, end_at, location, user_id, client_visible, created_at) VALUES (?,?,?,?,?,?,?,?,?)', m.id, 'hearing', pick(['Directions hearing', 'Case management conference', 'Interlocutory application', 'Trial — day 1', 'Mediation']), `${hd} ${pick(['09:30', '10:00', '14:00'])}:00`, `${hd} 12:30:00`, m.court || 'Supreme Court, Bank Lane', m.responsible_id, 1, now()); }
      if (m.area === 'realestate') L.addDeadline(m.id, 'stamping', addDays(today(), -between(0, 25)), m.responsible_id, 'Seed');
      if (m.area === 'immigration' && chance(0.5)) L.addDeadline(m.id, 'permit_renewal', addDays(today(), between(100, 200)), m.responsible_id, 'Seed');
      if (chance(0.5)) { const md = addDays(today(), between(0, 20)); if (![0, 6].includes(dow(md))) run('INSERT INTO events (matter_id, kind, title, start_at, end_at, location, user_id, client_visible, created_at) VALUES (?,?,?,?,?,?,?,?,?)', m.id, 'meeting', pick(['Client meeting', 'Call with client', 'Settlement meeting', 'Signing meeting']), `${md} ${pick(['09:00', '11:00', '15:00', '16:00'])}:00`, `${md} ${pick(['10:00', '12:00', '16:00', '17:00'])}:00`, pick(['Chambers — Board room', 'Video call', "Client's office"]), m.responsible_id, 1, now()); }
      for (let i = 0; i < between(1, 4); i++) run('INSERT INTO tasks (matter_id, title, assignee_id, due_on, status, priority, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)', m.id, pick(['Chase signed documents', 'Draft first version', 'Review opposing disclosure', 'Prepare court bundle', 'File at Registry', 'Update client', 'Diary follow-up', 'Collect search results']), pick(team(m.id)).id, addDays(today(), between(-5, 21)), 'open', chance(0.2) ? 'high' : 'normal', 'Seed', now());
      if (chance(0.25)) run('INSERT INTO tasks (matter_id, title, due_on, status, for_client, created_by, created_at) VALUES (?,?,?,?,?,?,?)', m.id, pick(['Upload signed board resolution', 'Send copies of payslips', 'Confirm completion date', 'Provide passport copy for the application']), addDays(today(), between(2, 14)), 'open', 1, 'Seed', now());
      for (let i = 0; i < between(1, 4); i++) run('INSERT INTO documents (matter_id, client_id, name, kind, size_kb, status, client_visible, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)', m.id, m.client_id, pick({ litigation: ['Writ of summons.pdf', 'Statement of claim.docx', 'Defence (served).pdf', 'Witness statement — client.docx', 'Hearing bundle index.pdf'], corporate: ['SPA draft v4.docx', 'Disclosure letter.docx', 'Board minutes.pdf', 'Cap table.xlsx'], realestate: ['Agreement for sale (executed).pdf', 'Survey plan.pdf', 'Title abstract.pdf', 'Conveyance (draft).docx'], private: ['Will — draft.docx', 'Letter of wishes.docx', 'Asset schedule.xlsx'], family: ['Petition.pdf', 'Financial statement.docx'], immigration: ['Application form.pdf', 'Police certificate.pdf', 'Employer letter.pdf'], financial: ['Offering memorandum.docx', 'Licence application.pdf'], employment: ['Employment contract.pdf', 'Grievance letter.pdf'] }[m.area]), 'filed', between(40, 2400), 'filed', chance(0.6) ? 1 : 0, pick(team(m.id)).name, [addDays(m.opened_on, between(1, 40)), addDays(today(), -1)].sort()[0] + ' 10:00:00');
      if (chance(0.5)) run('INSERT INTO notes (matter_id, user_id, body, created_at) VALUES (?,?,?,?)', m.id, m.responsible_id, pick(['Client prefers calls after 4pm.', 'Opposing counsel open to mediation — revisit after discovery.', 'Lender requires completion before month end.', 'Budget sensitive — update before exceeding estimate.', 'Settlement authority: up to the figure discussed on the call.']), now());
    }
    T('calendar');

    // ---------------------------------------------------------- intakes (website enquiries)
    const SUMS = { litigation: 'A supplier has refused to pay invoices totalling about B$180,000 and is now threatening a counterclaim.', corporate: 'We are buying a majority stake in a local distribution business and need due diligence and the share purchase agreement.', realestate: 'Buying a beachfront lot and need the title checked and the conveyance handled.', private: 'Would like wills for my wife and me, and possibly a trust for our children.', family: 'Separated eight months ago and want to understand the divorce process and custody options.', immigration: 'Hiring a hotel general manager from Canada and need a work permit.', financial: 'Launching a fund and want to know which licence we need from the Securities Commission.', employment: 'I was dismissed without notice after nine years and was told it was redundancy.' };
    for (let i = 0; i < 150; i++) { const area = pick(AREA_W), created = addDays(today(), -between(0, 540)), nm = `${pick(FIRST)} ${pick(LAST)}`;
      const adv = ['litigation', 'family', 'employment'].includes(area) ? [chance(0.06) ? one('SELECT name FROM clients ORDER BY RANDOM() LIMIT 1').name : adverseName()] : [];
      const it = L.createIntake({ name: nm, email: nm.toLowerCase().replace(/ /g, '.') + '@example.com', phone: `(242) ${between(320, 559)}-${between(1000, 9999)}`, company: area === 'corporate' || area === 'financial' ? `${pick(CO_A)} ${pick(CO_B)} Ltd.` : null, area, summary: SUMS[area], adverse: adv, created_at: created + ' ' + String(between(8, 20)).padStart(2, '0') + ':' + String(between(10, 59)) + ':00', source: pick(['website', 'website', 'referral', 'phone']) });
      const age = (new Date(today()) - new Date(created)) / 864e5;
      if (age > 6) { const r = rnd();
        if (it.status === 'conflict_review') run("UPDATE intakes SET status=?, cleared_by='Cassandra Adderley', conflict_note=? WHERE id=?", r < 0.6 ? 'declined' : 'cleared', r < 0.6 ? 'Direct conflict — declined and referred elsewhere.' : 'Name match only — different entity. Cleared.', it.id);
        else run('UPDATE intakes SET status=? WHERE id=?', r < 0.42 ? 'converted' : r < 0.6 ? 'lost' : r < 0.75 ? 'consult_booked' : 'cleared', it.id);
        if (r < 0.75) run('UPDATE intakes SET consult_user_id=?, consult_at=?, consult_paid=1 WHERE id=?', pick(LEAD[area]), addDays(created, between(1, 5)) + ' 10:00:00', it.id); } }
    // fresh ones today: one with a direct conflict for the demo
    const someClient = one('SELECT name FROM clients WHERE kind=? AND id<>? ORDER BY id LIMIT 1 OFFSET 7', 'company', demoClient).name;
    L.createIntake({ name: 'Lionel Darville', email: 'lionel.darville@example.com', phone: '(242) 555-0199', area: 'litigation', summary: `Dispute with ${someClient} over an unpaid construction invoice of B$240,000.`, adverse: [someClient], urgency: 'high' });
    L.createIntake({ name: 'Felicia Turnquest', email: 'felicia.t@example.com', phone: '(242) 555-0133', area: 'private', summary: 'Mother passed away in March; I am named executor and need help with probate.', adverse: [] });
    L.createIntake({ name: 'Ocean Spray Charters Ltd.', company: 'Ocean Spray Charters Ltd.', email: 'ops@oceanspray.example.com', area: 'employment', summary: 'Captain has filed at the Industrial Tribunal claiming unfair dismissal.', adverse: ['Captain Ryan Bowe'] });
    T('intakes');

    // ---------------------------------------------------------- demo client: portal, messages, open items
    run('INSERT INTO users (email,password_hash,role,name,client_id,created_at) VALUES (?,?,?,?,?,?)', 'client@adderleymoss.bs', hashPassword('am-client'), 'client', 'Daniel Strachan', demoClient, now());
    const dm = all("SELECT * FROM matters WHERE client_id=? ORDER BY status='closed', opened_on DESC", demoClient);
    for (const m of dm.filter((x) => x.status !== 'closed').slice(0, 3)) { for (const [who, body, ago] of [[0, 'Following our call — attached is the revised draft for your review. The main change is in clause 7.', 6], [1, 'Thanks. Board meets Thursday; we will revert on clause 7 then.', 5], [0, 'Noted. We have diarised Friday to chase.', 5], [1, 'Board approved. Please proceed.', 1]]) run('INSERT INTO messages (matter_id, user_id, from_client, body, read_at, created_at) VALUES (?,?,?,?,?,?)', m.id, who ? null : m.responsible_id, who, body, ago > 1 ? now() : null, addDays(today(), -ago) + ' 14:' + String(between(10, 59)) + ':00'); }
    const dOpen = dm.find((x) => x.status !== 'closed') || dm[0];
    const dd = L.generateDoc(dOpen, 'resolution', 'Cassandra Adderley'); L.sendForSignature(dd, 'Cassandra Adderley');
    run('INSERT INTO tasks (matter_id, title, due_on, status, for_client, created_by, created_at) VALUES (?,?,?,?,?,?,?)', dOpen.id, 'Upload the signed register of directors', addDays(today(), 5), 'open', 1, 'Seed', now());
    for (const i of all("SELECT * FROM invoices WHERE client_id=? AND status IN ('issued','partial')", demoClient)) void i;
    // a fresh unpaid invoice for the demo client
    const dInv = (() => { const m = dm.find((x) => x.status !== 'closed' && x.billing !== 'fixed'); if (!m) return null; L.addTime({ matter_id: m.id, user_id: m.responsible_id, date: addDays(today(), -3), minutes: 150, activity: 'Drafting', description: 'Revised transaction documents following board feedback' }, 'Seed'); try { const inv = L.createInvoice(m.id, 'Seed'); return L.issueInvoice(inv, 'Seed', { date: addDays(today(), -2) }); } catch { return null; } })();
    T('demo');

    // ---------------------------------------------------------- today's working state: running timer, today's time
    for (const u of [U.adderley, U.moss, U.bethel, U.rolle, U.pinder, U.knowles, U.ferguson, U.sands]) { const mine = all("SELECT m.* FROM matters m JOIN matter_team t ON t.matter_id=m.id WHERE t.user_id=? AND m.status='open'", u); if (!mine.length) continue;
      for (let i = 0; i < between(1, 4); i++) { const m = pick(mine); ins(m.id, u, today(), pick([18, 30, 42, 60, 90]), pick(ACT[m.area]), pick(DESC[m.area]), one('SELECT rate_cents FROM users WHERE id=?', u).rate_cents, 1); } }
    { const m = one("SELECT m.* FROM matters m JOIN matter_team t ON t.matter_id=m.id WHERE t.user_id=? AND m.status='open' LIMIT 1", U.moss); if (m) run('INSERT INTO time_entries (matter_id, user_id, date, minutes, description, rate_cents, running_since, created_at) VALUES (?,?,?,?,?,?,?,?)', m.id, U.moss, today(), 0, 'Preparing cross-examination notes', 65000, require('./db').stamp(new Date(Date.now() - 37 * 60000)), now()); }

    // ---------------------------------------------------------- trust reconciliation: last few transactions not yet on the bank statement
    for (const t of all('SELECT id FROM trust ORDER BY date DESC, id DESC LIMIT 5')) run('UPDATE trust SET cleared=0 WHERE id=?', t.id);
    const book = one('SELECT COALESCE(SUM(amount_cents),0) n FROM trust').n, unc = one('SELECT COALESCE(SUM(amount_cents),0) n FROM trust WHERE cleared=0').n;
    setSetting('trust_bank_balance', book - unc); setSetting('trust_bank_date', addDays(today(), -1));

    // ---------------------------------------------------------- insights
    const ART = [
      ['buying-property-as-a-non-bahamian', 'Buying property as a non-Bahamian: what the ILA permit really means', 'realestate', U.bethel, 'Most foreign buyers never need a permit. Here is when you do — and how long it takes.', 7],
      ['wills-for-families-with-assets-abroad', 'One family, three countries: making a will that works everywhere', 'private', U.bethel, 'Why a Bahamian will alone may not pass your Florida condo, and how to avoid probate twice.', 6],
      ['letter-before-action', 'The letter before action: the cheapest way to win a debt dispute', 'litigation', U.moss, 'Most unpaid invoices are settled at this stage. What a good one says, and what it must never say.', 5],
      ['ibc-or-local-company', 'IBC or local company? Choosing the right vehicle', 'corporate', U.pinder, 'The tax position, the reporting obligations and the real annual cost of each.', 6],
      ['work-permits-2026', 'Work permits in 2026: timelines, documents and the labour certificate', 'immigration', U.pinder, 'A practical checklist for employers hiring from abroad.', 5],
      ['redundancy-done-properly', 'Redundancy, done properly', 'employment', U.rolle, 'Notice, consultation and severance — the steps that keep you out of the Industrial Tribunal.', 6],
      ['divorce-process-explained', 'The divorce process, explained without the jargon', 'family', U.knowles, 'Petition to decree absolute: what happens, how long it takes and what it costs.', 7],
      ['smart-funds', 'SMART funds and the Securities Commission: a start-up manager\'s guide', 'financial', U.adderley, 'Which licence, which administrator, and what the Commission will ask.', 8],
    ];
    ART.forEach(([slug, title, area, author, dek, min], i) => run('INSERT INTO articles (slug, title, area, dek, body, author_id, published_on, minutes) VALUES (?,?,?,?,?,?,?,?)', slug, title, area, dek, `${dek}\n\nThis note is general information, not legal advice, and reflects the law at the date of publication. Every situation turns on its facts — speak to us before you act.\n\n${['Start early. The single biggest cause of delay is documents gathered too late.', 'Get the structure right before signing anything. Unwinding is always dearer than planning.', 'Keep a paper trail. Courts, regulators and registries all reward the party with the better record.'].join('\n\n')}`, author, addDays(today(), -i * 23 - 4), min));
  });
  const c = (t) => one(`SELECT COUNT(*) n FROM ${t}`).n;
  console.log(`Seeded ${c('clients')} clients, ${c('matters')} matters, ${c('time_entries')} time entries, ${c('invoices')} invoices, ${c('trust')} trust lines in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  return true;
}
module.exports = { seed };
if (require.main === module) seed({ reset: process.argv.includes('--reset') });
