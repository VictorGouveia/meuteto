import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, validateLead } from '../server.js';

const SECRET = 'x'.repeat(48);
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mt-')), 'leads.jsonl');
const open = [];
test.after(() => open.forEach((c) => c()));
async function boot(env = {}, extra = {}) {
  const clock = { t: Date.now() }; const file = tmp();
  const app = createApp({ env: { FORM_SECRET: SECRET, LEADS_FILE: file, ...env }, now: () => clock.t, ...extra });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => { server.close(); server.closeAllConnections?.(); }; open.push(close);
  return { base, clock, file, close };
}
const lead = (o = {}) => ({ name: 'Maria Souza', whatsapp: '(21) 97930-7473', email: '', message: 'Quero conhecer', consent: true, website: '', ...o });
async function post(base, body, headers = {}) {
  const r = await fetch(base + '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
}
async function token(s, advance = 4000) { const { token } = await (await fetch(s.base + '/api/form-token')).json(); s.clock.t += advance; return token; }
const leads = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

test('validação do contato (telefone BR, nome, e-mail, consentimento)', () => {
  for (const ok of ['21979307473', '(21) 97930-7473', '+55 21 97930-7473', '5521979307473', '2133334444']) assert.ok(validateLead(lead({ whatsapp: ok })).ok, ok);
  for (const bad of ['', '123', '21 8 9999 9999', '00979307473', '2197930747', '219793074733']) assert.ok(validateLead(lead({ whatsapp: bad })).fields.whatsapp, bad);
  assert.ok(validateLead(lead({ name: 'A' })).fields.name);
  assert.ok(validateLead(lead({ name: '12345' })).fields.name);
  assert.ok(validateLead(lead({ email: 'maria@' })).fields.email);
  assert.ok(validateLead(lead({ email: 'maria@exemplo.com.br' })).ok);
  assert.ok(validateLead(lead({ message: 'a'.repeat(501) })).fields.message);
  assert.ok(validateLead(lead({ consent: false })).fields.consent);
  assert.ok(validateLead(lead({ consent: 'true' })).fields.consent); // só o booleano true vale
  assert.equal(validateLead(lead({ whatsapp: '+55 (21) 97930-7473' })).value.whatsapp, '21979307473');
});

test('HTTPS: em produção redireciona HTTP e envia HSTS; escrita fora de HTTPS é bloqueada', async () => {
  const s = await boot({ NODE_ENV: 'production', SITE_URL: 'https://meuteto.com.br' });
  const r = await fetch(s.base + '/privacidade?a=1', { redirect: 'manual' });
  assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://meuteto.com.br/privacidade?a=1');
  const ok = await fetch(s.base + '/', { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.equal(ok.status, 200); assert.match(ok.headers.get('strict-transport-security'), /max-age=63072000/);
  assert.match(ok.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  assert.equal((await post(s.base, lead())).status, 403);
  s.close();
});
test('produção exige SITE_URL e FORM_SECRET fortes', () => {
  assert.throws(() => createApp({ env: { NODE_ENV: 'production', FORM_SECRET: SECRET } }), /SITE_URL/);
  assert.throws(() => createApp({ env: { NODE_ENV: 'production', SITE_URL: 'https://a.com.br' } }), /FORM_SECRET/);
});

test('cabeçalhos de segurança e CSP sem inline', async () => {
  const s = await boot();
  const r = await fetch(s.base + '/');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'(;|$)/); assert.match(csp, /style-src 'self'(;|$)/); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.headers.get('permissions-policy')); assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('strict-transport-security'), null); // em desenvolvimento não força HSTS
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  const img = await fetch(s.base + '/img/hero-720.webp'); assert.match(img.headers.get('cache-control'), /max-age=2592000/);
  s.close();
});

test('CSP só libera Google/Cloudflare quando configurados; chaves secretas nunca vão ao navegador', async () => {
  let s = await boot(); let csp = (await fetch(s.base + '/')).headers.get('content-security-policy');
  assert.doesNotMatch(csp, /googletagmanager|cloudflare|google-analytics/); s.close();
  s = await boot({ GA_MEASUREMENT_ID: 'G-ABC123XYZ9', TURNSTILE_SITE_KEY: 'SITEKEY-PUBLICA', TURNSTILE_SECRET_KEY: 'SEGREDO-NUNCA-NO-FRONT' });
  csp = (await fetch(s.base + '/')).headers.get('content-security-policy');
  assert.match(csp, /googletagmanager/); assert.match(csp, /challenges\.cloudflare\.com/);
  const cfg = await (await fetch(s.base + '/config.js')).text();
  assert.match(cfg, /G-ABC123XYZ9/); assert.match(cfg, /SITEKEY-PUBLICA/);
  for (const t of ['SEGREDO-NUNCA-NO-FRONT', SECRET]) { assert.ok(!cfg.includes(t)); }
  s.close();
  s = await boot({ GA_MEASUREMENT_ID: 'qualquer-coisa' }); assert.match(await (await fetch(s.base + '/config.js')).text(), /gaId":""/); s.close();
});

test('nenhum segredo nos arquivos públicos', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const bad = [];
  for (const f of walk(root).filter((x) => /\.(html|js|css|xml|txt|json|webmanifest)$/.test(x) || x.endsWith('.htaccess'))) {
    const s = fs.readFileSync(f, 'utf8');
    const m = s.match(/(secret|api[_-]?key|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA )?PRIVATE|password\s*[:=]|token\s*[:=]\s*['\"][A-Za-z0-9]{16,})/i);
    if (m) bad.push(path.relative(root, f) + ' [' + m[0] + ']');
  }
  assert.deepEqual(bad, [], 'possível segredo em: ' + bad.join(', '));
});

test('páginas, 404 próprio e API desconhecida', async () => {
  const s = await boot();
  for (const p of ['/', '/privacidade', '/termos', '/robots.txt', '/sitemap.xml', '/site.webmanifest', '/favicon.svg', '/favicon.ico', '/img/og-image.jpg']) assert.equal((await fetch(s.base + p)).status, 200, p);
  const nf = await fetch(s.base + '/nao-existe'); assert.equal(nf.status, 404);
  const html = await nf.text(); assert.match(html, /Página não encontrada/); assert.equal(nf.headers.get('x-robots-tag'), 'noindex');
  const api = await fetch(s.base + '/api/nada'); assert.equal(api.status, 404); assert.ok((await api.json()).error);
  assert.equal((await fetch(s.base + '/.htaccess')).status, 404); // arquivos ocultos não são servidos
  s.close();
});

test('FORMULÁRIO: token com tempo mínimo, uso único, honeypot, validação, origem', async () => {
  const s = await boot({ SITE_URL: 'http://x.local', LEAD_RATE_LIMIT: '100' }); const sent = (b, h) => post(s.base, b, h);
  // rápido demais
  let t = await token(s, 500); let r = await sent({ ...lead(), token: t }); assert.equal(r.status, 400); assert.equal(r.json.code, 'token'); assert.match(r.json.error, /rápido demais/);
  // token falso / ausente
  assert.equal((await sent({ ...lead(), token: 'abc.def' })).status, 400); assert.equal((await sent(lead())).status, 400);
  // token adulterado
  t = await token(s); assert.equal((await sent({ ...lead(), token: t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')) })).status, 400);
  // expirado
  t = await token(s, 0); s.clock.t += 3 * 3600 * 1000; r = await sent({ ...lead(), token: t }); assert.match(r.json.error, /expirou/);
  // honeypot: responde ok mas não salva
  t = await token(s); r = await sent({ ...lead({ website: 'http://spam.com' }), token: t }); assert.equal(r.status, 200); assert.equal(leads(s.file).length, 0);
  // campos inválidos
  t = await token(s); r = await sent({ ...lead({ name: '', whatsapp: '1', consent: false }), token: t });
  assert.equal(r.status, 400); assert.deepEqual(Object.keys(r.json.fields).sort(), ['consent', 'name', 'whatsapp']);
  // origem diferente
  t = await token(s); assert.equal((await sent({ ...lead(), token: t }, { Origin: 'https://site-malicioso.com' })).status, 403);
  // sucesso
  r = await sent({ ...lead(), token: t }, { Origin: 'http://x.local' }); assert.equal(r.status, 200);
  const saved = leads(s.file); assert.equal(saved.length, 1);
  assert.equal(saved[0].whatsapp, '21979307473'); assert.equal(saved[0].email, null); assert.equal(saved[0].consent_version, 'v1'); assert.ok(saved[0].consent_at && saved[0].id);
  assert.equal(Object.keys(saved[0]).includes('ip'), false); // minimização de dados: sem IP
  assert.equal(fs.statSync(s.file).mode & 0o777, 0o600);
  // reuso do mesmo token
  assert.equal((await sent({ ...lead(), token: t })).status, 400); assert.equal(leads(s.file).length, 1);
  // corpo inválido e grande
  assert.equal((await fetch(s.base + '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' })).status, 400);
  assert.equal((await post(s.base, { ...lead(), message: 'x'.repeat(20000) })).status, 400);
  s.close();
});

test('FORMULÁRIO: limite de envios por IP', async () => {
  const s = await boot({ LEAD_RATE_LIMIT: '3' }); const codes = [];
  for (let i = 0; i < 5; i++) { const t = await token(s); codes.push((await post(s.base, { ...lead(), token: t })).status); }
  assert.deepEqual(codes, [200, 200, 200, 429, 429]); assert.equal(leads(s.file).length, 3);
  s.close();
});

test('FORMULÁRIO: Turnstile verificado no servidor quando configurado', async () => {
  const calls = []; let ok = false;
  const fetchImpl = async (url, opts) => { calls.push({ url, body: String(opts.body) }); return { json: async () => ({ success: ok }) }; };
  const s = await boot({ TURNSTILE_SITE_KEY: 'pub', TURNSTILE_SECRET_KEY: 'priv' }, { fetchImpl });
  let t = await token(s); let r = await post(s.base, { ...lead(), token: t, ts: 'resp' });
  assert.equal(r.status, 400); assert.equal(r.json.code, 'captcha'); assert.equal(leads(s.file).length, 0);
  assert.match(calls[0].url, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/); assert.match(calls[0].body, /secret=priv/); assert.match(calls[0].body, /response=resp/);
  ok = true; t = await token(s); r = await post(s.base, { ...lead(), token: t, ts: 'resp' }); assert.equal(r.status, 200); assert.equal(leads(s.file).length, 1);
  s.close();
});
