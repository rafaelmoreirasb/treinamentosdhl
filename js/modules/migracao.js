/* ==========================================================================
   migracao.js
   Migração dos dados antigos (localStorage, Etapas 2 a 5) para o banco
   online (Etapa 6).

   REGRAS USADAS PARA DECIDIR O QUE É "DADO REAL" (documentado aqui para
   ficar claro e auditável — ver também o README):

   - Ocorrências de Aduana: só são migradas se o navegador tinha
     "dadosReaisAtivos: true" salvo — ou seja, se alguma importação de
     Excel de verdade já tinha sido confirmada. Do contrário, o que está
     salvo são só os 30 registros fictícios de demonstração, que não
     fazem sentido migrar.
   - Treinamentos: só são migrados os que têm id começando com "trein-"
     ou "novo-" — são os IDs que o próprio aplicativo gera ao cadastrar
     um treinamento pela tela. Os treinamentos fictícios originais têm
     IDs fixos (t01 a t08) e não são migrados automaticamente.
     ATENÇÃO: se alguém EDITOU um desses treinamentos fictícios pela tela
     (em vez de criar um novo), o registro editado guarda o ID antigo
     (t01, por exemplo) e portanto NÃO é pego por esta regra — precisa
     ser recriado manualmente depois da migração. Isso é avisado na tela.
   ========================================================================== */

window.Migracao = (function () {

  const CHAVE_ANTIGA = 'dhl-gestao-treinamentos:aduana:v1';

  function lerDadosAntigos() {
    try {
      const bruto = window.localStorage.getItem(CHAVE_ANTIGA);
      if (!bruto) return null;
      const dados = JSON.parse(bruto);
      return (dados && typeof dados === 'object') ? dados : null;
    } catch (erro) {
      console.warn('Não foi possível ler dados antigos do navegador:', erro);
      return null;
    }
  }

  function existemDadosAntigos() {
    return !!lerDadosAntigos();
  }

  function nomePorIdAntigo(id, dados) {
    const extra = (dados.colaboradoresExtras || []).find(c => c.id === id);
    if (extra) return extra.nome;
    const mock = (window.MOCK && window.MOCK.colaboradores || []).find(c => c.id === id);
    if (mock) return mock.nome;
    return null;
  }

  // Monta um resumo do que SERIA migrado, sem gravar nada ainda — igual
  // ao espírito da pré-visualização da importação de Excel.
  function montarPreVisualizacao() {
    const dados = lerDadosAntigos();
    if (!dados) return null;

    const treinamentosReais = (dados.treinamentos || []).filter(t => /^(trein-|novo-)/.test(t.id || ''));
    const treinamentosPossivelmenteEditados = (dados.treinamentos || []).filter(t => /^t\d+$/.test(t.id || ''));
    const ocorrenciasReais = dados.dadosReaisAtivos ? (dados.aduanaOcorrencias || []) : [];

    const idsReferenciados = new Set();
    treinamentosReais.forEach(t => idsReferenciados.add(t.colaboradorId));
    ocorrenciasReais.forEach(o => idsReferenciados.add(o.colaboradorId));

    const colaboradoresParaCriar = [];
    const semNomeEncontrado = [];
    idsReferenciados.forEach(id => {
      const nome = nomePorIdAntigo(id, dados);
      if (nome) colaboradoresParaCriar.push({ idAntigo: id, nome });
      else semNomeEncontrado.push(id);
    });

    return {
      colaboradoresParaCriar,
      treinamentosReais,
      treinamentosPossivelmenteEditados,
      ocorrenciasReais,
      importacoesAntigas: dados.importHistorico || [],
      semNomeEncontrado,
    };
  }

  // Executa a migração de verdade. "aoProgredir(mensagem)" é chamada a
  // cada etapa, para a tela mostrar o andamento.
  async function executar(preVisualizacao, aoProgredir) {
    const avisar = (msg) => { if (typeof aoProgredir === 'function') aoProgredir(msg); };
    const mapaIds = {};
    let colaboradoresCriados = 0;

    avisar('Migrando colaboradores...');
    for (const c of preVisualizacao.colaboradoresParaCriar) {
      const existente = window.Store.getColaboradorPorNome(c.nome);
      const colaborador = existente || await window.Store.getOuCriarColaboradorPorNome(c.nome);
      if (!existente) colaboradoresCriados++;
      mapaIds[c.idAntigo] = colaborador;
    }

    avisar('Migrando treinamentos...');
    let treinamentosMigrados = 0;
    for (const t of preVisualizacao.treinamentosReais) {
      const colaborador = mapaIds[t.colaboradorId];
      if (!colaborador) continue;
      await window.Store.addTreinamento({
        colaboradorId: colaborador.id,
        tipo: t.tipo,
        data: t.data,
        responsavel: t.responsavel,
        observacao: t.observacao,
      });
      treinamentosMigrados++;
    }

    avisar('Migrando ocorrências de Aduana...');
    const registros = preVisualizacao.ocorrenciasReais
      .map(o => ({ data: o.data, colaboradorId: mapaIds[o.colaboradorId] ? mapaIds[o.colaboradorId].id : null, aMais: o.aMais, faltante: o.faltante }))
      .filter(r => r.colaboradorId);
    const resultadoOcorrencias = registros.length > 0
      ? await window.Store.importarAduanaOcorrencias(registros)
      : { adicionados: 0, ignorados: 0 };

    avisar('Migrando histórico de importações...');
    let importacoesMigradas = 0;
    for (const h of preVisualizacao.importacoesAntigas) {
      await window.Store.registrarImportacao({
        arquivo: { name: h.arquivo, size: null, lastModified: null },
        registros: h.registros,
        ignorados: h.ignorados,
        status: (h.status || 'Importado') + ' (migrado)',
      });
      importacoesMigradas++;
    }

    return {
      colaboradoresCriados,
      treinamentosMigrados,
      ocorrenciasMigradas: resultadoOcorrencias.adicionados,
      ocorrenciasIgnoradas: resultadoOcorrencias.ignorados,
      importacoesMigradas,
    };
  }

  function limparDadosAntigos() {
    window.localStorage.removeItem(CHAVE_ANTIGA);
  }

  return { existemDadosAntigos, lerDadosAntigos, montarPreVisualizacao, executar, limparDadosAntigos };
})();
