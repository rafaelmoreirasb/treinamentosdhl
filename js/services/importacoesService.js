/* ==========================================================================
   importacoesService.js
   Histórico de importações e verificação de arquivo já importado — agora
   consultando o banco, então funciona mesmo trocando de computador.
   ========================================================================== */

window.ImportacoesService = (function () {

  function tabela() {
    return SupabaseClient.obter().from('importacoes');
  }

  function doBanco(row) {
    return {
      id: row.id,
      arquivo: row.arquivo_nome,
      dataHora: row.criado_em,
      registros: row.registros_adicionados,
      ignorados: row.registros_ignorados,
      status: row.status,
    };
  }

  async function listarTodas() {
    const { data, error } = await tabela().select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data.map(doBanco);
  }

  async function registrar({ arquivoNome, arquivoTamanho, arquivoModificadoEm, registrosAdicionados, registrosIgnorados, status }) {
    const sessao = await AuthService.sessaoAtual();
    const { data, error } = await tabela()
      .insert({
        modulo: 'aduana',
        arquivo_nome: arquivoNome,
        arquivo_tamanho: arquivoTamanho,
        arquivo_modificado_em: arquivoModificadoEm,
        registros_adicionados: registrosAdicionados,
        registros_ignorados: registrosIgnorados || 0,
        status,
        usuario_id: sessao ? sessao.user.id : null,
      })
      .select()
      .single();
    if (error) throw error;
    return doBanco(data);
  }

  async function arquivoJaImportado(nome, tamanho, modificadoEm) {
    const { data, error } = await tabela()
      .select('id')
      .eq('arquivo_nome', nome)
      .eq('arquivo_tamanho', tamanho)
      .eq('arquivo_modificado_em', modificadoEm)
      .limit(1);
    if (error) throw error;
    return data.length > 0;
  }

  return { listarTodas, registrar, arquivoJaImportado };
})();
