/* ==========================================================================
   configuracoes.js
   Tela: CONFIGURAÇÕES
   Versão do aplicativo, usuário logado, e a ferramenta de migração dos
   dados antigos do navegador (Etapas 2 a 5) para o banco online.
   ========================================================================== */

window.ModuleConfiguracoes = (function () {

  let perfilAtual = null;

  function render() {
    return `
      <div class="section">
        <div class="section__header">
          <h2 class="section__title">Sobre</h2>
        </div>
        <div class="card">
          <div class="analise-fase__numeros" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
            <div><span>Versão</span><strong>${window.APP_VERSION || '1.0.0'}</strong></div>
            <div><span>Usuário logado</span><strong id="config-usuario">Carregando...</strong></div>
            <div><span>Permissão</span><strong id="config-papel">—</strong></div>
          </div>
        </div>
      </div>

      <div class="section" id="secao-migracao">
        ${Migracao.existemDadosAntigos() ? cardMigracao() : ''}
      </div>
    `;
  }

  function cardMigracao() {
    return `
      <div class="section__header">
        <div>
          <h2 class="section__title">Dados antigos encontrados neste navegador</h2>
          <p class="section__hint">Foram encontrados dados de uma versão anterior (armazenados só neste navegador). Você pode revisar e migrá-los para o banco online.</p>
        </div>
      </div>
      <div class="card">
        <button class="btn btn--primary" type="button" onclick="ModuleConfiguracoes.abrirPreVisualizacaoMigracao()">Ver o que será migrado</button>
      </div>
    `;
  }

  async function afterRender() {
    try {
      perfilAtual = await AuthService.perfilAtual();
      const elUsuario = document.getElementById('config-usuario');
      const elPapel = document.getElementById('config-papel');
      if (elUsuario) elUsuario.textContent = (perfilAtual && (perfilAtual.nome || perfilAtual.email)) || '—';
      if (elPapel) elPapel.textContent = perfilAtual && perfilAtual.papel === 'admin' ? 'Administrador' : 'Usuário';
    } catch (erro) {
      console.error('Erro ao carregar perfil:', erro);
    }
  }

  // -------------------------------------------------------------
  // Migração — pré-visualização em modal, igual ao espírito da
  // importação de Excel: mostra o que vai acontecer antes de gravar.
  // -------------------------------------------------------------

  function abrirPreVisualizacaoMigracao() {
    const p = Migracao.montarPreVisualizacao();
    if (!p) {
      Toast.show('Nenhum dado antigo encontrado neste navegador.', 'info');
      return;
    }

    const avisoEditados = p.treinamentosPossivelmenteEditados.length > 0
      ? `<div class="import-aviso-banner">⚠ ${p.treinamentosPossivelmenteEditados.length} treinamento(s) de demonstração original não entram automaticamente nesta migração (podem ter sido editados). Se algum deles for real, cadastre manualmente depois.</div>`
      : '';

    const avisoSemNome = p.semNomeEncontrado.length > 0
      ? `<div class="import-aviso-banner">⚠ ${p.semNomeEncontrado.length} colaborador(es) referenciado(s) não puderam ser identificados por nome e não serão migrados.</div>`
      : '';

    Modal.open({
      title: 'Migrar dados antigos para o banco online',
      wide: true,
      bodyHtml: `
        <div class="import-resumo">
          <div><span class="import-resumo__label">Colaboradores a criar</span><span class="import-resumo__valor">${p.colaboradoresParaCriar.length}</span></div>
          <div><span class="import-resumo__label">Treinamentos</span><span class="import-resumo__valor">${p.treinamentosReais.length}</span></div>
          <div><span class="import-resumo__label">Ocorrências de Aduana</span><span class="import-resumo__valor">${p.ocorrenciasReais.length}</span></div>
          <div><span class="import-resumo__label">Importações no histórico</span><span class="import-resumo__valor">${p.importacoesAntigas.length}</span></div>
        </div>
        ${avisoEditados}
        ${avisoSemNome}
        <p class="section__hint" style="margin:var(--space-4) 0">Nada será gravado até você confirmar. Os dados atuais no banco não são apagados — a migração só adiciona.</p>
        <div id="migracao-progresso" class="section__hint" style="display:none;margin-bottom:var(--space-3)"></div>
        <div class="form-actions">
          <button class="btn btn--ghost" type="button" onclick="Modal.close()">Cancelar</button>
          <button class="btn btn--primary" type="button" id="btn-confirmar-migracao" onclick="ModuleConfiguracoes.confirmarMigracao()">Confirmar migração</button>
        </div>
      `,
    });

    window.__migracaoPreVisualizacao = p;
  }

  async function confirmarMigracao() {
    const p = window.__migracaoPreVisualizacao;
    if (!p) return;

    const botao = document.getElementById('btn-confirmar-migracao');
    const progresso = document.getElementById('migracao-progresso');
    if (botao) botao.disabled = true;
    if (progresso) progresso.style.display = 'block';

    try {
      const resultado = await Migracao.executar(p, (msg) => {
        if (progresso) progresso.textContent = msg;
      });

      Modal.open({
        title: 'Migração concluída',
        bodyHtml: `
          <p style="margin-bottom:var(--space-4)">Confira os números abaixo e compare com o que você via no aplicativo antigo, para confirmar que está tudo certo:</p>
          <ul style="display:flex;flex-direction:column;gap:6px;margin:0 0 var(--space-5) var(--space-4)">
            <li>${resultado.colaboradoresCriados} colaborador(es) criado(s)</li>
            <li>${resultado.treinamentosMigrados} treinamento(s) migrado(s)</li>
            <li>${resultado.ocorrenciasMigradas} ocorrência(s) de Aduana migrada(s)${resultado.ocorrenciasIgnoradas ? ` (${resultado.ocorrenciasIgnoradas} já existiam e foram ignoradas)` : ''}</li>
            <li>${resultado.importacoesMigradas} registro(s) de histórico de importação migrado(s)</li>
          </ul>
          <p class="section__hint" style="margin-bottom:var(--space-4)">Os dados antigos continuam salvos neste navegador (não foram apagados). Depois de conferir que está tudo certo, você pode apagá-los para não ver este aviso de novo.</p>
          <div class="form-actions">
            <button class="btn btn--ghost" type="button" onclick="Modal.close()">Manter por enquanto</button>
            <button class="btn btn--primary" type="button" onclick="ModuleConfiguracoes.apagarDadosAntigos()">Apagar dados antigos deste navegador</button>
          </div>
        `,
      });

      if (window.App && typeof window.App.refresh === 'function') {
        window.App.refresh();
      }
    } catch (erro) {
      console.error('Erro na migração:', erro);
      if (botao) botao.disabled = false;
      Toast.show('A migração foi interrompida por um erro de conexão. Nada que já foi migrado se perde — você pode tentar de novo (registros repetidos são ignorados automaticamente).', 'warning');
    }
  }

  function apagarDadosAntigos() {
    Migracao.limparDadosAntigos();
    Modal.close();
    Toast.show('Dados antigos removidos deste navegador.', 'success');
    if (window.App && typeof window.App.refresh === 'function') {
      window.App.refresh();
    }
  }

  return { render, afterRender, abrirPreVisualizacaoMigracao, confirmarMigracao, apagarDadosAntigos };
})();
