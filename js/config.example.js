/* ==========================================================================
   config.example.js
   MODELO de configuração — copie este arquivo para "config.js" (mesma
   pasta) e preencha com os dados do SEU projeto Supabase.

   Onde encontrar esses valores: painel do Supabase > seu projeto >
   Project Settings > API. Use a "anon public" key — NUNCA a "service_role".

   "config.js" está no .gitignore de propósito: cada pessoa que roda o
   projeto localmente (ou cada ambiente) tem o seu próprio. Em produção
   (Vercel), este arquivo é gerado automaticamente no momento do deploy
   pelo script scripts/build-config.js, a partir das variáveis de ambiente
   configuradas no painel da Vercel — veja o README para o passo a passo.

   IMPORTANTE: a "anon public key" do Supabase é FEITA para ficar exposta
   no navegador — não é um segredo. Quem protege os dados são as regras de
   Row Level Security (RLS) configuradas em db/schema.sql, não o sigilo
   desta chave. Ainda assim, nunca coloque aqui a "service_role key" —
   essa sim é secreta e nunca deve aparecer no frontend.
   ========================================================================== */

window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA-AQUI';
