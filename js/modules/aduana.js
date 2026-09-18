/* ==========================================================================
   aduana.js
   Módulo: TREINAMENTOS > ADUANA
   Indicadores, filtros, evolução mensal, ranking e tabela de ocorrências.
   Os dados específicos deste módulo são isolados dos demais.

   ETAPA 2: filtros (período e colaborador) e ordenação da tabela.
   ETAPA 3: os dados vêm do Store (window.Store.getAduanaOcorrencias()).
   ETAPA 6: o Store agora é alimentado pelo banco de dados (Supabase) em
   vez de dados fictícios/localStorage — ver js/state.js.
   ========================================================================== */

window.ModuleAduana = (function () {

  // Estado dos filtros e da ordenação — vivem apenas nesta sessão.
  let filtros = { inicio: '', fim: '', colaboradorId: '' };
  let ordenacao = { campo: 'data', direcao: 'desc' };

  function render() {
    const todas = window.Store.getAduanaOcorrencias();
    const filtradas = ordenar(aplicarFiltros(todas));
    const stats = Utils.computeAduanaStats(filtradas);
    const usandoFicticios = window.Store.usandoDadosFicticiosAduana();
    const indTreino = calcularIndicadoresTreinamento(stats);

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Indicadores operacionais</h2>
            <p class="section__hint">Somatória geral = Aduana a Mais + Aduana Faltante</p>
          </div>
          <span class="badge ${usandoFicticios ? 'badge--neutral' : 'badge--success'}">
            ${usandoFicticios ? 'Nenhum dado importado ainda' : 'Dados do banco (online)'}
          </span>
        </div>
        <div class="kpi-grid">
          ${kpi('Total de ocorrências', stats.totalOcorrencias)}
          ${kpi('Aduana a mais', stats.totalAMais)}
          ${kpi('Aduana faltante', stats.totalFaltante)}
          ${kpi('Somatória geral', stats.somatoriaGeral, true)}
          ${kpi('Colaboradores com ocorrência', stats.colaboradoresComOcorrencia)}
          ${kpi('Dias com ocorrência', stats.diasComOcorrencia)}
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Indicadores de treinamento</h2>
            <p class="section__hint">Colaboradores com ocorrência considera o período filtrado acima; treinamentos consideram o histórico completo (a data do treinamento não é afetada pelo filtro de período)</p>
          </div>
        </div>
        <div class="kpi-grid">
          ${kpi('Colaboradores treinados', indTreino.treinados)}
          ${kpi('Colaboradores sem treinamento', indTreino.semTreinamento)}
          ${kpi('Total de treinamentos (histórico)', indTreino.totalTreinamentos)}
          ${kpi(`Cobertura de treinamento <span class="info-tip" title="Cobertura = (colaboradores com ocorrência já treinados ÷ colaboradores com ocorrência) × 100. Considera o período filtrado.">ⓘ</span>`, indTreino.coberturaTexto, true)}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section__header">
            <h2 class="section__title">Filtros</h2>
          </div>
          ${filtrosToolbar()}
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="card">
            <div class="section__header">
              <h2 class="section__title">Evolução por mês</h2>
            </div>
            ${trendChart(stats.porMes)}
          </div>
          <div class="card">
            <div class="section__header">
              <h2 class="section__title">Ranking de colaboradores</h2>
            </div>
            ${ranking(stats.porColaborador)}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="card card--tight">
            <div class="section__header" style="padding:var(--space-5) var(--space-5) 0">
              <h2 class="section__title">Colaboradores com ocorrência e sem treinamento</h2>
            </div>
            ${semTreinamentoTable(indTreino)}
          </div>
          <div class="card card--tight">
            <div class="section__header" style="padding:var(--space-5) var(--space-5) 0">
              <h2 class="section__title">Últimos treinamentos</h2>
            </div>
            ${ultimosTreinamentos()}
          </div>
        </div>
      </div>

      ${AnaliseDashboard.render()}

      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Ocorrências registradas</h2>
            <p class="section__hint">${filtradas.length} de ${todas.length} registro(s)</p>
          </div>
          <button class="btn btn--secondary" type="button" onclick="ModuleAduanaImport.abrirSeletor()">Importar Excel</button>
        </div>
        <div class="card card--tight">
          ${occurrenceTable(filtradas)}
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Histórico de importações</h2>
            <p class="section__hint">Planilhas de Aduana importadas nesta sessão</p>
          </div>
        </div>
        <div class="card card--tight">
          ${historicoImportacoes()}
        </div>
      </div>
    `;
  }

  // Colaboradores com ocorrência no período filtrado, cruzados com o
  // histórico completo de treinamentos de Aduana (a data do treinamento
  // não é limitada pelo filtro de período — ver aviso na tela).
  function calcularIndicadoresTreinamento(stats) {
    const idsComOcorrencia = [...stats.porColaborador.keys()];
    const treinadosIds = idsComOcorrencia.filter(id =>
      Store.getTreinamentosPorColaborador(id).some(t => t.tipo === 'Aduana')
    );
    const semTreinamentoIds = idsComOcorrencia.filter(id => !treinadosIds.includes(id));
    const totalTreinamentos = Store.getTreinamentos().filter(t => t.tipo === 'Aduana').length;
    const cobertura = idsComOcorrencia.length > 0
      ? Math.round((treinadosIds.length / idsComOcorrencia.length) * 100)
      : null;

    return {
      treinados: treinadosIds.length,
      semTreinamento: semTreinamentoIds.length,
      totalTreinamentos,
      coberturaTexto: cobertura === null ? '—' : `${cobertura}%`,
      treinadosIds,
      semTreinamentoIds,
    };
  }

  function semTreinamentoTable(indTreino) {
    const stats = Utils.computeAduanaStats(ordenar(aplicarFiltros(window.Store.getAduanaOcorrencias())));
    const linhas = indTreino.semTreinamentoIds
      .map(id => ({ colaborador: Utils.getColaborador(id), dados: stats.porColaborador.get(id) }))
      .filter(item => item.colaborador && item.dados)
      .sort((a, b) => b.dados.somatoria - a.dados.somatoria)
      .slice(0, 8);

    if (linhas.length === 0) {
      return `<div class="data-table__empty">Nenhum colaborador com ocorrência e sem treinamento no período selecionado.</div>`;
    }

    const corpo = linhas.map(({ colaborador, dados }) => `
      <tr data-nav="colaboradores/${colaborador.id}" style="cursor:pointer">
        <td>
          <div class="data-table__name">
            <span class="avatar">${Utils.initials(colaborador.nome)}</span>
            <span>${colaborador.nome}</span>
          </div>
        </td>
        <td>${dados.totalOcorrencias}</td>
        <td>${dados.datas.size}</td>
        <td>${dados.aMais}</td>
        <td>${dados.faltante}</td>
      </tr>
    `).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Colaborador</th><th>Ocorrências</th><th>Dias</th><th>A mais</th><th>Faltante</th></tr></thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  }

  function ultimosTreinamentos() {
    const lista = window.Store.getTreinamentos()
      .filter(t => t.tipo === 'Aduana')
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8);

    if (lista.length === 0) {
      return `<div class="data-table__empty">Nenhum treinamento registrado ainda.</div>`;
    }

    const corpo = lista.map(t => {
      const colaborador = Utils.getColaborador(t.colaboradorId);
      const nome = colaborador ? colaborador.nome : '(colaborador não encontrado)';
      return `
        <tr data-nav="colaboradores/${t.colaboradorId}" style="cursor:pointer">
          <td>
            <div class="data-table__name">
              <span class="avatar">${colaborador ? Utils.initials(colaborador.nome) : '?'}</span>
              <span>${nome}</span>
            </div>
          </td>
          <td>${Utils.formatDate(t.data)}</td>
          <td>${Utils.escapeHtml(t.responsavel)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Colaborador</th><th>Data</th><th>Responsável</th></tr></thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  }

  function redraw() {
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = render();
  }

  function aplicarFiltros(lista) {
    return lista.filter(o => {
      if (filtros.inicio && o.data < filtros.inicio) return false;
      if (filtros.fim && o.data > filtros.fim) return false;
      if (filtros.colaboradorId && o.colaboradorId !== filtros.colaboradorId) return false;
      return true;
    });
  }

  function ordenar(lista) {
    const dir = ordenacao.direcao === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      if (ordenacao.campo === 'nome') {
        const nomeA = Utils.getColaborador(a.colaboradorId).nome;
        const nomeB = Utils.getColaborador(b.colaboradorId).nome;
        return nomeA.localeCompare(nomeB) * dir;
      }
      if (ordenacao.campo === 'somatoria') {
        return ((a.aMais + a.faltante) - (b.aMais + b.faltante)) * dir;
      }
      // padrão: data
      return a.data.localeCompare(b.data) * dir;
    });
  }

  function onFiltroChange(campo, valor) {
    filtros[campo] = valor;
    redraw();
  }

  function limparFiltros() {
    filtros = { inicio: '', fim: '', colaboradorId: '' };
    redraw();
  }

  function setSort(campo) {
    if (ordenacao.campo === campo) {
      ordenacao.direcao = ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    } else {
      ordenacao = { campo, direcao: 'asc' };
    }
    redraw();
  }

  function kpi(label, value, accent) {
    return `
      <div class="kpi-card">
        <span class="kpi-card__label">${label}</span>
        <span class="kpi-card__value ${accent ? 'kpi-card__value--accent' : ''}">${value}</span>
      </div>
    `;
  }

  function filtrosToolbar() {
    const opcoesColaboradores = window.Store.getColaboradores().map(c =>
      `<option value="${c.id}" ${filtros.colaboradorId === c.id ? 'selected' : ''}>${c.nome}</option>`
    ).join('');

    return `
      <div class="toolbar">
        <div class="field field--inline">
          <label for="filtro-inicio">Período inicial</label>
          <input class="input" type="date" id="filtro-inicio" value="${filtros.inicio}"
                 onchange="ModuleAduana.onFiltroChange('inicio', this.value)">
        </div>
        <div class="field field--inline">
          <label for="filtro-fim">Período final</label>
          <input class="input" type="date" id="filtro-fim" value="${filtros.fim}"
                 onchange="ModuleAduana.onFiltroChange('fim', this.value)">
        </div>
        <div class="field field--inline">
          <label for="filtro-colaborador">Colaborador</label>
          <select class="input" id="filtro-colaborador"
                  onchange="ModuleAduana.onFiltroChange('colaboradorId', this.value)">
            <option value="">Todos os colaboradores</option>
            ${opcoesColaboradores}
          </select>
        </div>
        <button class="btn btn--ghost" type="button" onclick="ModuleAduana.limparFiltros()">Limpar filtros</button>
      </div>
    `;
  }

  function trendChart(porMes) {
    const meses = [...porMes.keys()].sort();
    if (meses.length === 0) {
      return `<div class="data-table__empty">Nenhuma ocorrência encontrada para os filtros selecionados.</div>`;
    }
    const max = Math.max(...meses.map(m => porMes.get(m)));
    const cols = meses.map(m => {
      const valor = porMes.get(m);
      const alturaPct = max > 0 ? Math.max((valor / max) * 100, 6) : 6;
      const isPeak = valor === max;
      return `
        <div class="trend-chart__col">
          <span class="trend-chart__value">${valor}</span>
          <div class="trend-chart__bar-wrap">
            <div class="trend-chart__bar ${isPeak ? 'trend-chart__bar--peak' : ''}" style="height:${alturaPct}%"></div>
          </div>
          <span class="trend-chart__label">${Utils.formatMonthLabel(m + '-01')}</span>
        </div>
      `;
    }).join('');
    return `<div class="trend-chart">${cols}</div>`;
  }

  function ranking(porColaborador) {
    const lista = [...porColaborador.entries()]
      .map(([id, dados]) => ({ colaborador: Utils.getColaborador(id), dados }))
      .sort((a, b) => b.dados.somatoria - a.dados.somatoria)
      .slice(0, 6);

    if (lista.length === 0) {
      return `<div class="data-table__empty">Nenhuma ocorrência encontrada para os filtros selecionados.</div>`;
    }

    const max = lista[0].dados.somatoria;

    const itens = lista.map((item, index) => `
      <div class="ranking-item">
        <span class="ranking-item__position ${index === 0 ? 'ranking-item__position--top' : ''}">${index + 1}</span>
        <div class="ranking-item__body">
          <span class="ranking-item__name">${item.colaborador.nome}</span>
          <div class="ranking-item__bar-track">
            <div class="ranking-item__bar-fill" style="width:${max > 0 ? (item.dados.somatoria / max) * 100 : 0}%"></div>
          </div>
          <span class="ranking-item__meta">${item.dados.totalOcorrencias} ocorrência(s) · ${item.dados.datas.size} dia(s) com ocorrência</span>
        </div>
        <span class="ranking-item__count">${item.dados.somatoria}</span>
      </div>
    `).join('');

    return `<div class="ranking-list">${itens}</div>`;
  }

  function sortArrow(campo) {
    if (ordenacao.campo !== campo) return '';
    return ordenacao.direcao === 'asc' ? ' ▲' : ' ▼';
  }

  function occurrenceTable(ocorrencias) {
    if (ocorrencias.length === 0) {
      return `<div class="data-table__empty">Nenhuma ocorrência encontrada para os filtros selecionados.</div>`;
    }

    const linhas = ocorrencias.map(o => {
      const colaborador = Utils.getColaborador(o.colaboradorId);
      const nome = colaborador ? colaborador.nome : '(colaborador não encontrado)';
      const somatoria = o.aMais + o.faltante;
      return `
        <tr data-nav="colaboradores/${o.colaboradorId}" style="cursor:pointer">
          <td>${Utils.formatDate(o.data)}</td>
          <td>
            <div class="data-table__name">
              <span class="avatar">${colaborador ? Utils.initials(colaborador.nome) : '?'}</span>
              <span>${nome}</span>
            </div>
          </td>
          <td>${o.aMais}</td>
          <td>${o.faltante}</td>
          <td><strong>${somatoria}</strong></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th class="is-sortable" onclick="ModuleAduana.setSort('data')">Data${sortArrow('data')}</th>
              <th class="is-sortable" onclick="ModuleAduana.setSort('nome')">Nome${sortArrow('nome')}</th>
              <th>Aduana a mais</th>
              <th>Aduana faltante</th>
              <th class="is-sortable" onclick="ModuleAduana.setSort('somatoria')">Somatória geral${sortArrow('somatoria')}</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  function historicoImportacoes() {
    const historico = window.Store.getImportHistorico();
    if (historico.length === 0) {
      return `<div class="data-table__empty">Nenhuma planilha foi importada ainda.</div>`;
    }
    const linhas = historico.map(h => {
      const dataHora = new Date(h.dataHora);
      const dataFormatada = isNaN(dataHora) ? '—' : dataHora.toLocaleString('pt-BR');
      return `
        <tr>
          <td>${Utils.escapeHtml(h.arquivo)}</td>
          <td>${dataFormatada}</td>
          <td>${h.registros} registro(s)${h.ignorados ? ` · ${h.ignorados} ignorado(s) por duplicidade` : ''}</td>
          <td><span class="badge badge--success">${h.status}</span></td>
        </tr>
      `;
    }).join('');
    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Arquivo</th><th>Data/hora</th><th>Registros</th><th>Status</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  return { render, onFiltroChange, limparFiltros, setSort };
})();
