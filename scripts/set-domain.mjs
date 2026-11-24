// Uso: node scripts/set-domain.mjs https://meuteto.com.br [https://app.meuteto.com.br]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const [site, app] = process.argv.slice(2);
if (!site || !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(site)) { console.error('Informe o domínio com https, ex.: node scripts/set-domain.mjs https://meuteto.com.br'); process.exit(1); }
const appUrl = app || site.replace('https://', 'https://app.');
const today = new Date().toISOString().slice(0, 10);
let n = 0;
for (const f of fs.readdirSync(root).filter((x) => /\.(html|xml|txt)$/.test(x))) {
  const p = path.join(root, f); let s = fs.readFileSync(p, 'utf8'); const before = s;
  s = s.replaceAll('https://app.SEU-DOMINIO.com.br', appUrl).replaceAll('https://SEU-DOMINIO.com.br', site);
  if (f === 'sitemap.xml') s = s.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  if (s !== before) { fs.writeFileSync(p, s); n++; console.log('atualizado:', f); }
}
console.log(n ? `Pronto: ${n} arquivo(s). Site: ${site} | Área do cliente: ${appUrl}` : 'Nada a alterar (o domínio já foi definido?).');
