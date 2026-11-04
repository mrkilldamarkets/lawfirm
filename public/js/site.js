// =========================================================================
// ADDERLEY MOSS — website runtime.
// =========================================================================
import { createSeal } from '/js/seal.js';
const { $, $$, esc, api } = NC;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, mobile = matchMedia('(max-width: 980px)').matches;
const money = (c) => 'B$' + Math.round((c || 0) / 100).toLocaleString('en-US');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// masthead hides on the way down, returns on the way up
let lastY = 0; addEventListener('scroll', () => { $('#mast').classList.toggle('is-hidden', scrollY > lastY && scrollY > 500); lastY = scrollY; }, { passive: true });
api('/api/me').then((m) => { const a = $('#acct'); a.textContent = m.role === 'client' ? 'My matters' : 'Console'; a.href = m.role === 'client' ? '/portal' : '/console'; }).catch(() => {});

// live clock in the margin, like a docket stamp
const clock = () => { const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Nassau' })); $('#clock').textContent = `Nassau ${n.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${n.toTimeString().slice(0, 5)}`; $('#docref').textContent = `AM/${n.getFullYear()}/SEAL/${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`; };
clock(); setInterval(clock, 30000);

// hero redlines: strike the legalese, write in the plain version
const strike = () => {
  $('#redl').classList.add('struck'); setTimeout(() => $('#redl').classList.add('swapped'), reduced ? 0 : 750);
  $$('#legal del').forEach((d, i) => setTimeout(() => { d.classList.add('x'); setTimeout(() => d.nextElementSibling?.removeAttribute('hidden'), reduced ? 0 : 450); }, reduced ? 0 : 1100 + i * 900));
};
setTimeout(strike, reduced ? 0 : 1300);

// the seal
const stage = $('#stage');
createSeal(stage, { mobile, reduced, onStamp: () => stage.classList.add('stamped') }).then((s) => addEventListener('scroll', () => s.setScroll(Math.min(1, scrollY / innerHeight)), { passive: true })).catch(() => stage.classList.add('stamped'));

// tracked changes in § 2 — each clause is redlined as it reaches the middle of the screen
const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add('on'); const n = e.target.dataset.n; if (n) $(`.cnote[data-c="${n}"]`)?.classList.add('on'); io.unobserve(e.target); }), { rootMargin: '-35% 0px -35% 0px' });
$$('.chg').forEach((p) => io.observe(p));

// data
const info = await api('/api/public/info'); const F = info.firm, AREA = Object.fromEntries(info.areas.map((a) => [a.key, a]));
$('#yrs').textContent = `${info.stats.years} years in practice`;
$('#stats').innerHTML = `<div><b>${info.stats.years}</b><span>Years at the Bar</span></div><div><b>${info.stats.attorneys}</b><span>Attorneys</span></div><div><b>${info.stats.matters.toLocaleString()}</b><span>Matters opened</span></div><div><b>8</b><span>Practice areas</span></div>`;
$('#tick').innerHTML = [...Array(2)].map(() => [...info.areas.map((a) => a.name), 'Conflict-checked enquiries', 'Fees in writing', 'Six-minute billing', 'Audited client account', 'Secure client portal', 'Privy Council appeals'].map((t) => `<span>${esc(t)}</span>`).join('')).join('');
$('#addr').textContent = F.address; $('#addr2').textContent = F.address2; $('#ph').textContent = F.phone; $('#em').textContent = F.email;

// § 3 practice index
const BLURB = { corporate: 'Acquisitions, joint ventures, shareholder agreements and the governance that keeps companies out of court.', realestate: 'Title, conveyancing and development work, from a first home in Westridge to a resort on Exuma.', litigation: 'Commercial, insurance and construction disputes, from letter before action to the Privy Council.', private: 'Wills, trusts and estates for families with assets here and abroad.', family: 'Divorce, custody and maintenance, handled privately and in plain language.', immigration: 'Work permits, residency and spousal permits for employers and families.', financial: 'Fund launches, licensing and regulatory work with the Securities Commission and Central Bank.', employment: 'Contracts, redundancies, grievances and Industrial Tribunal claims.' };
const pkgFor = (k) => info.packages.filter((p) => p.area === k);
$('#toc').innerHTML = info.areas.map((a, i) => `<div class="toc__row" role="listitem" tabindex="0" aria-expanded="false"><span class="toc__n">${String(i + 1).padStart(2, '0')}</span><span class="toc__t"><h3>${esc(a.name)}</h3><span class="dots"></span></span><span class="toc__p">${pkgFor(a.key).length ? 'Fixed fee from ' + money(Math.min(...pkgFor(a.key).map((p) => p.fixed))) : a.fee_cents ? 'Consultation ' + money(a.fee_cents) : 'Consultation complimentary'}</span>
  <div class="toc__more"><div><p>${esc(BLURB[a.key])}</p><p style="margin-top:14px"><a class="pill pill--line pill--sm" href="#instruct" data-area="${a.key}">Instruct us on this <i>→</i></a></p></div><div><p class="meta" style="margin-bottom:10px">How it moves</p><ol class="stages">${a.stages.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div></div>`).join('');
