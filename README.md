# Meu Teto: landing page de vendas

Site de apresentação e vendas do sistema **Meu Teto**, com chamada para o WhatsApp **+55 21 97930-7473**.
HTML, CSS e JavaScript puros (sem framework), mais um servidor Node pequeno para o formulário, o HTTPS e os cabeçalhos de segurança.

```
public/            site (index, privacidade, termos, 404, css, js, img, fonts, robots, sitemap, favicon, .htaccess)
server.js          servidor: HTTPS, cabeçalhos, formulário com anti-spam, 404
scripts/           set-domain (troca o domínio), check-links (confere links), make_pages (gera páginas internas)
test/              testes automáticos do servidor
nginx.conf.example exemplo de configuração para VPS/KVM
.env.example       variáveis de ambiente (nenhuma chave vai para o navegador)
```

## Rodar no seu computador
```bash
npm install
npm start          # http://localhost:3000
npm test           # 10 testes do servidor
npm run check      # confere links, âncoras, imagens e textos alternativos
```
Requer Node 22.9 ou mais novo.

## Antes de publicar (o que só você pode preencher)
1. **Domínio:** `npm run domain -- https://seudominio.com.br` troca todos os endereços de exemplo (canonical, prévia social, sitemap, robots). O link "Já sou cliente: entrar" aponta para `https://app.seudominio.com.br`; passe um segundo argumento se a área do cliente for em outro endereço.
2. **Políticas:** em `/privacidade` e `/termos`, procure os campos destacados em amarelo (`[PREENCHER ...]` e `[CONFIRMAR ...]`: razão social, CNPJ/CPF, e-mail de privacidade, prazos, foro). O comando `npm run check` lista quantos faltam. **São modelos e precisam de revisão de um advogado.** Para mudar o texto, edite `scripts/make_pages.py` e rode `npm run pages`.
3. **Analytics (opcional):** coloque o ID `G-XXXXXXXXXX` do Google Analytics 4 em `GA_MEASUREMENT_ID`. Sem o ID, nada é carregado. Depois atualize a seção de cookies da política.
4. **Anti-robô extra (opcional):** crie um site no Cloudflare Turnstile (gratuito) e preencha `TURNSTILE_SITE_KEY` (pública) e `TURNSTILE_SECRET_KEY` (secreta, só no servidor).

## Publicar em VPS/KVM (recomendado: formulário e HTTPS completos)
1. Instale Node 22, Nginx, Certbot e PM2. Envie esta pasta para o servidor e rode `npm ci --omit=dev`.
2. Copie `.env.example` para `.env` e preencha `SITE_URL` e `FORM_SECRET` (o comando para gerar está no arquivo). O servidor **não inicia em produção** sem esses dois valores.
3. `pm2 start "npm start" --name meuteto-landing && pm2 save && pm2 startup`
4. Use `nginx.conf.example` (troque o domínio) e gere o certificado: `sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br`.
5. Os contatos do formulário ficam em `data/leads.jsonl` (uma linha por contato, arquivo com permissão restrita, fora da pasta pública). Faça backup e defina por quanto tempo guarda (a política pede um prazo).

## Publicar em hospedagem compartilhada (só arquivos)
Envie o **conteúdo de `public/`** para `public_html`. O `.htaccess` faz HTTPS, URLs limpas, 404 próprio, compressão, cache e cabeçalhos. Sem o servidor Node, o formulário continua funcionando em modo reserva: valida os campos e abre o WhatsApp com a mensagem pronta (nada é gravado). Se ativar o Google Analytics, ajuste o `Content-Security-Policy` do `.htaccess` (há um comentário no arquivo).

## Os 20 itens, onde estão e como foram verificados
Verificações feitas aqui, com navegador real (Chromium), Lighthouse, axe-core e testes automáticos.

