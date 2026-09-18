/* ==========================================================================
   treinamentosService.js
   Acesso à tabela "treinamentos" (criar, listar, editar, excluir).
   ========================================================================== */

window.TreinamentosService = (function () {

  function tabela() {
    return SupabaseClient.obter().from('treinamentos');
  }

  function doBanco(row) {
    return {
      id: row.id,
      colaboradorId: row.colaborador_id,
      tipo: row.tipo,
      data: row.data,
      responsavel: row.responsavel,
      observacao: row.observacao || '',
    };
  }

  async function listarTodos() {
    const { data, error } = await tabela().select('*').order('data', { ascending: false });
    if (error) throw error;
    return data.map(doBanco);
  }

  async function criar({ colaboradorId, tipo, data, responsavel, observacao }) {
    const sessao = await AuthService.sessaoAtual();
    const { data: linha, error } = await tabela()
      .insert({
        colaborador_id: colaboradorId,
        tipo,
        data,
        responsavel,
        observacao: observacao || null,
        criado_por: sessao ? sessao.user.id : null,
      })
      .select()
      .single();
    if (error) throw error;
    return doBanco(linha);
  }

  async function atualizar(id, { colaboradorId, tipo, data, responsavel, observacao }) {
    const { data: linha, error } = await tabela()
      .update({ colaborador_id: colaboradorId, tipo, data, responsavel, observacao: observacao || null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return doBanco(linha);
  }

  async function excluir(id) {
    const { error } = await tabela().delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  return { listarTodos, criar, atualizar, excluir };
})();
