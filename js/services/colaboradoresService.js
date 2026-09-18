/* ==========================================================================
   colaboradoresService.js
   Acesso à tabela "colaboradores". Traduz os nomes de coluna do banco
   (snake_case) para os nomes que o resto do aplicativo já usa — assim as
   telas continuam iguais, só a fonte dos dados mudou.
   ========================================================================== */

window.ColaboradoresService = (function () {

  function tabela() {
    return SupabaseClient.obter().from('colaboradores');
  }

  function doBanco(row) {
    return {
      id: row.id,
      nome: row.nome,
      cargo: row.cargo || 'Não informado',
      turno: row.turno || 'Não informado',
      origem: row.origem,
    };
  }

  async function listarTodos() {
    const { data, error } = await tabela().select('*').order('nome');
    if (error) throw error;
    return data.map(doBanco);
  }

  async function criar({ nome, cargo, turno, origem }) {
    const { data, error } = await tabela()
      .insert({ nome, cargo: cargo || null, turno: turno || null, origem: origem || 'manual' })
      .select()
      .single();
    if (error) throw error;
    return doBanco(data);
  }

  return { listarTodos, criar };
})();
