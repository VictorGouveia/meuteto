# Gera privacidade.html, termos.html e 404.html reaproveitando cabeçalho/rodapé do index.html
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'public'
src = (root / 'index.html').read_text()
SITE = 'https://SEU-DOMINIO.com.br'
head = src[:src.index('</head>') + 7]
head = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', head, flags=re.S)
bodystart = src[src.index('<body>'):src.index('<main id="conteudo">')].replace('href="#', 'href="/#')
tail = src[src.index('</main>') + 7:]

def page(fname, title, desc, path, main, noindex=False):
    h = head
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', h)
    h = re.sub(r'(name="description" content=")[^"]*', r'\g<1>' + desc, h)
    h = re.sub(r'(rel="canonical" href=")[^"]*', r'\g<1>' + SITE + path, h)
    h = re.sub(r'(property="og:title" content=")[^"]*', r'\g<1>' + title, h)
    h = re.sub(r'(property="og:description" content=")[^"]*', r'\g<1>' + desc, h)
    h = re.sub(r'(property="og:url" content=")[^"]*', r'\g<1>' + SITE + path, h)
    h = re.sub(r'(name="twitter:title" content=")[^"]*', r'\g<1>' + title, h)
    h = re.sub(r'(name="twitter:description" content=")[^"]*', r'\g<1>' + desc, h)
    if noindex:
        h = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, follow">', h)
    (root / fname).write_text(h + bodystart + '<main id="conteudo">' + main + '</main>' + tail)

ph = lambda t: f'<mark class="ph">[{t}]</mark>'

PRIV = f'''<div class="wrap doc">
<h1>Política de Privacidade</h1>
<p class="muted">Vigência: {ph("PREENCHER A DATA")}. Esta política explica como o site do Meu Teto trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).</p>
<h2>1. Quem é o controlador</h2>
<p>O controlador dos dados é {ph("RAZÃO SOCIAL OU NOME")}, {ph("CNPJ OU CPF")}, com endereço em {ph("ENDEREÇO")}. Canal de privacidade (encarregado): {ph("E-MAIL DE PRIVACIDADE")}.</p>
<p>O uso do sistema Meu Teto (área do cliente) é regido pela Política de Privacidade exibida dentro do próprio sistema. Esta página trata apenas do site de apresentação.</p>
<h2>2. Dados que coletamos</h2>
<ul>
<li><b>Formulário de contato:</b> nome, WhatsApp, e-mail e mensagem (os dois últimos são opcionais), além do registro do seu aceite desta política (data e hora).</li>
<li><b>Botões de WhatsApp:</b> ao clicar, você é levado ao WhatsApp. A conversa passa a ser tratada pelo WhatsApp (Meta), conforme as políticas deles.</li>
<li><b>Dados técnicos de acesso:</b> o servidor pode registrar endereço IP, data, hora e navegador, para segurança e prevenção a abusos.</li>
<li><b>Estatísticas de uso (somente com a sua permissão):</b> páginas visitadas, cliques nos botões e informações aproximadas do aparelho. {ph("CONFIRMAR A FERRAMENTA USADA, POR EXEMPLO GOOGLE ANALYTICS 4, OU REMOVER ESTE ITEM")}</li>
</ul>
<h2>3. Para que usamos e em qual base legal</h2>
<div class="tablewrap" tabindex="0" role="region" aria-label="Tabela de bases legais, role para o lado se necessário"><table><thead><tr><th>Finalidade</th><th>Base legal</th></tr></thead><tbody>
<tr><td>Responder ao seu contato e enviar a proposta comercial</td><td>Consentimento (art. 7º, I) e procedimentos preliminares a contrato (art. 7º, V)</td></tr>
<tr><td>Segurança do site e prevenção a spam e fraudes</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
<tr><td>Estatísticas de uso do site</td><td>Consentimento (art. 7º, I), dado por você no aviso de cookies</td></tr>
</tbody></table></div>
<p>Não vendemos seus dados e não os usamos para publicidade de terceiros.</p>
<h2>4. Com quem compartilhamos</h2>
<ul><li>Provedor de hospedagem: {ph("NOME DO PROVEDOR E PAÍS DOS SERVIDORES")}.</li>
<li>Google, se as estatísticas estiverem ativas e você as permitir. Isso pode envolver transferência internacional de dados. {ph("CONFIRMAR")}</li>
<li>Cloudflare, se a verificação anti-robô (Turnstile) estiver ativa. {ph("CONFIRMAR")}</li>
<li>Meta (WhatsApp), quando você escolhe conversar conosco por lá.</li></ul>
<h2 id="cookies">5. Cookies e armazenamento local</h2>
<div class="tablewrap" tabindex="0" role="region" aria-label="Tabela de cookies, role para o lado se necessário"><table><thead><tr><th>Nome</th><th>Para que serve</th><th>Tipo</th><th>Duração</th></tr></thead><tbody>
<tr><td>mt_consent (armazenamento local)</td><td>Guarda a sua escolha no aviso de cookies</td><td>Essencial</td><td>Até você limpar os dados do navegador</td></tr>
<tr><td>_ga e _ga_* {ph("SE USAR GOOGLE ANALYTICS")}</td><td>Distinguir visitas e medir o uso da página</td><td>Estatística (só com permissão)</td><td>Até 2 anos</td></tr>
<tr><td>Verificação anti-robô {ph("SE USAR TURNSTILE")}</td><td>Confirmar que o formulário não é enviado por robôs</td><td>Segurança</td><td>Sessão</td></tr>
</tbody></table></div>
<p>Você pode mudar sua escolha a qualquer momento em “Gerenciar cookies”, no rodapé do site.</p>
<h2>6. Por quanto tempo guardamos</h2>
<p>Dados do formulário: por {ph("PRAZO, POR EXEMPLO 12 MESES")} ou até você pedir a exclusão. Se você virar cliente, os dados passam a seguir a política do sistema. Dados de estatísticas: conforme o período de retenção configurado na ferramenta {ph("PREENCHER")}.</p>
<h2>7. Seus direitos</h2>
<p>Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamentos e revogação do consentimento. Escreva para {ph("E-MAIL DE PRIVACIDADE")} ou pelo WhatsApp (21) 97930-7473. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
<h2>8. Segurança</h2>
<p>O site usa conexão segura (HTTPS), o acesso aos contatos recebidos é restrito e o formulário tem proteções contra envio automático. Nenhum sistema é totalmente imune a falhas; se houver um incidente relevante, comunicaremos você e a ANPD conforme a lei.</p>
<h2>9. Crianças e adolescentes</h2>
<p>O site não é direcionado a menores de 18 anos.</p>
<h2>10. Alterações</h2>
<p>Podemos atualizar esta política. A data de vigência no topo indica a versão atual.</p>
</div>'''

