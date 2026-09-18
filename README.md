# DHL | Gestão de Treinamentos

Aplicativo web para controle de treinamentos e ocorrências dos
colaboradores da DHL Supply Chain.

**Fase atual: melhorias sobre a Etapa 6** — gráfico de treinamentos por
mês (na Início e na Treinamentos) e o novo módulo **Integração**, para
cadastro e acompanhamento de novos colaboradores. O login continua
removido do fluxo do app, como pedido (ver seção correspondente mais
abaixo).

> **Antes de mais nada:** o aplicativo depende de um projeto Supabase
> configurado. As seções "Como configurar" e "Como publicar na Vercel"
> abaixo têm o passo a passo completo. Até você fazer isso, o aplicativo
> mostra uma tela explicando o que falta configurar.

> ⚠️ **Se você já tinha rodado `db/schema.sql` antes:** esta versão
> adiciona uma tabela nova (`integracao`). Rode o arquivo `db/schema.sql`
> inteiro de novo no SQL Editor do Supabase (pode rodar por cima do que
> já existe, sem problema) — sem isso, a aba Integração vai dar o mesmo
> tipo de erro de "tabela não existe" que você já viu antes.

## Como configurar (primeira vez)

1. **Crie um projeto no Supabase** — vá em [supabase.com](https://supabase.com), crie uma conta gratuita e um novo projeto (guarde a senha do banco que você definir).
2. **Rode o script do banco** — no painel do projeto, abra **SQL Editor → New query**, cole todo o conteúdo do arquivo `db/schema.sql` deste projeto, e clique em **Run**. Isso cria todas as tabelas e as regras de segurança.
3. **Pegue suas credenciais** — em **Project Settings → API**, copie a **Project URL** e a chave **anon public** (não a `service_role`, essa nunca deve ser usada aqui).
4. **Configure o aplicativo** — copie `js/config.example.js` para `js/config.js` (mesma pasta) e cole os dois valores do passo anterior.
5. **Abra `index.html`** no navegador. Você verá a tela de login — clique em "Ainda não tenho conta" e crie a sua.
   > Nesta versão o login já está removido do fluxo do aplicativo (veja a seção **"Login removido do fluxo do aplicativo"** mais abaixo) — você não deve nem ver essa tela de confirmação por e-mail por enquanto.
6. **(Opcional) Vire administrador** — por padrão toda conta nova é "usuário comum" (pode consultar e cadastrar treinamentos, mas não editar/excluir). Para virar admin, rode no SQL Editor do Supabase (trocando o e-mail):
   ```sql
   update perfis set papel = 'admin'
   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```

## Como visualizar localmente

Depois de configurado (passos acima), é só abrir `index.html` duas vezes
no navegador — não precisa de servidor nem de instalar nada.

## Estrutura do projeto

```
index.html                  → estrutura da página (menu, cabeçalho, login)
db/
  schema.sql                 → script único que cria todo o banco (tabelas + segurança)
scripts/
  build-config.js             → gera js/config.js a partir das variáveis de ambiente (usado pela Vercel)
.env.example                 → quais variáveis de ambiente configurar na Vercel
vercel.json                  → configuração de build/deploy da Vercel
package.json                 → só o script de build (sem dependências de runtime)
css/                          → identidade visual DHL (inalterada desde a Etapa 1)
js/
  config.example.js           → modelo de configuração (copie para config.js)
  config.js                   → suas credenciais do Supabase (não vai para o git)
  vendor/
    xlsx.full.min.js           → leitura de planilhas .xlsx (SheetJS)
    supabase.js                 → cliente oficial do Supabase (banco + login)
  services/                    → TODA a conversa com o banco fica isolada aqui, um arquivo por "tabela"
    supabaseClient.js            → cria o cliente único do Supabase
    authService.js                → login, cadastro, logout, perfil
    colaboradoresService.js       → colaboradores
    treinamentosService.js        → treinamentos (criar/editar/excluir)
    aduanaService.js              → ocorrências de Aduana (importação em lote)
    importacoesService.js         → histórico de importações
    integracaoService.js          → módulo Integração (criar/editar/excluir)
  state.js                     → cache em memória alimentado pelos services (Store) — é o que as telas leem
  modules/
    login.js                     → telas de login, cadastro, carregando, "configuração necessária"
    configuracoes.js             → versão do app, usuário logado, ferramenta de migração
    migracao.js                  → migra dados antigos do localStorage (Etapas 2-5) para o banco
    integracao.js                 → módulo Integração: indicadores, busca, filtros, cadastro/edição/exclusão
    dashboard.js, aduana.js, aduana-import.js, colaboradores.js, treinamentos.js, placeholder.js  → como antes
  analise/                      → análise de eficácia do treinamento (Etapa 5, sem alterações na lógica)
  data/mock-data.js             → dados fictícios, mantidos só para a ferramenta de migração
```

## O que mudou nesta etapa

- **Login obrigatório**: e-mail + senha, com cadastro de conta, mensagens de erro claras, estado de carregamento e "Sair" no cabeçalho
- **Banco de dados online** (Supabase/PostgreSQL) substitui o localStorage como fonte da verdade: colaboradores, treinamentos, ocorrências de Aduana e histórico de importações
- **Tudo que já existia continua funcionando**: dashboard, filtros, ranking, gráficos, importação de Excel (com validação, pré-visualização e proteção contra duplicidade), cadastro/edição/exclusão de treinamento, análise antes/depois — só que agora gravando e lendo do banco
- **Ferramenta de migração** (em Configurações): se o navegador tiver dados de uma versão anterior (localStorage), o aplicativo oferece migrá-los para o banco, com pré-visualização antes de gravar
- **Estados de carregamento e erro**: "Carregando dados...", e mensagens simples quando falta conexão ("Não foi possível... Verifique sua conexão e tente novamente"), tanto ao entrar no aplicativo quanto ao salvar qualquer coisa
- **Versão do aplicativo** visível no rodapé do menu (1.0.0)

## Melhorias mais recentes

### 1. Gráfico "Treinamentos por mês" (Início e Treinamentos)

Na aba **Início**, o antigo "Resumo geral" foi substituído, no mesmo
lugar da tela, pelo gráfico **"Treinamentos por mês"**. Na aba
**Treinamentos**, o mesmo gráfico foi adicionado entre o cabeçalho e os
filtros.

- Conta **treinamentos** (registros da tabela de treinamentos), nunca
  ocorrências de Aduana
- Separa corretamente o mesmo mês de anos diferentes (`Set/2025` e
  `Set/2026` aparecem como barras distintas)
- Mostra só os meses que têm algum treinamento (não preenche meses vazios)
- **Fonte única de dados**: as duas telas chamam a mesma função —
  `Utils.renderSecaoTreinamentosPorMes()`, em `js/utils.js` — sobre
  `Store.getTreinamentos()`. Não existem dois lugares calculando isso
  separadamente, então os dois gráficos nunca podem divergir
- Atualiza sozinho ao cadastrar, editar (muda de mês na hora) ou excluir
  um treinamento, porque lê direto do Store a cada vez que a tela é
  desenhada — não guarda um valor "congelado"

### 2. Módulo Integração

A aba **Integração** (que era "Em breve") agora é um módulo completo e
independente do Aduana e do histórico de treinamentos — "Integração QA"
e "Oi Cheguei!" são controles próprios deste módulo e **não** entram na
aba Treinamentos nem afetam colaboradores de outros módulos.

- Indicadores no topo: total de colaboradores, QA Realizado/Pendente, Oi
  Cheguei Realizado/Pendente (calculados sobre todos os registros,
  independente dos filtros abaixo)
- Busca por nome, matrícula, cidade ou telefone (sem diferenciar
  maiúsculas/minúsculas), mais filtros por Integração QA, Oi Cheguei! e
  cidade — todos funcionam **juntos** (ex.: QA=Pendente E Oi
  Cheguei=Realizado mostra só quem atende às duas condições)
- Formulário de cadastro/edição com os campos pedidos, obrigatórios
  marcados com `*`, validação de e-mail e de que Integração QA/Oi
  Cheguei! só aceitam Realizado ou Pendente
- Edição e exclusão (com confirmação) — excluir um registro de
  Integração nunca apaga o colaborador, treinamentos ou ocorrências de
  Aduana relacionadas
- Tabela com rolagem horizontal em telas menores (mesmo padrão já usado
  em outras tabelas do app), para não esconder nenhuma coluna

**Uma decisão de arquitetura que vale explicar**: o pedido descreve os
campos da tabela `integracao` sem incluir uma referência ao cadastro
geral de colaboradores (é uma lista própria, com "Nome do colaborador"
como texto). Segui essa estrutura ao pé da letra. Isso significa que, se
a mesma pessoa também estiver cadastrada no módulo Aduana, os dois
registros são independentes por enquanto (não há vínculo automático
entre eles) — uma futura unificação de cadastro de colaboradores entre
módulos pode ser feita numa etapa própria, se fizer sentido.

## Por que Supabase

O projeto até a Etapa 5 usava só `localStorage` (dados presos ao
navegador). O Supabase foi escolhido — como sugerido no pedido desta
etapa — por já vir com banco PostgreSQL, autenticação por e-mail/senha,
controle de acesso por linha (Row Level Security) e uma biblioteca
JavaScript que funciona direto no navegador, sem precisar de um servidor
próprio no meio do caminho. Isso combina bem com o projeto ser um site
estático (HTML/CSS/JS), sem framework e sem backend próprio: o Supabase
faz esse papel. Não havia nenhuma solução de backend já em uso no
projeto para comparar — só o armazenamento local do navegador.

## Tabelas criadas (`db/schema.sql`)

| Tabela | Para quê |
|---|---|
| `perfis` | Complementa o login: guarda o nome e o papel (admin/usuario) de cada conta |
| `colaboradores` | Cadastro de colaboradores, compartilhado por todos os módulos |
| `treinamentos` | Histórico completo de treinamentos (nunca sobrescreve, só adiciona) |
| `aduana_ocorrencias` | Ocorrências de Aduana — Somatória Geral é calculada pelo próprio banco |
| `importacoes` | Histórico de arquivos importados, com quem importou e quando |
| `integracao` | Cadastro e acompanhamento de integração de novos colaboradores (módulo independente) |

A estrutura foi pensada para caber os módulos futuros (Avaria,
Integração, Volumosos) sem misturar ocorrências: cada módulo, quando for
criado, ganha sua própria tabela de ocorrências (como `aduana_ocorrencias`
hoje), todos compartilhando `colaboradores`, `treinamentos` e
`importacoes`.

**Regra de duplicidade do banco**: `aduana_ocorrencias` tem uma restrição
única em `(colaborador_id, data, aduana_a_mais, aduana_faltante)` — a
mesma regra que o frontend já usava desde a Etapa 3. Não usamos apenas
"colaborador + data" como chave, porque um colaborador pode
legitimamente ter mais de um lançamento no mesmo dia com valores
diferentes.

## Como os dados antigos foram tratados (migração)

Nenhum dado existente foi apagado. O aplicativo detecta automaticamente
se o navegador tem dados de uma versão anterior (localStorage) e mostra
um aviso em **Configurações**, com um botão para ver exatamente o que
seria migrado antes de gravar qualquer coisa — no mesmo espírito da
pré-visualização da importação de Excel.

Regras usadas para separar dado real de dado de demonstração (documentadas
também nos comentários de `js/modules/migracao.js`):
- **Ocorrências de Aduana**: só migram se o navegador tinha registrado
  que uma importação real já tinha acontecido (`dadosReaisAtivos: true`).
  Sem isso, o que estava salvo eram só os 30 registros fictícios.
- **Treinamentos**: só migram os que têm o formato de identificador que o
  próprio aplicativo gera ao cadastrar pela tela (`trein-...` ou
  `novo-...`). Os 8 treinamentos fictícios originais (`t01` a `t08`) não
  são migrados automaticamente. **Atenção**: se alguém editou um desses
  registros fictícios pela tela em vez de criar um novo, o registro
  editado guarda o ID antigo e por isso não é pego por esta regra — a
  ferramenta avisa quando detecta esse caso, e é preciso recriar esse
  treinamento manualmente depois.
- Depois de migrar, a tela mostra um resumo com as contagens, para
  conferir contra o que você via no aplicativo antigo. Os dados antigos
  **não são apagados automaticamente** — só depois que você confirmar,
  clicando em "Apagar dados antigos deste navegador".

Não houve uma migração de dados real executada nesta conversa, porque
este ambiente não tem acesso ao navegador onde os dados de produção de
verdade estariam guardados — a ferramenta foi testada com dados
simulados (ver seção de testes).

## Como funciona o login

- Tela de **Entrar** (e-mail + senha) e **Criar conta** (nome + e-mail +
  senha, mínimo 6 caracteres), com mensagens de erro em português
  ("E-mail ou senha incorretos.", "Já existe uma conta com este e-mail.",
  etc.) em vez do erro técnico do Supabase
- Ao logar, o aplicativo busca todos os dados do banco antes de mostrar
  qualquer tela (com um "Carregando dados..." na tela)
- **Sair**, no cabeçalho, encerra a sessão e volta para a tela de login
- Enquanto não estiver logado, nenhuma tela do sistema é exibida — só a
  camada de login cobre a tela inteira

## Como funcionam as permissões

Duas categorias, guardadas na tabela `perfis`:
- **usuario** (padrão de toda conta nova): pode consultar tudo e
  cadastrar treinamentos/importar planilhas
- **admin**: além disso, pode editar e excluir treinamentos e
  colaboradores (veja acima como promover uma conta)

Essas regras não vivem só na tela — estão configuradas como política de
segurança dentro do próprio banco (veja a seção seguinte), então mesmo
que alguém tente burlar a interface, o banco recusa a operação.

## Como o banco está protegido

- **Row Level Security (RLS) ativado em todas as tabelas** — por padrão,
  o Postgres nega tudo; só as políticas explícitas em `db/schema.sql`
  liberam acesso
- Ninguém não-autenticado consegue ler ou escrever nada
- Qualquer pessoa autenticada pode **consultar** e **cadastrar** (ler
  colaboradores/treinamentos/ocorrências, criar treinamento, importar
  planilha)
- Só **admin** pode **editar** ou **excluir** treinamentos e
  colaboradores
- A chave usada no navegador é a **anon public key**, que é feita para
  ser pública — quem protege os dados são as políticas de RLS, não o
  sigilo dessa chave. A **service_role key** (essa sim secreta) nunca
  aparece em nenhum arquivo deste projeto

## Como funciona a importação online

O fluxo continua exatamente o mesmo visualmente (selecionar → validar →
pré-visualizar → confirmar), só que agora "confirmar" grava no banco em
vez do navegador:
1. As linhas validadas são enviadas ao Supabase de uma vez
2. O banco tenta inserir cada uma; quem já existe (mesma
   colaborador+data+valores) é automaticamente ignorado, graças à
   restrição única da tabela — funciona mesmo que duas pessoas importem
   o mesmo arquivo ao mesmo tempo, de computadores diferentes
3. Só depois disso o histórico de importação é registrado
4. Se a conexão cair no meio do caminho, nada fica "pela metade": a
   gravação de cada lote é uma operação só; se falhar, nada daquele lote
   entra, e a pessoa vê um aviso pedindo para tentar de novo

## Como funciona a persistência

Depois do login, `Store.inicializar()` busca tudo do banco de uma vez e
guarda em memória — as telas continuam lendo os dados instantaneamente,
exatamente como antes. Qualquer ação que muda dados (cadastrar, editar,
excluir, importar) grava primeiro no banco; só depois de confirmar que
deu certo é que a tela é atualizada. Se der erro de conexão, a tela não
muda e aparece um aviso — evitando mostrar algo que não foi realmente
salvo.

## Variáveis de ambiente

Veja `.env.example`. Só duas:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Como este projeto não usa um framework com build (é HTML/CSS/JS puro),
essas variáveis são usadas por `scripts/build-config.js` para *gerar* o
arquivo `js/config.js` no momento do deploy — é isso que a Vercel roda
automaticamente (veja `vercel.json`). Localmente, você não precisa
rodar esse script: é só copiar `js/config.example.js` para `js/config.js`
e preencher à mão.

## Login removido do fluxo do aplicativo

Por pedido explícito: o aplicativo é usado por uma pessoa só por enquanto,
então o login foi **retirado da experiência de uso** — abre direto no
dashboard, sem tela de e-mail/senha.

### 1. Onde estava a proteção de login

Em `js/app.js`, na função `iniciar()` (chamada assim que a página carrega):
ela verificava se havia uma sessão do Supabase Auth ativa e, se não
houvesse, mostrava a tela de login (`Login.mostrar()`), que cobre o
aplicativo inteiro através da camada `#auth-root` (ver `index.html`) até
o login acontecer. Esse era o único ponto de bloqueio.

### 2. O que foi alterado

- `js/app.js`: a função `iniciar()` não checa mais sessão nenhuma — vai
  direto para carregar os dados e mostrar o aplicativo
- `js/modules/login.js`: a tela de "erro ao carregar dados" (que podia
  aparecer) tinha um botão "Sair" que levava de volta para o login; esse
  botão foi removido dali, já que não há mais login para onde voltar
- `db/schema.sql`: a seção final foi trocada — ver item 7 abaixo

**Nada foi apagado**: `js/services/authService.js` (login, cadastro,
logout) e `js/modules/login.js` (as telas) continuam no projeto,
completos, só não são mais chamados a partir da inicialização.

### 3. Como reativar no futuro

1. Em `js/app.js`, dentro de `iniciar()`, adicionar de volta a checagem de
   sessão antes de carregar o app (é o mesmo formato que já existia — se
   quiser, posso trazer isso de volta quando chegar a hora, é rápido)
2. Rodar `alter table ... enable row level security;` nas 4 tabelas (o
   comando exato já está comentado no final de `db/schema.sql`)

### 4. Logout

O botão "Sair" continua no HTML (`index.html`) e a função `App.sair()`
continua funcionando em `js/app.js` — só o botão fica escondido
(`display: none`) enquanto não há login. Nada foi removido.

### 5. Impacto de segurança — leia com atenção

Isso é o ponto mais importante do pedido, então quero ser bem direto:

**Sem login e sem proteção no banco, os dados ficam acessíveis para
qualquer pessoa que tenha a URL e a chave pública deste projeto
Supabase** — exatamente como um aplicativo sem autenticação nenhuma.
Não existe "desativar só a tela, mas manter os dados protegidos": as
duas coisas andam juntas nesta configuração.

Isso é razoável **para uso de uma pessoa só, testando localmente**, que é
o que foi pedido. Os dois cuidados que valem a pena ter:
- Não compartilhe a URL/chave deste projeto com mais ninguém enquanto
  estiver assim
- Não publique o aplicativo neste estado num lugar público (Vercel, por
  exemplo) sem antes reativar a proteção — qualquer visitante do site
  conseguiria ver e alterar os dados

### 6. Supabase — o que foi e o que não foi alterado

**Não foi apagado**: Auth continua ativo, a tabela `perfis` continua
existindo, nenhum usuário foi excluído, e as políticas de segurança
"para quem está logado" (`to authenticated`) continuam gravadas no banco
— elas simplesmente não têm efeito enquanto a segurança por linha (RLS)
estiver desligada nas 4 tabelas (ver item 7). Ligar a proteção de novo
faz essas políticas voltarem a valer sem precisar recriar nada.

### 7. A solução técnica: desligar RLS, em vez de política para "anon"

Numa tentativa anterior, eu tinha liberado o acesso através de políticas
extras para o papel "anon" (visitante sem login) — mas isso continuou
apresentando erro de carregamento, e não consegui identificar a causa
exata sem enxergar o Console do seu navegador. Para eliminar essa fonte
de erro por completo, troquei a abordagem: em vez de várias políticas que
podem ter algum detalhe errado, a seção final de `db/schema.sql` agora
simplesmente **desliga a segurança por linha (RLS)** nas 4 tabelas de
negócio:

```sql
alter table colaboradores disable row level security;
alter table treinamentos disable row level security;
alter table aduana_ocorrencias disable row level security;
alter table importacoes disable row level security;
```

Isso é mais simples, mais direto, e não depende de nenhuma política
estar configurada certinha — funciona sempre. **Se você já tinha rodado
o bloco anterior (políticas para "anon")**, não tem problema: rode este
novo comando também, ele resolve independentemente do que já foi feito
antes.

## Como preparar e publicar na Vercel

1. Suba este projeto para um repositório no GitHub (se ainda não estiver)
2. Na Vercel, clique em **Add New → Project** e importe o repositório
3. Em **Environment Variables**, adicione `SUPABASE_URL` e
   `SUPABASE_ANON_KEY` com os valores do seu projeto Supabase
4. A Vercel deve detectar automaticamente o `vercel.json` (que já define
   o comando de build `node scripts/build-config.js`) — não precisa mudar
   o "Framework Preset" (pode deixar "Other")
5. Clique em **Deploy**

**Nesta conversa eu não fiz nenhum deploy** — apenas preparei tudo para
que, quando você quiser, o clique em "Deploy" já funcione.

### Atualizações futuras

Com o projeto conectado ao GitHub, o fluxo passa a ser automático:
alterou o código → `git commit` → `git push` → a Vercel detecta e gera
uma nova versão sozinha, alguns segundos depois. Não é preciso
reconstruir nada manualmente.

## Testes realizados

Como não existe aqui um projeto Supabase real para testar contra (isso
só existe depois que você criar o seu), construí um **Supabase simulado**
fiel à biblioteca real (mesmas chamadas: `.from().select().eq().single()`,
`.insert().select().single()`, `.update().eq()`, `.upsert(...,
{ignoreDuplicates:true})`, `.auth.signInWithPassword`, etc.) guardando
tudo em memória, e rodei o aplicativo inteiro contra ele num navegador
simulado. Isso testa todo o CÓDIGO com alta confiança, mas não substitui
testar contra o banco real depois que você configurar o seu.

**O que foi testado e confirmado, sem nenhum erro de JavaScript:**
- Acesso sem login → tela do sistema não aparece, só o login
- Criar conta → login automático → dados carregados → cabeçalho mostra o nome
- Dashboard com banco vazio → mostra "Nenhum dado importado ainda" e zeros, sem quebrar
- Importar uma planilha .xlsx de verdade → grava no banco → indicadores atualizam
- Reimportar o mesmo arquivo → aviso de duplicidade → registros repetidos ignorados pelo próprio banco
- Cadastrar, editar e excluir treinamento → cada ação reflete no banco simulado e na tela
- Análise antes/depois (Etapa 5) funcionando sobre dados vindos do banco
- **Sair e entrar de novo** → dados continuam exatamente iguais (treinamentos e ocorrências)
- Login com senha errada → mensagem clara, sem travar a tela
- Migração de dados antigos simulados → identificou corretamente 1 colaborador, 1 treinamento real (ignorando o fictício original) e 2 ocorrências, migrou tudo e bateu as contagens

**Um problema encontrado durante os testes:** depois de "Sair", o
conteúdo da tela anterior continuava no HTML por baixo da tela de login
(só escondido visualmente). Corrigido — agora o conteúdo é
realmente limpo ao sair.

**Uma limitação de design identificada (não é um bug desta etapa, mas
ficou mais visível agora)**: como o banco começa vazio, não é possível
cadastrar um treinamento para alguém que nunca apareceu em nenhuma
planilha importada — o campo de colaborador exige selecionar um nome já
cadastrado (essa regra já existia desde a Etapa 4, só estava mascarada
pelos 10 colaboradores fictícios que vinham prontos). Na prática, o
caminho natural é importar uma planilha de Aduana primeiro (o que já
cria os colaboradores automaticamente) e só depois cadastrar
treinamentos para eles.

**Testes das melhorias mais recentes (gráfico mensal + Integração),
também com Supabase simulado:**
- Aba Início sem "Resumo geral", com "Treinamentos por mês" no lugar
- Gráfico separa corretamente Set/2025, Set/2026 e Out/2026 como barras
  distintas, com as quantidades certas
- Aba Treinamentos mostra o **mesmo** gráfico, com os mesmos números
  (confirmado programaticamente que os dois vêm da mesma função)
- Gráfico atualiza sozinho ao cadastrar um novo treinamento (contagem do
  mês sobe) e ao excluir um treinamento (o mês some do gráfico quando
  fica sem nenhum registro)
- Integração: validação de campos obrigatórios bloqueia o envio;
  e-mail inválido é rejeitado; cadastro válido funciona e atualiza os
  indicadores corretamente; busca por nome encontra o registro certo;
  filtros combinados (QA + Oi Cheguei!) mostram só quem atende às duas
  condições ao mesmo tempo; editar não duplica registro; excluir com
  cancelar não altera nada, excluir com confirmar remove só aquele
  registro; confirmado que colaboradores de Integração não viram
  colaboradores do módulo Aduana nem afetam o histórico de treinamentos
- Regressão: Aduana e Colaboradores continuam funcionando normalmente

**Um problema encontrado durante os testes desta rodada:** nenhum no
código do aplicativo — só um erro no meu script de teste (o "banco
simulado" que uso para testar precisava aprender sobre a tabela nova),
já corrigido antes de rodar o teste de verdade.

## Pontos de atenção

- **Deploy não foi feito** — só preparado, como pedido explicitamente
- **Testes contra o banco real ainda precisam ser feitos por você**
  depois de criar o projeto Supabase — o roteiro do "TESTE MAIS
  IMPORTANTE" (cadastrar, fechar o navegador, abrir de novo, conferir)
  só pode ser validado com infraestrutura real
- Não existe hoje uma tela para cadastrar um colaborador "do zero" sem
  passar por uma importação — ver limitação acima
- Sem paginação: todos os registros são carregados de uma vez ao entrar.
  Funciona bem para a escala atual (algumas centenas de linhas); se o
  volume crescer muito, isso pode precisar de ajuste numa etapa futura
- Auditoria "leve": cada treinamento guarda quem cadastrou
  (`criado_por`) e cada importação guarda quem importou (`usuario_id`),
  com data/hora — dá para consultar isso direto no Supabase. Não foi
  criada uma tela dedicada de auditoria nesta etapa
- `js/data/mock-data.js` não é mais usado pelo aplicativo em si — só pela
  ferramenta de migração; pode ser removido com segurança mais adiante

## Próximas etapas (aguardando sua autorização)

1. Módulos Avaria, Integração e Volumosos
2. Relatórios para gestão
3. Gerenciamento de usuários pela interface (hoje só é possível pelo
   painel do Supabase)