$$('.toc__row').forEach((r) => { const t = () => { const o = r.getAttribute('aria-expanded') !== 'true'; $$('.toc__row').forEach((x) => x.setAttribute('aria-expanded', 'false')); r.setAttribute('aria-expanded', o); }; r.onclick = (e) => { if (!e.target.closest('a')) t(); }; r.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), t()); });

// § 5 signatories
$('#sigs').innerHTML = info.people.map((p) => `<button type="button" class="sig" data-slug="${esc(p.slug)}"><div class="sig__s"><span>${esc(p.name)}</span></div><h3>${esc(p.name)}</h3><p class="t">${esc(p.title)}${p.bar_year ? ' · called ' + p.bar_year : ''}</p><p>${esc(p.bio || '')}</p><p class="sig__a">${esc(p.areas.map((k) => AREA[k]?.name).filter(Boolean).join(' · '))}</p></button>`).join('');
const sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('on'), Number(e.target.dataset.d || 0)); sio.unobserve(e.target); } }), { threshold: 0.5 });
$$('.sig').forEach((s, i) => { s.dataset.d = (i % 3) * 260; sio.observe(s); s.onclick = () => openPerson(s.dataset.slug, true); });

// overlay (dossier / article)
function overlay(html, onClose) {
  const o = document.createElement('div'); o.className = 'over'; o.innerHTML = `<div class="over__p" role="dialog" aria-modal="true"><button class="pill pill--line pill--sm over__x" data-x>Close ✕</button>${html}</div>`; document.body.append(o); document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => o.classList.add('is-open')); const close = () => { o.classList.remove('is-open'); document.body.style.overflow = ''; setTimeout(() => o.remove(), 350); onClose && onClose(); removeEventListener('keydown', k); };
  const k = (e) => e.key === 'Escape' && close(); addEventListener('keydown', k); o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-x]')) close(); }); setTimeout(() => $('[data-x]', o).focus(), 50); return close;
}
function openPerson(slug, push) {
  const p = info.people.find((x) => x.slug === slug); if (!p) return; if (push) history.pushState(null, '', '/people/' + slug);
  const by = info.articles.filter((a) => a.author === p.name);
  overlay(`<article class="dossier"><p class="meta">Dossier · ${esc(p.title)}</p><p class="dossier__sig">${esc(p.name)}</p><h2 class="d2">${esc(p.name)}</h2><p class="lede" style="margin-top:14px">${esc(p.bio || '')}</p>
    <dl><dt>Practice</dt><dd>${esc(p.areas.map((k) => AREA[k]?.name).join(', '))}</dd><dt>Called to the Bar</dt><dd>${p.bar_year || '—'}</dd><dt>Admitted</dt><dd>${esc(p.admissions || 'The Bahamas')}</dd><dt>Education</dt><dd>${p.education.map(esc).join('<br>')}</dd><dt>Languages</dt><dd>${esc(p.languages || 'English')}</dd></dl>
    ${by.length ? `<p class="meta" style="margin-top:30px">Writing</p>${by.map((a) => `<p style="margin-top:8px"><a href="/insights/${esc(a.slug)}" data-art="${esc(a.slug)}" class="d3" style="text-decoration:none">${esc(a.title)}</a></p>`).join('')}` : ''}
    <p style="margin-top:34px"><a class="pill pill--red" href="#instruct" data-close-over>Request a consultation with ${esc(p.name.split(' ')[0])} <i>→</i></a></p></article>`, () => history.replaceState(null, '', '/'));
}
async function openArticle(slug, push) {
  const a = await api('/api/public/article/' + slug).catch(() => null); if (!a) return; if (push) history.pushState(null, '', '/insights/' + slug);
  overlay(`<article class="article"><p class="meta" style="color:var(--red)">${esc(AREA[a.area]?.name || '')} · ${a.minutes} min read</p><h1>${esc(a.title)}</h1><p class="lede" style="margin-top:14px">${esc(a.dek)}</p><p class="meta" style="margin-top:18px">By ${esc(a.author)} · ${new Date(a.published_on + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p><hr class="rule" style="margin-top:18px"><div class="body">${a.body.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div><p style="margin-top:30px"><a class="pill pill--red" href="#instruct" data-close-over>Speak to ${esc(a.author.split(' ')[0])} <i>→</i></a></p></article>`, () => history.replaceState(null, '', '/'));
}
document.addEventListener('click', (e) => { const a = e.target.closest('[data-art]'); if (a) { e.preventDefault(); $$('.over').forEach((o) => o.remove()); openArticle(a.dataset.art, true); } const c = e.target.closest('[data-close-over]'); if (c) { $$('.over').forEach((o) => o.remove()); document.body.style.overflow = ''; } });
const [, kind, slug] = location.pathname.split('/'); if (kind === 'people') openPerson(slug); if (kind === 'insights') openArticle(slug);
addEventListener('popstate', () => { $$('.over').forEach((o) => o.remove()); document.body.style.overflow = ''; });

