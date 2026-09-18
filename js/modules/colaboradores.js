/* ==========================================================================
   colaboradores.js
   Módulo: COLABORADORES
   Lista geral (com abas e busca) e perfil individual com indicadores,
   treinamentos, ocorrências e uma análise básica de antes/depois.

   ETAPA 4: colunas de Aduana na lista, abas "Todos / Com ocorrência sem
   treinamento / Treinados", edição e exclusão de treinamento a partir do
   perfil, e a análise antes/depois agora trata o dia do treinamento à
   parte (não conta como "antes" nem como "depois").
   ========================================================================== */

window.ModuleColaboradores = (function () {

  // Aba selecionada na lista — vive só nesta sessão de navegação.
  let abaAtiva = 'todos'; // 'todos' | 'sem-treinamento' | 'treinados'

  function statsAtuais() {
    return Utils.computeAduanaStats(window.Store.getAduanaOcorrencias());
  }

  function renderList() {
    const stats = statsAtuais();
    const todos = window.Store.getColaboradores();

    const linhasBase = todos.map(c => {
      const dados = stats.porColaborador.get(c.id) || null;
      const ultimo = Store.getUltimoTreinamento(c.id);
      const treinado = Store.temTreinamento(c.id);
      return { colaborador: c, dados, ultimo, treinado };
    });

    let linhasFiltradas = linhasBase;
    if (abaAtiva === 'sem-treinamento') {
      linhasFiltradas = linhasBase.filter(l => l.dados && !l.treinado);
    } else if (abaAtiva === 'treinados') {
      linhasFiltradas = linhasBase.filter(l => l.treinado);
    }

    const linhasHtml = linhasFiltradas.map(({ colaborador: c, dados, ultimo, treinado }) => `
      <tr data-nav="colaboradores/${c.id}" style="cursor:pointer">
        <td>
          <div class="data-table__name">
            <span class="avatar">${Utils.initials(c.nome)}</span>
            <span>${c.nome}</span>
          </div>
        </td>
        <td>${dados ? dados.totalOcorrencias : 0}</td>
        <td>${dados ? dados.aMais : 0}</td>
        <td>${dados ? dados.faltante : 0}</td>
        <td><strong>${dados ? dados.somatoria : 0}</strong></td>
        <td>${dados ? dados.datas.size : 0}</td>
        <td>${ultimo ? Utils.formatDate(ultimo.data) : '<span class="section__hint">—</span>'}</td>
        <td>${treinado
          ? '<span class="badge badge--success">Treinado</span>'
          : '<span class="badge badge--neutral">Sem treinamento</span>'}</td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Colaboradores</h2>
            <p class="section__hint">${todos.length} colaboradores · lista construída a partir dos dados de Aduana</p>
          </div>
        </div>
        <div class="toolbar">
          <div class="tabs">
            <button class="tab ${abaAtiva === 'todos' ? 'is-active' : ''}" onclick="ModuleColaboradores.setAba('todos')">Todos</button>
            <button class="tab ${abaAtiva === 'sem-treinamento' ? 'is-active' : ''}" onclick="ModuleColaboradores.setAba('sem-treinamento')">Com ocorrência e sem treinamento</button>
            <button class="tab ${abaAtiva === 'treinados' ? 'is-active' : ''}" onclick="ModuleColaboradores.setAba('treinados')">Treinados</button>
          </div>
          <input class="input" type="text" id="colab-search" placeholder="Pesquisar colaborador..." style="min-width:220px">
        </div>
        <div class="card card--tight">
          <div class="table-scroll">
            <table class="data-table" id="colab-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Ocorrências</th>
                  <th>A mais</th>
                  <th>Faltante</th>
                  <th>Somatória</th>
                  <th>Dias</th>
                  <th>Último treinamento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${linhasHtml || `<tr><td colspan="8" class="data-table__empty">Nenhum colaborador nesta lista.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function setAba(aba) {
    abaAtiva = aba;
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = renderList();
    afterRenderList();
  }

  function afterRenderList() {
    const input = document.getElementById('colab-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const termo = input.value.trim().toLowerCase();
      let algumVisivel = false;
      document.querySelectorAll('#colab-table tbody tr[data-nav]').forEach(row => {
        const nomeEl = row.querySelector('.data-table__name span:last-child');
        const nome = nomeEl ? nomeEl.textContent.toLowerCase() : '';
        const bate = nome.includes(termo);
        row.style.display = bate ? '' : 'none';
        if (bate) algumVisivel = true;
      });
      toggleEmptyRow(!algumVisivel, termo);
    });
  }

  function toggleEmptyRow(mostrar, termo) {
    const tbody = document.querySelector('#colab-table tbody');
    if (!tbody) return;
    let linhaVazia = document.getElementById('colab-search-vazio');
    if (mostrar) {
      if (!linhaVazia) {
        linhaVazia = document.createElement('tr');
        linhaVazia.id = 'colab-search-vazio';
        linhaVazia.innerHTML = `<td colspan="8" class="data-table__empty">Nenhum colaborador encontrado para "${Utils.escapeHtml(termo)}".</td>`;
        tbody.appendChild(linhaVazia);
      }
    } else if (linhaVazia) {
      linhaVazia.remove();
    }
  }

  // -------------------------------------------------------------
  // Perfil individual
  // -------------------------------------------------------------

  function renderDetail(id) {
    const colaborador = Utils.getColaborador(id);
    if (!colaborador) {
      return `<div class="empty-state"><p class="empty-state__title">Colaborador não encontrado</p></div>`;
    }

    const ocorrenciasAduana = window.Store.getAduanaOcorrencias()
      .filter(o => o.colaboradorId === id)
      .sort((a, b) => b.data.localeCompare(a.data));
    const treinamentos = Store.getTreinamentosPorColaborador(id)
      .sort((a, b) => b.data.localeCompare(a.data));
    const ultimo = treinamentos[0] || null;

    const statsColab = Utils.computeAduanaStats(ocorrenciasAduana);

    return `
      <button class="back-link" data-nav="colaboradores">${Icons.arrowLeft} Voltar para Colaboradores</button>

      <div class="profile-header">
        <span class="profile-header__avatar">${Utils.initials(colaborador.nome)}</span>
        <div style="flex:1">
          <div class="profile-header__name">${colaborador.nome}</div>
          <div class="profile-header__meta">${colaborador.cargo} · ${colaborador.turno}</div>
        </div>
        <button class="btn btn--primary" type="button" onclick="ModuleTreinamentos.abrirModalTreinamento({colaboradorId:'${id}'})">+ Novo treinamento</button>
      </div>

      <div class="section">
        <div class="kpi-grid">
          ${kpi('Ocorrências (Aduana)', statsColab.totalOcorrencias)}
          ${kpi('Dias com ocorrência', statsColab.diasComOcorrencia)}
          ${kpi('Aduana a mais', statsColab.totalAMais)}
          ${kpi('Aduana faltante', statsColab.totalFaltante)}
        </div>
      </div>

      <div class="section">
        <div class="relacao-card">
          <div class="relacao-card__item">
            <span class="relacao-card__label">Ocorrências</span>
            <span class="relacao-card__valor">${statsColab.totalOcorrencias}</span>
          </div>
          <span class="relacao-card__seta">→</span>
          <div class="relacao-card__item">
            <span class="relacao-card__label">Último treinamento</span>
            <span class="relacao-card__valor">${ultimo ? Utils.formatDate(ultimo.data) : 'Sem treinamento'}</span>
          </div>
          <span class="badge ${ultimo ? 'badge--success' : 'badge--neutral'}" style="margin-left:auto">${ultimo ? 'Treinado' : 'Sem treinamento'}</span>
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="card card--tight">
            <div class="section__header" style="padding:var(--space-5) var(--space-5) 0">
              <h2 class="section__title">Treinamentos</h2>
            </div>
            ${treinamentoTable(treinamentos)}
          </div>
          <div class="card card--tight">
            <div class="section__header" style="padding:var(--space-5) var(--space-5) 0">
              <h2 class="section__title">Ocorrências · Aduana</h2>
            </div>
            ${ocorrenciasList(ocorrenciasAduana)}
          </div>
        </div>
      </div>

      ${AnaliseTreinamento.renderSecaoPerfil(id)}
    `;
  }

  function kpi(label, value, accent) {
    return `
      <div class="kpi-card">
        <span class="kpi-card__label">${label}</span>
        <span class="kpi-card__value ${accent ? 'kpi-card__value--accent' : ''}">${value}</span>
      </div>
    `;
  }

  function treinamentoTable(treinamentos) {
    if (treinamentos.length === 0) {
      return `<div class="data-table__empty">Nenhum treinamento registrado ainda.</div>`;
    }
    const linhas = treinamentos.map(t => `
      <tr>
        <td><span class="badge badge--info">${t.tipo}</span></td>
        <td>${Utils.formatDate(t.data)}</td>
        <td>${Utils.escapeHtml(t.responsavel)}</td>
        <td>${t.observacao ? Utils.escapeHtml(t.observacao) : '<span class="section__hint">—</span>'}</td>
        <td class="data-table__acoes">
          <button class="link-action" type="button" onclick="ModuleTreinamentos.abrirModalTreinamento({id:'${t.id}'})">Editar</button>
          <button class="link-action link-action--danger" type="button" onclick="ModuleTreinamentos.confirmarExclusao('${t.id}')">Excluir</button>
        </td>
      </tr>
    `).join('');
    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Treinamento</th><th>Data</th><th>Responsável</th><th>Observação</th><th>Ações</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  function ocorrenciasList(ocorrencias) {
    if (ocorrencias.length === 0) {
      return `<div class="data-table__empty">Nenhuma ocorrência registrada.</div>`;
    }
    const linhas = ocorrencias.map(o => `
      <tr>
        <td>${Utils.formatDate(o.data)}</td>
        <td>${o.aMais}</td>
        <td>${o.faltante}</td>
        <td><strong>${o.aMais + o.faltante}</strong></td>
      </tr>
    `).join('');
    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Data</th><th>A mais</th><th>Faltante</th><th>Somatória</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  // Compara a somatória de ocorrências antes e depois do treinamento mais
  // antigo. O dia do treinamento é tratado à parte — não entra nem no
  // "antes" nem no "depois" — para não interpretar errado o que aconteceu
  // no próprio dia. Não afirma causalidade, apenas apresenta os números.
  //
  // NOTA (Etapa 5): a análise completa (seleção de treinamento, período
  // ajustável, gráficos, reincidência) agora vive em
  // js/analise/render-perfil.js (window.AnaliseTreinamento), chamada
  // diretamente em renderDetail() acima. Esta função foi substituída.

  return { renderList, afterRenderList, renderDetail, setAba };
})();
