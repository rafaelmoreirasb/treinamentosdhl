-- ============================================================================
-- DHL | Gestão de Treinamentos — schema do banco (Etapa 6)
-- ============================================================================
-- Como usar: copie este arquivo inteiro e cole no SQL Editor do painel do
-- Supabase (Supabase Dashboard > SQL Editor > New query) e clique em "Run".
-- Pode rodar de uma vez só, de cima a baixo. É seguro rodar novamente depois
-- (os comandos usam "IF NOT EXISTS" / "OR REPLACE" onde possível).
--
-- Estrutura pensada para caber os módulos futuros (Avaria, Integração,
-- Volumosos) sem misturar ocorrências de módulos diferentes: cada módulo
-- ganha sua própria tabela de ocorrências (como "aduana_ocorrencias" hoje),
-- todos compartilhando "colaboradores", "treinamentos" e "importacoes".
-- ============================================================================

-- ============================================================================
-- 0. Extensão necessária para gerar IDs (gen_random_uuid). A maioria dos
--    projetos novos do Supabase já vem com ela habilitada — este comando
--    é só uma garantia, e não faz nada se já estiver ativa.
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PERFIS (permissões) — complementa auth.users (que o Supabase já cria
--    sozinho para login/senha). Guardamos aqui só o papel de cada pessoa.
-- ----------------------------------------------------------------------------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  papel text not null default 'usuario' check (papel in ('admin', 'usuario')),
  criado_em timestamptz not null default now()
);

comment on table perfis is 'Um registro por usuário autenticado. "papel" controla o que a pessoa pode fazer (ver seção de RLS mais abaixo).';

-- Cria automaticamente um perfil (papel "usuario") sempre que alguém se
-- cadastra pelo Supabase Auth — assim ninguém fica sem perfil por engano.
create or replace function lidar_novo_usuario()
returns trigger as $$
begin
  insert into perfis (id, nome, papel)
  values (new.id, new.raw_user_meta_data ->> 'nome', 'usuario')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function lidar_novo_usuario();

-- Função auxiliar usada nas políticas de segurança abaixo.
create or replace function eh_admin()
returns boolean as $$
  select exists (
    select 1 from perfis where id = auth.uid() and papel = 'admin'
  );
$$ language sql security definer stable;

