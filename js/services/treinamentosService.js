/* ==========================================================================
   treinamentosService.js
   Acesso à tabela "treinamentos" (criar, listar, editar, excluir).

   Alteração 1/2: um treinamento aplicado a vários colaboradores vira
   várias LINHAS na tabela (uma por colaborador), todas compartilhando o
   mesmo "aplicacao_id" — é esse campo que permite diferenciar "quantos
   treinamentos foram aplicados" de "quantos colaboradores participaram".
   "carga_horaria" é a duração da aplicação (a mesma para todas as linhas
   do mesmo aplicacao_id — nunca multiplicada pela quantidade de gente).
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
      aplicacaoId: row.aplicacao_id,
      cargaHoraria: row.carga_horaria != null ? Number(row.carga_horaria) : null,
    };
  }

  async function listarTodos() {
    const { data, error } = await tabela().select('*').order('data', { ascending: false });
    if (error) throw error;
    return data.map(doBanco);
  }

  // Cria UM treinamento (uma linha, um colaborador). Mantida para casos
  // simples e por compatibilidade — o cadastro em lote (vários
  // colaboradores de uma vez) usa criarVarios(), abaixo.
  async function criar({ colaboradorId, tipo, data, responsavel, observacao, aplicacaoId, cargaHoraria }) {
    const sessao = await AuthService.sessaoAtual();
    const { data: linha, error } = await tabela()
      .insert({
        colaborador_id: colaboradorId,
        tipo,
        data,
        responsavel,
        observacao: observacao || null,
        aplicacao_id: aplicacaoId,
        carga_horaria: cargaHoraria != null && cargaHoraria !== '' ? cargaHoraria : null,
        criado_por: sessao ? sessao.user.id : null,
      })
      .select()
      .single();
    if (error) throw error;
    return doBanco(linha);
  }

  // Cria várias linhas de uma vez (um treinamento aplicado a N
  // colaboradores) — todas compartilhando o mesmo aplicacaoId.
  async function criarVarios(linhasNovas) {
    if (!linhasNovas || linhasNovas.length === 0) return [];
    const sessao = await AuthService.sessaoAtual();
    const usuarioId = sessao ? sessao.user.id : null;
    const registros = linhasNovas.map(l => ({
      colaborador_id: l.colaboradorId,
      tipo: l.tipo,
      data: l.data,
      responsavel: l.responsavel,
      observacao: l.observacao || null,
      aplicacao_id: l.aplicacaoId,
      carga_horaria: l.cargaHoraria != null && l.cargaHoraria !== '' ? l.cargaHoraria : null,
      criado_por: usuarioId,
    }));
    const { data, error } = await tabela().insert(registros).select();
    if (error) throw error;
    return data.map(doBanco);
  }

  async function atualizar(id, { colaboradorId, tipo, data, responsavel, observacao, cargaHoraria }) {
    const { data: linha, error } = await tabela()
      .update({
        colaborador_id: colaboradorId,
        tipo,
        data,
        responsavel,
        observacao: observacao || null,
        carga_horaria: cargaHoraria != null && cargaHoraria !== '' ? cargaHoraria : null,
      })
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

  // Exclui TODAS as linhas de uma aplicação de treinamento de uma vez
  // (todos os colaboradores que participaram daquela aplicação).
  async function excluirPorAplicacao(aplicacaoId) {
    const { error } = await tabela().delete().eq('aplicacao_id', aplicacaoId);
    if (error) throw error;
    return true;
  }

  return { listarTodos, criar, criarVarios, atualizar, excluir, excluirPorAplicacao };
})();
