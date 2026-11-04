// =========================================================================
// NACRE app core — shared by the clinic console, client portal and documents
// (ported from the Breezeway core).
// =========================================================================
window.NC = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function api(path, body, method) {
    const r = await fetch(path, { method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !path.startsWith('/api/me') && !path.startsWith('/api/public')) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.hash); throw new Error('Signed out'); }
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong'), { status: r.status });
    return j;
  }
  // ---------- formatting
  const money = (c, opts = {}) => (c == null ? '—' : (c < 0 ? '−' : '') + 'B$' + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: opts.whole ? 0 : 2, maximumFractionDigits: opts.whole ? 0 : 2 }));
  const pd = (s) => (s ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00' : String(s).replace(' ', 'T')) : null);
  // Stored times are Nassau wall-clock; compare them with Nassau "now", wherever the browser happens to be.
  const nowLocal = () => { try { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Nassau' })); } catch { return new Date(); } };
  const date = (s, o = { month: 'short', day: 'numeric', year: 'numeric' }) => (s ? pd(s).toLocaleDateString('en-US', o) : '—');
  const short = (s) => date(s, { month: 'short', day: 'numeric' });
  const time = (s) => (s ? pd(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
  const when = (s) => (s ? `${date(s, { weekday: 'short', month: 'short', day: 'numeric' })}, ${time(s)}` : 'Not scheduled');
  function ago(s) { const d = (nowLocal() - pd(s)) / 1000; if (d < 60) return 'just now'; if (d < 3600) return Math.floor(d / 60) + 'm ago'; if (d < 86400) return Math.floor(d / 3600) + 'h ago'; if (d < 7 * 86400) return Math.floor(d / 86400) + 'd ago'; return short(s); }
  const ymd = (d = nowLocal()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const initials = (n) => String(n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const label = (s) => String(s || '').replace(/_/g, ' ');
  const badge = (s, txt) => `<span class="badge s-${esc(String(s).replace(/\s/g, '_'))}">${esc(txt || label(s))}</span>`;
  const STAGES = ['booked', 'confirmed', 'checked_in', 'in_treatment', 'completed'];
  const pipeline = (status) => { const i = STAGES.indexOf(status); return `<div class="pipeline" role="img" aria-label="Visit status: ${label(status)}">${STAGES.map((s, k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}">${label(s)}</span>`).join('')}</div>`; };
  // VAT totals — mirrors server/logic.js
  function totals(lines, discount = 0, vatRate = 0.1) {
    const sub = lines.reduce((a, l) => a + Math.round(l.qty * l.unit_cents), 0);
    const taxable = lines.filter((l) => l.taxable).reduce((a, l) => a + Math.round(l.qty * l.unit_cents), 0);
    const disc = Math.min(Math.max(0, discount || 0), sub), taxAfter = sub ? taxable - Math.round((disc * taxable) / sub) : 0, vat = Math.round(taxAfter * vatRate);
    return { subtotal: sub, discount: disc, vat, total: sub - disc + vat };
  }
  const totalsHtml = (t, vatRate = 0.1) => `<div class="totals num"><span>Subtotal</span><span class="right">${money(t.subtotal)}</span>${t.discount ? `<span>Discount</span><span class="right">−${money(t.discount)}</span>` : ''}<span>VAT ${Math.round(vatRate * 100)}%</span><span class="right">${money(t.vat)}</span>${t.paid ? `<span>Paid</span><span class="right">−${money(t.paid)}</span>` : ''}<span class="grand">${t.paid != null ? 'Balance' : 'Total'}</span><span class="grand right">${money(t.paid != null ? t.balance : t.total)}</span></div>`;

  // ---------- icons
  const P = { home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z', board: 'M4 5h16v14H4zM4 10h16M9 5v14', jobs: 'M9 4h6l1 2h4v14H4V6h4zM9 12h6M9 16h4', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-5-5.9',
    quote: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3', plan: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4', box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', chat: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3a2 2 0 010-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009.7 4V3a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1.3z',
    team: 'M12 11a3 3 0 100-6 3 3 0 000 6zM6 20a6 6 0 0112 0M4 10a2 2 0 100-4M20 10a2 2 0 100-4', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3', plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', menu: 'M4 7h16M4 12h16M4 17h16', logout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14', cam: 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 100-8 4 4 0 000 8z', check: 'M5 12l5 5 9-10', alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    van: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', unit: 'M3 6h18v12H3zM8 12a3 3 0 106 0 3 3 0 00-6 0zM17 9h1M17 12h1M17 15h1', print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', send: 'M4 12l16-8-6 16-2-7z', card: 'M3 6h18v12H3zM3 10h18M7 15h3', copy: 'M8 8h12v12H8zM4 16V4h12', arrowl: 'M19 12H5M11 6l-6 6 6 6' };
  Object.assign(P, { spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z', gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-7-4-6-1 1 2 6 1 6 1zm0 0c2-4 7-4 6-1-1 2-6 1-6 1z', syringe: 'M18 2l4 4M20 4l-9.5 9.5M14 5l5 5M9 10l5 5-6 6-3-3-3 1 1-3-3-3zM6 13l2 2', clip: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4', star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z', clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', heart: 'M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z', drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z', wait: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9' });
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
  const logo = `<span class="pearl-dot" aria-hidden="true"></span>`;

  // ---------- feedback
  function toast(msg, err) {
    let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' toast--err' : ''); t.textContent = msg; box.append(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3200);
  }
  function modal(html, { wide } = {}) {
    const prev = document.activeElement;
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal__c ${wide ? 'modal__c--wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.append(m); requestAnimationFrame(() => m.classList.add('is-open'));
    const focusables = () => $$('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea', m).filter((x) => x.offsetParent !== null);
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); } } };
    const close = () => { m.classList.remove('is-open'); setTimeout(() => m.remove(), 250); removeEventListener('keydown', onKey); prev?.focus?.(); };
    addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); });
    setTimeout(() => (m.querySelector('[autofocus]') || focusables()[1] || focusables()[0])?.focus(), 60);
    return { el: m, close, $: (s) => m.querySelector(s), $$: (s) => $$(s, m) };
  }
  const mhead = (title, sub) => `<div class="mh"><div><h2>${title}</h2>${sub ? `<p class="muted" style="margin-top:4px">${sub}</p>` : ''}</div><button class="btn btn--ghost btn--icon btn--sm" data-close aria-label="Close">${icon('x')}</button></div>`;
  const confirm = (title, body, ok = 'Confirm', danger) => new Promise((res) => {
    const m = modal(`${mhead(esc(title))}<p class="ink2">${body}</p><div class="mf"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn--heat' : 'btn--sea'}" data-ok>${esc(ok)}</button></div>`);
    m.$('[data-ok]').onclick = () => { m.close(); res(true); }; m.el.addEventListener('click', (e) => { if (e.target === m.el || e.target.closest('[data-close]')) res(false); });
  });
  const formData = (f) => Object.fromEntries(new FormData(f));
  async function busy(btn, fn) { if (!btn) return fn(); const h = btn.innerHTML; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Working…'; try { return await fn(); } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = h; } }
  const submit = (f, fn) => f && (f.onsubmit = async (e) => { e.preventDefault(); try { await busy(e.submitter || f.querySelector('button:not([type=button])'), () => fn(formData(f), f)); } catch (er) { toast(er.message, true); } });

  // ---------- router (calm route changes: quick fade only)
  function router(routes, fallback, onRoute) {
    async function go() {
      const raw = location.hash.replace(/^#\//, '') || fallback; const [path, qs] = raw.split('?'); const [r, ...rest] = path.split('/');
      const fn = routes[r] || routes[fallback];
      onRoute && onRoute(fn.nav || (routes[r] ? r : fallback));
      const view = $('#view');
      try { const html = await fn(...rest, new URLSearchParams(qs || '')); view.innerHTML = html; view.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }); fn.after && (await fn.after(...rest, new URLSearchParams(qs || ''))); view.querySelector('h1')?.focus?.({ preventScroll: true }); }
      catch (e) { if (e.message !== 'Signed out') view.innerHTML = `<div class="page-h"><h1>That didn't load</h1></div><div class="card"><p>${esc(e.message)}</p><button class="btn mt" onclick="location.reload()">Try again</button></div>`; }
    }
    addEventListener('hashchange', () => { $$('.modal').forEach((m) => m.remove()); go(); scrollTo(0, 0); });
    return go;
  }
  // clickable table rows → keyboard accessible links
  document.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-href]'); if (tr && !e.target.closest('a, button, input, select')) location.hash = tr.dataset.href; });
  document.addEventListener('keydown', (e) => { const tr = e.target.closest?.('tr[data-href]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = tr.dataset.href; } });

  // ---------- price-book line editor
  let PB = null;
  const pricebook = async (url = '/api/staff/meta') => (PB ||= await api(url));
  function pbPicker(input, onPick) {
    const wrap = input.closest('.pb-pick'); let res = null;
    input.setAttribute('autocomplete', 'off'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', async () => {
      const q = input.value.trim().toLowerCase(); res?.remove(); res = null; input.setAttribute('aria-expanded', 'false'); if (q.length < 2) return;
      const list = (await pricebook()).filter((p) => (p.name + ' ' + (p.code || '') + ' ' + (p.category || '')).toLowerCase().includes(q)).slice(0, 8);
      res = document.createElement('div'); res.className = 'pb-pick__res'; res.setAttribute('role', 'listbox');
      res.innerHTML = list.map((p) => `<button type="button" role="option" data-id="${p.id}"><span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.code || '')} · ${esc(p.category || p.kind)}</small></span><span class="num">${money(p.price_cents)}</span></button>`).join('') || '<p class="muted" style="padding:10px">No match — press Enter to add as a custom line.</p>';
      wrap.append(res); input.setAttribute('aria-expanded', 'true');
      $$('button', res).forEach((b) => (b.onclick = () => { onPick(list.find((p) => p.id == b.dataset.id)); input.value = ''; res.remove(); res = null; input.focus(); }));
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' && res) { e.preventDefault(); res.querySelector('button')?.focus(); } if (e.key === 'Escape' && res) { res.remove(); res = null; } if (e.key === 'Enter') { e.preventDefault(); const first = res?.querySelector('button'); if (first) first.click(); else if (input.value.trim()) { onPick({ id: null, name: input.value.trim(), price_cents: 0, kind: 'service' }); input.value = ''; } } });
    document.addEventListener('click', (e) => { if (res && !wrap.contains(e.target)) { res.remove(); res = null; } });
  }

  // ---------- signature pad
  function sigPad(canvas) {
    const ctx = canvas.getContext('2d'); let drawing = false, dirty = false, last = null;
    const fit = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2); canvas.width = r.width * dpr; canvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#17131c'; };
    fit();
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pt(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; dirty = true; });
    canvas.addEventListener('pointerup', () => (drawing = false));
    return { clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; }, data: () => (dirty ? canvas.toDataURL('image/png') : null) };
  }
  // ---------- photos: downscale before upload (island mobile data)
  function compress(file, max = 1600) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that photo')); }; img.src = url;
    });
  }

  return { $, $$, esc, api, money, pd, nowLocal, date, short, time, when, ago, ymd, addDays, initials, label, badge, pipeline, STAGES, totals, totalsHtml, icon, logo, toast, modal, mhead, confirm, formData, busy, submit, router, pricebook, pbPicker, sigPad, compress };
})();
