/* ==========================================================================
   state.js
   Estado da aplicação (Etapa 6: agora backed pelo Supabase).

   Até a Etapa 5, este arquivo guardava os dados em memória + localStorage.
   A partir desta etapa, o Supabase é a fonte da verdade — os dados moram
   no banco online, disponíveis de qualquer computador. Este arquivo passa
   a funcionar como um CACHE em memória: Store.inicializar() busca tudo do
   banco uma vez (depois do login) e guarda aqui, para que as telas
   continuem lendo os dados de forma instantânea e síncrona, exatamente
   como antes (nenhuma tela precisou ser reescrita por causa disso).

   As funções que MODIFICAM dados (cadastrar, editar, excluir, importar)
   agora são assíncronas: elas gravam no banco primeiro (via js/services/)
   e só depois atualizam o cache local. Se a gravação falhar (sem
   internet, erro do banco), o erro sobe para quem chamou tratar — o cache
   local não é alterado, evitando a tela mostrar algo que não foi salvo.
   ========================================================================== */

window.Store = (function () {

  let colaboradores = [];
  let treinamentos = [];
  let aduanaOcorrencias = [];
  let importHistorico = [];
  let integracoes = [];
  let inicializado = false;

  // Busca tudo do banco de uma vez. Deve ser chamado depois do login,
  // antes de desenhar qualquer tela do aplicativo.
  async function inicializar() {
    const [cols, trein, ocorr, historico, integ] = await Promise.all([
      ColaboradoresService.listarTodos(),
      TreinamentosService.listarTodos(),
      AduanaService.listarTodas(),
      ImportacoesService.listarTodas(),
      IntegracaoService.listarTodos(),
    ]);
    colaboradores = cols;
    treinamentos = trein;
    aduanaOcorrencias = ocorr;
    importHistorico = historico;
    integracoes = integ;
    inicializado = true;
  }

  function estaInicializado() {
    return inicializado;
  }

  function limpar() {
    colaboradores = [];
    treinamentos = [];
    aduanaOcorrencias = [];
    importHistorico = [];
    integracoes = [];
    inicializado = false;
  }

  // -------------------------------------------------------------
  // Colaboradores
  // -------------------------------------------------------------

  function getColaboradores() {
    return colaboradores;
  }

  function normalizarNome(nome) {
    return String(nome || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function getColaboradorPorNome(nome) {
    const alvo = normalizarNome(nome);
    return colaboradores.find(c => normalizarNome(c.nome) === alvo) || null;
  }

  // Usado na importação: reaproveita o colaborador se o nome já existir,
  // ou cria um novo registro no banco caso a planilha traga alguém que
  // ainda não está cadastrado.
  async function getOuCriarColaboradorPorNome(nome) {
    const existente = getColaboradorPorNome(nome);
    if (existente) return existente;

    const novo = await ColaboradoresService.criar({ nome: String(nome).trim(), origem: 'importado' });
    colaboradores.push(novo);
    return novo;
  }

  // -------------------------------------------------------------
  // Treinamentos
  // -------------------------------------------------------------

  function getTreinamentos() {
    return treinamentos;
  }

  function getTreinamentosPorColaborador(colaboradorId) {
    return treinamentos.filter(t => t.colaboradorId === colaboradorId);
  }

  function getUltimoTreinamento(colaboradorId) {
    const lista = getTreinamentosPorColaborador(colaboradorId)
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data));
    return lista[0] || null;
  }

  function temTreinamento(colaboradorId) {
    return treinamentos.some(t => t.colaboradorId === colaboradorId);
  }

  function getTreinamentoPorId(id) {
    return treinamentos.find(t => t.id === id) || null;
  }

  async function addTreinamento(dados) {
    const registro = await TreinamentosService.criar(dados);
    treinamentos.push(registro);
    return registro;
  }

  async function updateTreinamento(id, dados) {
    const atualizado = await TreinamentosService.atualizar(id, dados);
    const idx = treinamentos.findIndex(t => t.id === id);
    if (idx !== -1) treinamentos[idx] = atualizado;
    return atualizado;
  }

  async function deleteTreinamento(id) {
    await TreinamentosService.excluir(id);
    treinamentos = treinamentos.filter(t => t.id !== id);
    return true;
  }

  // -------------------------------------------------------------
  // Ocorrências de Aduana
  // -------------------------------------------------------------

  function getAduanaOcorrencias() {
    return aduanaOcorrencias;
  }

  // Mantida por compatibilidade com as telas já existentes: agora só
  // indica se ainda não há nenhum dado de Aduana no banco.
  function usandoDadosFicticiosAduana() {
    return aduanaOcorrencias.length === 0;
  }

  // Recebe os registros já validados de uma importação e grava no banco.
  // A proteção contra duplicidade é garantida pelo próprio banco (ver
  // js/services/aduanaService.js) — aqui só refletimos o resultado no cache.
  async function importarAduanaOcorrencias(registrosNovos, importacaoId) {
    const resultado = await AduanaService.inserirLote(registrosNovos, importacaoId);
    if (resultado.registros && resultado.registros.length > 0) {
      aduanaOcorrencias = aduanaOcorrencias.concat(resultado.registros);
    }
    return { adicionados: resultado.adicionados, ignorados: resultado.ignorados };
  }

  // -------------------------------------------------------------
  // Controle de arquivos já importados (agora consultado no banco, então
  // funciona mesmo trocando de computador).
  // -------------------------------------------------------------

  async function arquivoJaImportado(arquivo) {
    return ImportacoesService.arquivoJaImportado(arquivo.name, arquivo.size, arquivo.lastModified);
  }

  // -------------------------------------------------------------
  // Histórico de importações
  // -------------------------------------------------------------

  function getImportHistorico() {
    return importHistorico;
  }

  async function registrarImportacao({ arquivo, registros, ignorados, status }) {
    const registro = await ImportacoesService.registrar({
      arquivoNome: arquivo.name || arquivo,
      arquivoTamanho: arquivo.size,
      arquivoModificadoEm: arquivo.lastModified,
      registrosAdicionados: registros,
      registrosIgnorados: ignorados,
      status,
    });
    importHistorico.unshift(registro);
    return registro;
  }

  // -------------------------------------------------------------
  // Integração — módulo independente de Aduana e de treinamentos.
  // -------------------------------------------------------------

  function getIntegracoes() {
    return integracoes;
  }

  function getIntegracaoPorId(id) {
    return integracoes.find(i => i.id === id) || null;
  }

  async function addIntegracao(dados) {
    const registro = await IntegracaoService.criar(dados);
    integracoes.push(registro);
    return registro;
  }

  async function updateIntegracao(id, dados) {
    const atualizado = await IntegracaoService.atualizar(id, dados);
    const idx = integracoes.findIndex(i => i.id === id);
    if (idx !== -1) integracoes[idx] = atualizado;
    return atualizado;
  }

  async function deleteIntegracao(id) {
    await IntegracaoService.excluir(id);
    integracoes = integracoes.filter(i => i.id !== id);
    return true;
  }

  return {
    inicializar,
    estaInicializado,
    limpar,
    // colaboradores
    getColaboradores,
    getColaboradorPorNome,
    getOuCriarColaboradorPorNome,
    // treinamentos
    getTreinamentos,
    getTreinamentosPorColaborador,
    getUltimoTreinamento,
    temTreinamento,
    getTreinamentoPorId,
    addTreinamento,
    updateTreinamento,
    deleteTreinamento,
    // aduana
    getAduanaOcorrencias,
    usandoDadosFicticiosAduana,
    importarAduanaOcorrencias,
    // importações
    arquivoJaImportado,
    getImportHistorico,
    registrarImportacao,
    // integração
    getIntegracoes,
    getIntegracaoPorId,
    addIntegracao,
    updateIntegracao,
    deleteIntegracao,
  };
})();