| # | Item | Onde está | Verificação |
|---|---|---|---|
| 1 | Política de Privacidade | `/privacidade` (LGPD, base legal, cookies, direitos) | Página abre; axe sem violações; campos a preencher listados por `npm run check` |
| 2 | Termos e Condições | `/termos` | Idem |
| 3 | Chaves fora do front-end | Segredos só no `.env` do servidor; `config.js` entrega apenas ID de métricas e chave pública | Teste automático varre `public/` atrás de segredos: nenhum; teste confirma que a chave secreta e o `FORM_SECRET` não aparecem em `/config.js` |
| 4 | Forçar HTTPS | `server.js` (301 + HSTS + `upgrade-insecure-requests`), `nginx.conf.example`, `.htaccess` | Teste: HTTP responde 301 para `https://seu-domínio/…`; envio de formulário por HTTP é bloqueado |
| 5 | Banner de cookies | Rodapé e banner; `js/main.js` | 8 verificações no navegador: aparece na 1ª visita, nada carrega antes do aceite, recusar vale e é lembrado, "Gerenciar cookies" reabre, aceitar carrega o GA só então |
| 6 | Meta títulos e descrições | Todas as páginas (title, description, canonical, Open Graph, Twitter, JSON-LD) | Lighthouse SEO **100** (celular e computador) |
| 7 | Imagem de prévia social | `img/og-image.jpg` (1200×630, 72 KB) | Conferida visualmente |
| 8 | Favicon | SVG, ICO, Apple Touch, 192/512 e `site.webmanifest` | Arquivos servidos com status 200 (teste) |
| 9 | Sitemap e robots.txt | `public/sitemap.xml`, `public/robots.txt` | Servidos com 200; `npm run domain` atualiza endereços e data |
| 10 | Texto alternativo | Todas as imagens têm `alt` descritivo | `npm run check` falha se faltar; Lighthouse acessibilidade **100** |
| 11 | Imagens comprimidas | WebP em 2 tamanhos (360 e 720 px; 19 a 50 KB cada), sem pixel desperdiçado; `loading="lazy"` abaixo da dobra | Primeira tela carrega **106 KB** no total |
| 12 | Velocidade | Fonte própria única, sem bibliotecas, JS de ~9 KB, gzip, cache longo, `width`/`height` em imagens | Lighthouse: computador **100**, celular **90**. Medido em 4G lenta com CPU 4× mais lenta: FCP/LCP ≈ **0,9 s**, CLS **0**. (O "Speed Index" do Lighthouse no celular veio alto por falha de captura de quadros neste ambiente sem GPU; rode o PageSpeed Insights no domínio real para confirmar) |
| 13 | Contraste | Todas as combinações de cor ≥ 5,2:1 (mínimo exigido: 4,5:1) | Calculado par a par, inclusive no pior caso de brilho do fundo; axe sem violações |
| 14 | Bom no celular | Mobile primeiro, barra fixa de WhatsApp, menu, alvos de toque ≥ 44 px | Sem rolagem lateral de 320 a 2560 px; alvos ≥ 44 px; menu abre e fecha |
| 15 | Página 404 própria | `404.html`; servidor e `.htaccess` | Teste: endereço inexistente responde 404 com a página própria e `noindex` |
| 16 | Corrigir links quebrados | `npm run check` (`--online` testa também os externos) | 114 referências internas conferidas: **nenhum link quebrado** |
| 17 | Validar formulários | Navegador (mensagens em português, máscara de telefone) e servidor (mesma regra) | Testes cobrem telefone brasileiro, nome, e-mail, tamanho e consentimento |
| 18 | Proteção contra spam | Campo-armadilha, token assinado com tempo mínimo de 3 s e uso único, limite de 5 envios por hora por IP, checagem de origem, Turnstile opcional | Testes: robô rápido, token falso/adulterado/expirado/reutilizado, honeypot, limite e Turnstile |
| 19 | Analytics | GA4 por configuração; só carrega após aceite; eventos `cta_click` e `generate_lead` | Testado com um ID de teste, com a rede interceptada: nenhuma requisição ao Google antes do aceite. **Não foi testado com um ID real do seu Google Analytics** |
| 20 | CTA clara | Botão de WhatsApp no cabeçalho, topo, seções, rodapé e barra fixa no celular; formulário no final | Link `wa.me/5521979307473` com mensagem pronta conferido |

## Limites desta entrega
- As telas do site são capturas reais do sistema com **dados fictícios**; a página avisa isso. Não há depoimentos nem números de clientes porque não existem dados reais para citar.
- Os preços não aparecem: a seção "Quanto custa?" leva ao WhatsApp. Se quiser tabela de planos, informe os valores.
- O texto das políticas é um modelo, e a conformidade com a LGPD depende do preenchimento correto e da revisão jurídica.
- Não foi possível testar o WhatsApp em si nem o Google Analytics real a partir deste ambiente.
