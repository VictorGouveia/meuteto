import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, 'public');

const PHONE_RE = /^[1-9]{2}(?:9\d{8}|[2-5]\d{7})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim() : '');

export function validateLead(b = {}) {
  const f = {};
  const name = str(b.name), email = str(b.email), message = str(b.message);
  let phone = typeof b.whatsapp === 'string' ? b.whatsapp.replace(/\D/g, '') : '';
  if (phone.length > 11 && phone.startsWith('55')) phone = phone.slice(2);
  if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name)) f.name = 'Informe seu nome (mínimo 2 letras).';
  if (!PHONE_RE.test(phone)) f.whatsapp = 'Informe um WhatsApp válido com DDD, por exemplo (21) 99999-9999.';
  if (email && (email.length > 160 || !EMAIL_RE.test(email))) f.email = 'Esse e-mail parece incompleto. Confira ou deixe em branco.';
  if (message.length > 500) f.message = 'A mensagem pode ter até 500 caracteres.';
  if (b.consent !== true) f.consent = 'Marque a caixa para podermos entrar em contato.';
  return { fields: f, ok: Object.keys(f).length === 0, value: { name, whatsapp: phone, email: email || null, message: message || null } };
}

export function createApp({ env = process.env, now = () => Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const isProd = env.NODE_ENV === 'production';
  const forceHttps = isProd || env.FORCE_HTTPS === '1';
  const secret = env.FORM_SECRET || (isProd ? '' : 'dev-only-secret-dev-only-secret-0123456789');
  if (secret.length < 32) throw new Error('FORM_SECRET precisa ter pelo menos 32 caracteres.');
  const siteUrl = (env.SITE_URL || '').replace(/\/$/, '');
  if (forceHttps && !siteUrl) throw new Error('SITE_URL é obrigatório em produção (ex.: https://meuteto.com.br).');
  const gaId = /^G-[A-Z0-9]{6,12}$/.test(env.GA_MEASUREMENT_ID || '') ? env.GA_MEASUREMENT_ID : '';
  const tsSite = env.TURNSTILE_SITE_KEY || '', tsSecret = env.TURNSTILE_SECRET_KEY || ''; // a chave secreta nunca vai ao navegador
  const leadsFile = env.LEADS_FILE || path.join(here, 'data', 'leads.jsonl');
  const minAge = Number(env.FORM_MIN_SECONDS ?? 3) * 1000, maxAge = 2 * 3600 * 1000;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(env.TRUST_PROXY ?? 1));

  // 4. Forçar HTTPS (atrás do Nginx, que envia X-Forwarded-Proto)
  if (forceHttps) {
    const host = new URL(siteUrl).host;
    app.use((req, res, next) => {
      if (req.secure) return next();
      if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(301, `https://${host}${req.originalUrl}`);
      return res.status(403).json({ error: 'Use HTTPS.' });
    });
  }

  const script = ["'self'"], connect = ["'self'"], img = ["'self'", 'data:'];
  let frame = ["'none'"];
  if (gaId) { script.push('https://www.googletagmanager.com'); connect.push('https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'); img.push('https://*.google-analytics.com', 'https://*.googletagmanager.com'); }
  if (tsSite) { script.push('https://challenges.cloudflare.com'); frame = ['https://challenges.cloudflare.com']; }
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'self'"], scriptSrc: script, styleSrc: ["'self'"], imgSrc: img, fontSrc: ["'self'"], connectSrc: connect, frameSrc: frame, objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"], ...(forceHttps ? { upgradeInsecureRequests: [] } : {}) } },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: forceHttps ? { maxAge: 63072000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use((req, res, next) => { res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'); next(); });
  app.use(compression());

  // 3. Chaves fora do front-end: o navegador só recebe valores públicos (ID de métricas e chave pública do Turnstile)
  app.get('/config.js', (req, res) => {
    res.type('application/javascript').set('Cache-Control', 'no-cache')
      .send(`window.MT_CONFIG=${JSON.stringify({ gaId, turnstileSiteKey: tsSite, formEndpoint: '/api/lead', tokenEndpoint: '/api/form-token' })};`);
  });

  // 18. Proteção contra spam: token assinado com tempo mínimo, uso único, honeypot, limite por IP e Turnstile opcional
  const sign = (t) => crypto.createHmac('sha256', secret).update(String(t)).digest('hex');
  const used = new Map();
  const gc = () => { const t = now(); for (const [k, exp] of used) if (exp < t) used.delete(k); };
  app.get('/api/form-token', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }), (req, res) => {
    const t = now(); res.set('Cache-Control', 'no-store').json({ token: `${t}.${sign(t)}` });
  });
  function tokenState(tok) {
    if (typeof tok !== 'string') return 'bad';
    const [t, sig] = tok.split('.');
    if (!/^\d{10,16}$/.test(t || '') || !sig) return 'bad';
    const exp = sign(t);
    if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return 'bad';
    const age = now() - Number(t);
    if (age < minAge) return 'fast'; if (age > maxAge) return 'old';
    if (used.has(tok)) return 'bad';
    return 'ok';
  }
  const leadLimiter = rateLimit({ windowMs: 3600_000, limit: Number(env.LEAD_RATE_LIMIT ?? 5), standardHeaders: true, legacyHeaders: false, message: { error: 'Muitos envios por aqui. Fale com a gente pelo WhatsApp ou tente mais tarde.', code: 'rate' } });

  app.post('/api/lead', express.json({ limit: '10kb', strict: true }), leadLimiter, async (req, res) => {
    const origin = req.get('Origin');
    if (origin && siteUrl && origin !== siteUrl) return res.status(403).json({ error: 'Origem não permitida.' });
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (str(b.website)) return res.json({ ok: true }); // honeypot: robôs acham que deu certo e nada é salvo
    const st = tokenState(b.token);
    if (st !== 'ok') return res.status(400).json({ code: 'token', error: st === 'fast' ? 'Você enviou rápido demais. Aguarde alguns segundos e envie de novo.' : 'O formulário expirou. Envie de novo.' });
    const v = validateLead(b);
    if (!v.ok) return res.status(400).json({ error: 'Revise os campos destacados.', fields: v.fields });
    if (tsSecret) {
      try {
        const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: tsSecret, response: str(b.ts), remoteip: req.ip }), signal: AbortSignal.timeout(5000) });
        if (!(await r.json()).success) throw new Error('falhou');
      } catch { return res.status(400).json({ code: 'captcha', error: 'A verificação anti-robô falhou. Tente de novo.' }); }
    }
    used.set(b.token, now() + maxAge); gc();
    try {
      fs.mkdirSync(path.dirname(leadsFile), { recursive: true, mode: 0o700 });
      const at = new Date(now()).toISOString();
      fs.appendFileSync(leadsFile, JSON.stringify({ id: crypto.randomUUID(), at, ...v.value, consent_at: at, consent_version: 'v1' }) + '\n', { mode: 0o600 });
    } catch (e) { console.error('Falha ao salvar contato:', e.code || 'erro'); return res.status(500).json({ error: 'Não foi possível enviar agora. Fale com a gente pelo WhatsApp.' }); }
    res.json({ ok: true });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

  // 12. Velocidade: gzip, cache longo para imagens/fontes, HTML sempre revalidado
  app.use(express.static(pub, {
    extensions: ['html'], index: 'index.html',
    setHeaders: (res, file) => {
      if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (/\.(webp|jpe?g|png|svg|ico|woff2)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=2592000');
      else res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  }));

  // 15. Página 404 própria
  app.use((req, res) => res.status(404).set('X-Robots-Tag', 'noindex').sendFile(path.join(pub, '404.html')));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') return res.status(400).json({ error: 'Dados inválidos.' });
    console.error('Erro:', err?.message); res.status(500).json({ error: 'Erro interno.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000), host = process.env.HOST ?? '127.0.0.1';
  createApp().listen(port, host, () => console.log(`Meu Teto (landing) em http://${host}:${port}`));
}