TERMS = f'''<div class="wrap doc">
<h1>Termos e Condições de Uso</h1>
<p class="muted">Vigência: {ph("PREENCHER A DATA")}. Ao usar este site ou contratar o Meu Teto, você concorda com estes termos.</p>
<h2>1. Quem somos</h2>
<p>O Meu Teto é oferecido por {ph("RAZÃO SOCIAL OU NOME")}, {ph("CNPJ OU CPF")}. Contato: WhatsApp (21) 97930-7473 e {ph("E-MAIL")}.</p>
<h2>2. O que é o Meu Teto</h2>
<p>Sistema online para organizar a vida financeira e a rotina da casa: renda, contas, cartões, planos, tarefas e agenda. É uma ferramenta de organização. Não é consultoria financeira, contábil, jurídica ou de investimentos, e os valores exibidos dependem das informações que você mesmo cadastra.</p>
<h2>3. Cadastro e conta</h2>
<ul><li>Você deve informar dados verdadeiros e manter a senha em sigilo.</li><li>Você é responsável pelas atividades feitas na sua conta.</li><li>Avise-nos se suspeitar de acesso indevido.</li></ul>
<h2>4. Uso permitido</h2>
<p>É proibido usar o Meu Teto para atividades ilegais, tentar acessar dados de outros usuários, sobrecarregar ou atacar o sistema, copiar o código ou revender o acesso sem autorização por escrito.</p>
<h2>5. Planos, valores e pagamento</h2>
<p>Os valores, a forma de pagamento e o prazo de cada plano constam na proposta comercial aceita por você. {ph("PREENCHER: PRAZOS, REAJUSTE, FORMA DE COBRANÇA")}</p>
<h2>6. Disponibilidade e suporte</h2>
<p>Trabalhamos para manter o sistema disponível, mas ele pode ficar indisponível por manutenção ou por fatores fora do nosso controle. O suporte é feito pelo WhatsApp (21) 97930-7473. {ph("PREENCHER: HORÁRIO DE ATENDIMENTO")}</p>
<h2>7. Seus dados</h2>
<p>Seus dados são seus. O tratamento segue a <a href="/privacidade">Política de Privacidade</a>. Dentro do sistema, você pode baixar uma cópia dos dados ou excluir a conta.</p>
<h2>8. Propriedade intelectual</h2>
<p>O Meu Teto, sua marca, telas e código pertencem a {ph("TITULAR")}. O contrato dá a você o direito de uso do sistema, e não a propriedade dele.</p>
<h2>9. Responsabilidade</h2>
<p>Dentro do que a lei permite, não nos responsabilizamos por decisões tomadas com base nos números exibidos nem por dados cadastrados incorretamente. Estes termos não afastam direitos que a lei garante ao consumidor. {ph("REVISAR ESTA CLÁUSULA COM UM ADVOGADO")}</p>
<h2>10. Cancelamento</h2>
<p>Você pode pedir o cancelamento a qualquer momento pelo WhatsApp. {ph("PREENCHER: REGRAS DE REEMBOLSO E PRAZOS")} Pode também exportar seus dados antes de encerrar a conta.</p>
<h2>11. Alterações</h2>
<p>Podemos atualizar estes termos. Mudanças relevantes serão avisadas por meio do site ou do sistema.</p>
<h2>12. Lei aplicável e foro</h2>
<p>Estes termos seguem as leis do Brasil. Foro: {ph("COMARCA")}, ressalvado o direito do consumidor de ajuizar ação no foro do seu domicílio.</p>
</div>'''

NF = '''<div class="wrap nf"><div class="nf-in"><p class="big" aria-hidden="true">404</p><h1>Página não encontrada</h1><p class="lead">O endereço pode ter mudado ou não existe mais. Volte para o início ou fale com a gente no WhatsApp.</p><p><a class="btn btn-blue" href="/">Voltar ao início</a></p></div></div>'''

page('privacidade.html', 'Política de Privacidade | Meu Teto', 'Como o site do Meu Teto trata dados pessoais, cookies e seus direitos conforme a LGPD.', '/privacidade', PRIV)
page('termos.html', 'Termos e Condições de Uso | Meu Teto', 'Termos e condições de uso do Meu Teto: cadastro, uso permitido, planos, suporte, dados e cancelamento.', '/termos', TERMS)
page('404.html', 'Página não encontrada | Meu Teto', 'A página que você procurou não foi encontrada. Volte ao início do Meu Teto.', '/404', NF, noindex=True)
print('páginas geradas')
