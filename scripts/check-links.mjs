// Verifica links internos, âncoras, imagens e arquivos referenciados. Uso: node scripts/check-links.mjs [--online]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const online = process.argv.includes('--online');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const ids = (s) => new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const idsOf = Object.fromEntries(pages.map((f) => [f, ids(html[f])]));
const exists = (p) => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isFile();
function resolve(p) { // caminho do site -> arquivo
  if (p === '/' || p === '') return 'index.html';
  const clean = p.replace(/^\//, '');
  if (exists(clean)) return clean; if (exists(clean + '.html')) return clean + '.html'; return null;
}
const bad = [], warn = [], external = new Set(), domWarn = new Set(); let total = 0;
for (const f of pages) {
  const s = html[f];
  const refs = [...s.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const m of s.matchAll(/<meta[^>]*\scontent="(https?:\/\/[^"]+)"/g)) refs.push(m[1]);
  for (const m of s.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((x) => refs.push(x.trim().split(/\s+/)[0]));
  for (const r of refs) {
    if (/^(mailto:|tel:|data:|javascript:)/.test(r) || r === '' ) continue;
    if (/^https?:\/\//.test(r)) { if (/\.(jpg|png|webp)$/.test(r) || /SEU-DOMINIO/.test(r)) { if (/SEU-DOMINIO/.test(r)) domWarn.add(f); continue; } external.add(r); continue; }
    if (!/^[#/]/.test(r)) continue; // texto de meta (content="...")
    total++;
    const [pathPart, hash] = r.split('#'); const target = pathPart ? resolve(pathPart.split('?')[0]) : f;
    if (!target) { bad.push(`${f}: arquivo não encontrado -> ${r}`); continue; }
    if (hash && target.endsWith('.html') && !idsOf[target]?.has(hash)) bad.push(`${f}: âncora inexistente -> ${r}`);
  }
}
for (const f of domWarn) warn.push(`${f}: ainda usa o domínio de exemplo SEU-DOMINIO.com.br (rode: npm run domain -- https://seudominio.com.br)`);
for (const f of pages) { const n = (html[f].match(/class="ph"/g) || []).length; if (n) warn.push(`${f}: ${n} campo(s) [PREENCHER/CONFIRMAR] a completar antes de publicar`); if (!/\salt="/.test(html[f].replace(/<img[^>]*alt=/g, 'alt='))) {} }
for (const f of pages) for (const m of html[f].matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) bad.push(`${f}: imagem sem texto alternativo -> ${m[0].slice(0, 60)}`);
if (online) for (const u of external) { try { const r = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) }); if (r.status >= 400) bad.push(`externo respondeu ${r.status}: ${u}`); } catch (e) { bad.push(`externo inacessível: ${u} (${e.message})`); } }
console.log(`Referências internas conferidas: ${total} | páginas: ${pages.length} | links externos: ${[...external].length}`);
[...external].forEach((u) => console.log('  externo:', u));
warn.forEach((w) => console.log('AVISO:', w));
if (bad.length) { bad.forEach((b) => console.log('ERRO:', b)); process.exit(1); } else console.log('Nenhum link quebrado.');
