/* ==========================================================================
   supabaseClient.js
   Ponto único de criação do cliente do Supabase. Todo o resto do
   aplicativo (services/*.js) pede o cliente por aqui — ninguém mais chama
   window.supabase.createClient() diretamente.
   ========================================================================== */

window.SupabaseClient = (function () {
  let cliente = null;

  function estaConfigurado() {
    return !!(
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY &&
      !window.SUPABASE_URL.includes('SEU-PROJETO')
    );
  }

  function obter() {
    if (cliente) return cliente;

    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      throw new Error('BIBLIOTECA_AUSENTE');
    }
    if (!estaConfigurado()) {
      throw new Error('NAO_CONFIGURADO');
    }

    cliente = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return cliente;
  }

  return { obter, estaConfigurado };
})();