-- ----------------------------------------------------------------------------
-- 2. COLABORADORES
-- ----------------------------------------------------------------------------
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  turno text,
  origem text not null default 'manual' check (origem in ('manual', 'importado', 'ficticio')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table colaboradores is 'Cadastro de colaboradores, compartilhado por todos os módulos (Aduana, e futuramente Avaria/Integração/Volumosos).';

create index if not exists idx_colaboradores_nome on colaboradores (lower(nome));

-- ----------------------------------------------------------------------------
-- 3. TREINAMENTOS
-- ----------------------------------------------------------------------------
create table if not exists treinamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  tipo text not null,                 -- por enquanto sempre 'Aduana'; outros módulos usarão outros valores
  data date not null,
  responsavel text not null,
  observacao text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table treinamentos is 'Histórico completo de treinamentos. Um colaborador pode ter vários registros, inclusive do mesmo tipo — nada aqui é sobrescrito.';

create index if not exists idx_treinamentos_colaborador on treinamentos (colaborador_id);
create index if not exists idx_treinamentos_tipo_data on treinamentos (tipo, data);

-- ----------------------------------------------------------------------------
-- 4. IMPORTAÇÕES (histórico de arquivos importados)
-- ----------------------------------------------------------------------------
create table if not exists importacoes (
  id uuid primary key default gen_random_uuid(),
  modulo text not null default 'aduana',   -- prepara o terreno para outros módulos
  arquivo_nome text not null,
  arquivo_tamanho bigint,
  arquivo_modificado_em bigint,             -- "lastModified" do arquivo (ajuda a detectar reimportação do mesmo arquivo)
  registros_adicionados integer not null default 0,
  registros_ignorados integer not null default 0,
  status text not null default 'Importado',
  usuario_id uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

comment on table importacoes is 'Uma linha por importação confirmada. Serve tanto para o histórico visível na tela quanto para detectar arquivos já importados (nome + tamanho + data de modificação).';

create index if not exists idx_importacoes_arquivo on importacoes (arquivo_nome, arquivo_tamanho, arquivo_modificado_em);

-- ----------------------------------------------------------------------------
-- 5. OCORRÊNCIAS DE ADUANA
-- ----------------------------------------------------------------------------
create table if not exists aduana_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  data date not null,
  aduana_a_mais integer not null check (aduana_a_mais >= 0),
  aduana_faltante integer not null check (aduana_faltante >= 0),
  -- Somatória Geral é SEMPRE gerada pelo próprio banco (nunca aceita o valor
  -- do Excel diretamente) — exatamente a mesma regra usada no frontend.
  somatoria_geral integer generated always as (aduana_a_mais + aduana_faltante) stored,
  importacao_id uuid references importacoes(id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Evita duplicar exatamente o mesmo registro (mesmo colaborador, data e
  -- valores) — é a mesma regra de deduplicação já usada no frontend.
  -- NÃO usamos apenas "colaborador + data" como chave: um colaborador pode
  -- legitimamente ter mais de um lançamento de Aduana no mesmo dia, desde
  -- que os valores sejam diferentes.
  unique (colaborador_id, data, aduana_a_mais, aduana_faltante)
);

comment on table aduana_ocorrencias is 'Ocorrências reais de Aduana (a partir da primeira importação confirmada). "somatoria_geral" é calculada pelo próprio Postgres, nunca confiando no valor do Excel.';

create index if not exists idx_aduana_colaborador on aduana_ocorrencias (colaborador_id);
create index if not exists idx_aduana_data on aduana_ocorrencias (data);

-- ----------------------------------------------------------------------------
-- 5b. INTEGRAÇÃO
-- ----------------------------------------------------------------------------
-- Módulo independente do Aduana — não referencia aduana_ocorrencias nem
-- treinamentos. "nome" fica como texto simples (não uma referência à
-- tabela colaboradores), seguindo os campos exatamente como pedido.
create table if not exists integracao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  endereco text not null,
  cidade text not null,
  matricula text,
  email text not null,
  ext text,
  integracao_qa text not null default 'Pendente' check (integracao_qa in ('Realizado', 'Pendente')),
  oi_cheguei text not null default 'Pendente' check (oi_cheguei in ('Realizado', 'Pendente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table integracao is 'Cadastro e acompanhamento da integração de novos colaboradores (módulo independente do Aduana). "Integração QA" e "Oi Cheguei!" NÃO entram no histórico de treinamentos.';

create index if not exists idx_integracao_nome on integracao (lower(nome));
create index if not exists idx_integracao_cidade on integracao (lower(cidade));

-- ----------------------------------------------------------------------------
-- 6. Gatilho simples para manter "atualizado_em" em dia
-- ----------------------------------------------------------------------------
create or replace function marcar_atualizado()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_colaboradores_atualizado on colaboradores;
create trigger trg_colaboradores_atualizado before update on colaboradores
  for each row execute function marcar_atualizado();

drop trigger if exists trg_treinamentos_atualizado on treinamentos;
create trigger trg_treinamentos_atualizado before update on treinamentos
  for each row execute function marcar_atualizado();

drop trigger if exists trg_integracao_atualizado on integracao;
create trigger trg_integracao_atualizado before update on integracao
  for each row execute function marcar_atualizado();

-- ============================================================================
-- SEGURANÇA (Row Level Security)
-- ============================================================================
-- Regra adotada nesta etapa (propositalmente simples, conforme pedido):
--   - Qualquer usuário AUTENTICADO pode LER tudo (SELECT) e INSERIR
--     (cadastrar treinamento, importar dados) — é o que a tela permite hoje.
--   - Apenas ADMIN pode ATUALIZAR ou EXCLUIR treinamentos e colaboradores.
--   - Ninguém não-autenticado enxerga nada (sem usuário anônimo).
-- Isso corresponde ao "USUÁRIO pode registrar treinamentos" e "ADMIN pode
-- alterar dados quando autorizado" pedido na especificação.
-- ============================================================================

alter table perfis enable row level security;
alter table colaboradores enable row level security;
alter table treinamentos enable row level security;
alter table aduana_ocorrencias enable row level security;
alter table importacoes enable row level security;
alter table integracao enable row level security;

-- perfis: cada um só vê e edita o próprio perfil; admin vê todos.
drop policy if exists "perfis_select" on perfis;
create policy "perfis_select" on perfis for select
  to authenticated using (auth.uid() = id or eh_admin());

drop policy if exists "perfis_update_proprio" on perfis;
create policy "perfis_update_proprio" on perfis for update
  to authenticated using (auth.uid() = id);

-- colaboradores
drop policy if exists "colaboradores_select" on colaboradores;
create policy "colaboradores_select" on colaboradores for select
  to authenticated using (true);

drop policy if exists "colaboradores_insert" on colaboradores;
create policy "colaboradores_insert" on colaboradores for insert
  to authenticated with check (true);

drop policy if exists "colaboradores_update" on colaboradores;
create policy "colaboradores_update" on colaboradores for update
  to authenticated using (eh_admin());

drop policy if exists "colaboradores_delete" on colaboradores;
create policy "colaboradores_delete" on colaboradores for delete
  to authenticated using (eh_admin());

-- treinamentos
drop policy if exists "treinamentos_select" on treinamentos;
create policy "treinamentos_select" on treinamentos for select
  to authenticated using (true);

drop policy if exists "treinamentos_insert" on treinamentos;
create policy "treinamentos_insert" on treinamentos for insert
  to authenticated with check (true);

drop policy if exists "treinamentos_update" on treinamentos;
create policy "treinamentos_update" on treinamentos for update
  to authenticated using (eh_admin());

drop policy if exists "treinamentos_delete" on treinamentos;
create policy "treinamentos_delete" on treinamentos for delete
  to authenticated using (eh_admin());

-- aduana_ocorrencias
drop policy if exists "aduana_select" on aduana_ocorrencias;
create policy "aduana_select" on aduana_ocorrencias for select
  to authenticated using (true);

drop policy if exists "aduana_insert" on aduana_ocorrencias;
create policy "aduana_insert" on aduana_ocorrencias for insert
  to authenticated with check (true);

drop policy if exists "aduana_update" on aduana_ocorrencias;
create policy "aduana_update" on aduana_ocorrencias for update
  to authenticated using (eh_admin());

drop policy if exists "aduana_delete" on aduana_ocorrencias;
create policy "aduana_delete" on aduana_ocorrencias for delete
  to authenticated using (eh_admin());

-- importacoes
drop policy if exists "importacoes_select" on importacoes;
create policy "importacoes_select" on importacoes for select
  to authenticated using (true);

drop policy if exists "importacoes_insert" on importacoes;
create policy "importacoes_insert" on importacoes for insert
  to authenticated with check (true);

-- integracao
drop policy if exists "integracao_select" on integracao;
create policy "integracao_select" on integracao for select
  to authenticated using (true);
drop policy if exists "integracao_insert" on integracao;
create policy "integracao_insert" on integracao for insert
  to authenticated with check (true);
drop policy if exists "integracao_update" on integracao;
create policy "integracao_update" on integracao for update
  to authenticated using (eh_admin());
drop policy if exists "integracao_delete" on integracao;
create policy "integracao_delete" on integracao for delete
  to authenticated using (eh_admin());

-- ============================================================================
-- COMO TRANSFORMAR O SEU PRÓPRIO USUÁRIO EM ADMIN
-- ============================================================================
-- Depois de criar sua conta pela tela de login do aplicativo (ela cria um
-- usuário comum, papel "usuario"), rode este comando UMA VEZ, trocando o
-- e-mail pelo que você usou para se cadastrar:
--
--   update perfis set papel = 'admin'
--   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
--
-- ============================================================================

-- ============================================================================
-- MODO SEM LOGIN (atual)
-- ============================================================================
-- O login foi removido da experiência do aplicativo por enquanto (uso de
-- uma pessoa só). Em vez de manter políticas separadas para "anon" (que
-- podem falhar por algum detalhe de configuração difícil de diagnosticar
-- remotamente), a solução mais simples e à prova de erro é DESLIGAR a
-- segurança por linha (RLS) nas tabelas de negócio. Isso é equivalente a
-- não ter proteção nenhuma nelas — qualquer pessoa com a URL e a chave
-- pública deste projeto consegue ler e escrever os dados. Aceitável para
-- uso de uma pessoa só, testando; NÃO deve ir para um ambiente onde outras
-- pessoas possam ter acesso à chave (por exemplo, publicado sem login).
--
-- Rode este bloco no SQL Editor do Supabase:
-- ============================================================================

alter table colaboradores disable row level security;
alter table treinamentos disable row level security;
alter table aduana_ocorrencias disable row level security;
alter table importacoes disable row level security;
alter table integracao disable row level security;
-- "perfis" continua com RLS ligado — não é usada enquanto o login estiver
-- fora de uso, então não há necessidade de mexer nela.

-- ============================================================================
-- PARA REATIVAR A SEGURANÇA MAIS TARDE (quando o login voltar a ser usado),
-- rode isto para ligar a proteção de novo — as políticas "to authenticated"
-- e "to admin" já criadas mais acima neste arquivo continuam válidas e
-- voltam a valer automaticamente:
--
--   alter table colaboradores enable row level security;
--   alter table treinamentos enable row level security;
--   alter table aduana_ocorrencias enable row level security;
--   alter table importacoes enable row level security;
--   alter table integracao enable row level security;
--
-- (Se em algum momento você rodou a versão anterior deste arquivo, que
-- criava políticas extras terminadas em "_anon", elas não atrapalham em
-- nada estando ali paradas — mas se quiser removê-las por organização:
--
--   drop policy if exists "colaboradores_select_anon" on colaboradores;
--   drop policy if exists "colaboradores_insert_anon" on colaboradores;
--   drop policy if exists "colaboradores_update_anon" on colaboradores;
--   drop policy if exists "colaboradores_delete_anon" on colaboradores;
--   drop policy if exists "treinamentos_select_anon" on treinamentos;
--   drop policy if exists "treinamentos_insert_anon" on treinamentos;
--   drop policy if exists "treinamentos_update_anon" on treinamentos;
--   drop policy if exists "treinamentos_delete_anon" on treinamentos;
--   drop policy if exists "aduana_select_anon" on aduana_ocorrencias;
--   drop policy if exists "aduana_insert_anon" on aduana_ocorrencias;
--   drop policy if exists "aduana_update_anon" on aduana_ocorrencias;
--   drop policy if exists "aduana_delete_anon" on aduana_ocorrencias;
--   drop policy if exists "importacoes_select_anon" on importacoes;
--   drop policy if exists "importacoes_insert_anon" on importacoes;
-- )
-- ============================================================================