// § 6 fees
$('#sched').innerHTML = info.packages.map((p) => `<div class="sched__row"><div><h4>${esc(p.name)}</h4><ul>${p.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><p class="price">${money(p.fixed)}<small>fixed + VAT</small></p></div>`).join('') + `<div class="sched__row"><div><h4>Conveyancing</h4><ul><li>Title search &amp; abstract</li><li>Agreement for sale</li><li>Stamping &amp; recording</li></ul></div><p class="price">2.5%<small>of price + VAT</small></p></div>`;
let side = 'buyer'; const cf = $('#convF');
async function conv() { try { const r = await api('/api/public/estimate/conveyancing', { price: cf.price.value, side, mortgage: cf.mortgage.checked, first_home: cf.first_home.checked });
  $('#stmt').innerHTML = r.lines.map((l) => `<div><span>${esc(l.label)}</span><b>${money(l.cents)}</b></div>`).join('') + `<div class="tot"><span>Your costs, approximately</span><b>${money(r.total_cents)}</b></div>${r.note ? `<p class="fine" style="margin-top:8px">${esc(r.note)}</p>` : ''}`; } catch (e) { $('#stmt').innerHTML = `<p class="fine">${esc(e.message)}</p>`; } }
let ct; cf.oninput = () => { clearTimeout(ct); ct = setTimeout(conv, 220); }; cf.price.onblur = () => { const n = Number(cf.price.value.replace(/[^\d]/g, '')); if (n) cf.price.value = n.toLocaleString('en-US'); };
$$('[data-side]').forEach((b) => (b.onclick = () => { side = b.dataset.side; $$('[data-side]').forEach((x) => x.setAttribute('aria-checked', x === b)); cf.first_home.closest('label').hidden = side === 'seller'; conv(); })); conv();

// § 7 insights
$('#press').innerHTML = info.articles.slice(0, 6).map((a) => `<a href="/insights/${esc(a.slug)}" data-art="${esc(a.slug)}"><p class="kicker">${esc(AREA[a.area]?.name || '')} · ${a.minutes} min</p><h3>${esc(a.title)}</h3><p>${esc(a.dek)}</p><p class="by">${esc(a.author)} · ${new Date(a.published_on + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p></a>`).join('');

// § 8 instruct
let area = null;
$('#areas').innerHTML = info.areas.map((a) => `<button type="button" class="area" role="radio" aria-checked="false" data-a="${a.key}">${esc(a.name)}</button>`).join('');
const setArea = (k) => { area = k; $$('.area').forEach((b) => b.setAttribute('aria-checked', b.dataset.a === k)); const a = AREA[k]; $('#consultFees').textContent = a ? `${a.name}: ${a.fee_cents ? `consultation ${money(a.fee_cents)}, paid when you book and credited against your first bill if you instruct us` : 'first consultation complimentary'}.` : ''; };
$$('.area').forEach((b) => (b.onclick = () => setArea(b.dataset.a)));
document.addEventListener('click', (e) => { const a = e.target.closest('[data-area]'); if (a) setArea(a.dataset.area); });
$('#consultFees').textContent = 'Consultation fees are stated before you book. Wills and estate planning: first consultation complimentary.';
$('#inF').onsubmit = async (e) => { e.preventDefault(); const f = e.target, err = $('.err', f), btn = $('#inGo'); err.textContent = '';
  if (!area) return (err.textContent = 'Choose the area of law.');
  btn.disabled = true; btn.innerHTML = 'Checking our records…';
  try { const r = await api('/api/public/intake', { name: f.name.value, company: f.company.value, email: f.email.value, phone: f.phone.value, adverse: f.adverse.value, summary: f.summary.value, urgency: f.urgent.checked ? 'high' : 'normal', consent: f.consent.checked, area }); location.href = '/i/' + r.token; }
  catch (er) { err.textContent = er.message; btn.disabled = false; btn.innerHTML = 'Run the conflict check <i>→</i>'; } };
