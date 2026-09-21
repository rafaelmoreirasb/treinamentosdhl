/* ==========================================================================
   integracaoService.js
   Acesso à tabela "integracao" (cadastro e acompanhamento de integração de
   novos colaboradores). Módulo independente de Aduana e de treinamentos —
   não referencia nenhuma das duas tabelas.
   ========================================================================== */

window.IntegracaoService = (function () {

  function tabela() {
    return SupabaseClient.obter().from('integracao');
  }

  function doBanco(row) {
    return {
      id: row.id,
      nome: row.nome,
      telefone: row.telefone,
      endereco: row.endereco,
      cidade: row.cidade,
      matricula: row.matricula || '',
      email: row.email,
      ext: row.ext || '',
      cpf: row.cpf || '',
      integracaoQa: row.integracao_qa,
      oiCheguei: row.oi_cheguei,
    };
  }

  function paraLinhaBanco(dados) {
    return {
      nome: dados.nome,
      telefone: dados.telefone,
      endereco: dados.endereco,
      cidade: dados.cidade,
      matricula: dados.matricula || null,
      email: dados.email,
      ext: dados.ext || null,
      cpf: dados.cpf ? dados.cpf.replace(/\D/g, '') : null,
      integracao_qa: dados.integracaoQa,
      oi_cheguei: dados.oiCheguei,
    };
  }

  async function listarTodos() {
    const { data, error } = await tabela().select('*').order('nome');
    if (error) throw error;
    return data.map(doBanco);
  }

  async function criar(dados) {
    const { data, error } = await tabela().insert(paraLinhaBanco(dados)).select().single();
    if (error) throw error;
    return doBanco(data);
  }

  async function atualizar(id, dados) {
    const { data, error } = await tabela().update(paraLinhaBanco(dados)).eq('id', id).select().single();
    if (error) throw error;
    return doBanco(data);
  }

  async function excluir(id) {
    const { error } = await tabela().delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  return { listarTodos, criar, atualizar, excluir };
})();
