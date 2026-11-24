(() => {
  'use strict';
  const cfg = Object.assign({ gaId: '', turnstileSiteKey: '', formEndpoint: '/api/lead', tokenEndpoint: '/api/form-token' }, window.MT_CONFIG || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = 'https://wa.me/5521979307473';

  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* ---------- menu ---------- */
  const mb = $('.menu-btn'), nav = $('#menu');
  if (mb && nav) {
    const close = () => { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-label', 'Abrir menu'); };
    mb.addEventListener('click', () => { const o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); mb.setAttribute('aria-label', o ? 'Fechar menu' : 'Abrir menu'); });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); mb.focus(); } });
  }

  /* ---------- analytics (só depois do consentimento) ---------- */
  const validGA = /^G-[A-Z0-9]{6,12}$/.test(cfg.gaId);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  let gaOn = false, gaLoaded = false;
  if (validGA) gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  function enableGA() {
    if (!validGA) return;
    gaOn = true; gtag('consent', 'update', { analytics_storage: 'granted' });
    if (gaLoaded) return; gaLoaded = true;
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.gaId); document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', cfg.gaId, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }
  function disableGA() {
    gaOn = false; if (!validGA) return;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    const parts = location.hostname.split('.'); const doms = ['', location.hostname, '.' + location.hostname, '.' + parts.slice(-2).join('.'), '.' + parts.slice(-3).join('.')];
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_')).forEach((n) => doms.forEach((d) => { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); }));
  }
  const track = (name, params) => { if (gaOn && validGA) gtag('event', name, params || {}); };

  /* ---------- banner de cookies ---------- */
  const KEY = 'mt_consent', banner = $('#cookie');
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.v === 1 ? v : null; } catch { return null; } };
  const save = (analytics) => { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics, t: Date.now() })); } catch { /* sem armazenamento: a escolha vale só nesta visita */ } };
  const show = (focus) => { if (!banner) return; banner.hidden = false; document.body.classList.add('has-cookie'); if (focus) { const b = $('[data-consent="essential"]', banner); if (b) b.focus(); } };
  const hide = () => { if (!banner) return; banner.hidden = true; document.body.classList.remove('has-cookie'); };
  const saved = read();
  if (saved) { if (saved.analytics) enableGA(); } else show(false);
  $$('[data-consent]').forEach((b) => b.addEventListener('click', () => { const all = b.dataset.consent === 'all'; save(all); all ? enableGA() : disableGA(); hide(); }));
  $$('[data-cookie-settings]').forEach((b) => b.addEventListener('click', () => show(true)));

  document.addEventListener('click', (e) => { const a = e.target.closest('[data-cta]'); if (a) track('cta_click', { cta_location: a.dataset.cta, link_url: a.href }); });

  /* ---------- formulário ---------- */
  const form = $('#lead'); if (!form) return;
  const ids = { name: 'f-nome', whatsapp: 'f-tel', email: 'f-mail', message: 'f-msg', consent: 'f-ok' };
  const errIds = { name: 'e-nome', whatsapp: 'e-tel', email: 'e-mail', message: 'e-msg', consent: 'e-ok' };
  const statusEl = $('#status'), btn = $('button[type=submit]', form);

  const digits = (v) => { let d = v.replace(/\D/g, ''); if (d.length > 11 && d.startsWith('55')) d = d.slice(2); return d.slice(0, 11); };
  const mask = (v) => { const d = digits(v); if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3'); if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3'); if (d.length > 2) return d.replace(/(\d{2})(\d{0,5})/, '($1) $2'); return d ? '(' + d : ''; };
  $('#f-tel').addEventListener('input', (e) => { e.target.value = mask(e.target.value); });

  const values = () => ({ name: $('#f-nome').value.trim(), whatsapp: digits($('#f-tel').value), email: $('#f-mail').value.trim(), message: $('#f-msg').value.trim(), consent: $('#f-ok').checked });
  function validate(d) {
    const e = {};
    if (d.name.length < 2 || !/\p{L}/u.test(d.name)) e.name = 'Informe seu nome (mínimo 2 letras).';
    if (!/^[1-9]{2}(?:9\d{8}|[2-5]\d{7})$/.test(d.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido com DDD, por exemplo (21) 99999-9999.';
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.email = 'Esse e-mail parece incompleto. Confira ou deixe em branco.';
    if (d.message.length > 500) e.message = 'A mensagem pode ter até 500 caracteres.';
    if (!d.consent) e.consent = 'Marque a caixa para podermos entrar em contato.';
    return e;
  }
  function showErrors(errs) {
    Object.keys(ids).forEach((k) => { const el = document.getElementById(ids[k]), er = document.getElementById(errIds[k]); er.textContent = errs[k] || ''; if (errs[k]) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
  }
  const say = (msg, kind) => { statusEl.textContent = msg || ''; statusEl.className = 'status' + (kind ? ' ' + kind : ''); };

  let tokenP = null;
  const getToken = () => (tokenP = tokenP || fetch(cfg.tokenEndpoint, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => (j && j.token) || null).catch(() => null));
  let tsToken = '', tsReady = false;
  function prepare() {
    if (prepare.done) return; prepare.done = true; getToken();
    if (cfg.turnstileSiteKey && !tsReady) {
      tsReady = true; const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
      s.onload = () => window.turnstile && window.turnstile.render('#ts-box', { sitekey: cfg.turnstileSiteKey, language: 'pt-br', callback: (t) => { tsToken = t; }, 'expired-callback': () => { tsToken = ''; } });
      document.head.appendChild(s);
    }
  }
  form.addEventListener('focusin', prepare); form.addEventListener('pointerdown', prepare);
  if ('IntersectionObserver' in window) new IntersectionObserver((en, ob) => { if (en.some((x) => x.isIntersecting)) { prepare(); ob.disconnect(); } }, { rootMargin: '400px' }).observe(form);

  function finish(d, viaWhatsApp) {
    const box = document.createElement('div'); box.className = 'done'; box.setAttribute('role', 'status');
    const h = document.createElement('h3'); const p = document.createElement('p'); p.className = 'muted'; const a = document.createElement('a'); a.className = 'btn btn-wa'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.cta = 'form-done';
    a.href = WA + '?text=' + encodeURIComponent('Olá! Meu nome é ' + d.name + '. Quero conhecer o Meu Teto.' + (d.message ? ' ' + d.message : ''));
    if (viaWhatsApp) { h.textContent = 'Falta só um passo'; p.textContent = 'Abra o WhatsApp para enviar sua mensagem. Ela já está pronta.'; a.textContent = 'Abrir WhatsApp'; }
    else { h.textContent = 'Recebemos seus dados'; p.textContent = 'A gente retorna em breve pelo WhatsApp. Se preferir, fale agora:'; a.textContent = 'Abrir WhatsApp'; }
    box.append(h, p, a); form.replaceChildren(box); box.scrollIntoView({ block: 'nearest' });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = values(), errs = validate(d); showErrors(errs); const first = Object.keys(errs)[0];
    if (first) { say('Revise os campos destacados.', 'bad'); document.getElementById(ids[first]).focus(); return; }
    if (cfg.turnstileSiteKey && !tsToken) { say('Confirme a verificação anti-robô e envie de novo.', 'bad'); return; }
    btn.disabled = true; say('Enviando…');
    try {
      const token = await getToken();
      if (!token) { finish(d, true); return; } // site estático, sem servidor de formulário: segue pelo WhatsApp
      const r = await fetch(cfg.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, website: $('[name=website]', form).value, token, ts: tsToken }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { track('generate_lead', { method: 'form' }); finish(d, false); return; }
      if (j.fields) showErrors(j.fields);
      if (j.code === 'token') { tokenP = null; getToken(); }
      say(j.error || 'Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.', 'bad');
    } catch { say('Sem conexão no momento. Tente de novo ou fale pelo WhatsApp.', 'bad'); }
    finally { btn.disabled = false; }
  });
})();
