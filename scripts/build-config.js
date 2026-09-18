#!/usr/bin/env node
/* ==========================================================================
   scripts/build-config.js
   Gera js/config.js a partir das variáveis de ambiente SUPABASE_URL e
   SUPABASE_ANON_KEY. É isso que a Vercel roda automaticamente a cada
   deploy (veja "buildCommand" em vercel.json) — assim as credenciais nunca
   ficam commitadas no código, só configuradas no painel da Vercel.

   Uso local (fora da Vercel): não é obrigatório rodar este script — para
   desenvolvimento local, basta copiar js/config.example.js para
   js/config.js e preencher os valores à mão.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const destino = path.join(__dirname, '..', 'js', 'config.js');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[build-config] Aviso: SUPABASE_URL e/ou SUPABASE_ANON_KEY não estão definidas ' +
    'nas variáveis de ambiente. Gerando config.js vazio — configure-as no painel ' +
    'da Vercel (Project Settings > Environment Variables) antes do próximo deploy.'
  );
}

const conteudo = `/* Gerado automaticamente por scripts/build-config.js no momento do build. */
/* Não edite este arquivo à mão em produção — ele é sobrescrito a cada deploy. */
window.SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};
`;

fs.writeFileSync(destino, conteudo, 'utf8');
console.log('[build-config] js/config.js gerado com sucesso.');
