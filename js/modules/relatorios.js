/* ==========================================================================
   relatorios.js
   Módulo: DASHBOARD (antes "Relatórios", liberado e renomeado — Alteração 5)

   Indicadores e gráficos mensais de treinamento, usando os mesmos dados
   reais da aba Treinamentos (Store.getTreinamentos()) — nenhum número
   fictício. Toda a matemática (o que conta como "aplicação", "colaborador
   treinado" e "horas") vem de js/utils.js, compartilhada com a aba
   Treinamentos, para nunca haver divergência entre os números.
   ========================================================================== */

window.ModuleRelatorios = (function () {

  const hoje = new Date();
  let filtro = { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };

  const NOMES_MESES_COMPLETOS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  function redraw() {
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = render();
  }

  function anoMesSelecionado() {
    return `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}`;
  }

  function render() {
    const treinamentos = window.Store.getTreinamentos().filter(t => t.tipo === 'Aduana');
    const anoMes = anoMesSelecionado();
    const ind = Utils.calcularIndicadoresTreinamentoMes(treinamentos, anoMes);
    const serie = Utils.calcularSeriesTreinamento12Meses(treinamentos, anoMes);

    const dadosColaboradores = serie.map(s => ({ label: s.label, total: s.colaboradoresTreinados }));
    const dadosHoras = serie.map(s => ({ label: s.label, total: s.horasTreinamento }));
    const dadosAplicacoes = serie.map(s => ({ label: s.label, total: s.treinamentosAplicados }));

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Dashboard</h2>
            <p class="section__hint">Acompanhamento mensal dos treinamentos aplicados — dados reais da aba Treinamentos</p>
          </div>
        </div>
        <div class="card" style="margin-bottom:var(--space-4)">
          ${filtroToolbar()}
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <h2 class="section__title">${NOMES_MESES_COMPLETOS[filtro.mes - 1]}/${filtro.ano}</h2>
        </div>
        <div class="kpi-grid">
          ${kpi('👥 Colaboradores treinados', ind.colaboradoresTreinados)}
          ${kpi('⏱ Horas de treinamento', formatarHoras(ind.horasTreinamento))}
          ${kpi('📚 Treinamentos aplicados', ind.treinamentosAplicados)}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section__header">
            <h2 class="section__title" style="font-size:var(--fs-base)">Colaboradores treinados por mês</h2>
            <p class="section__hint">Últimos 12 meses, terminando em ${NOMES_MESES_COMPLETOS[filtro.mes - 1]}/${filtro.ano}</p>
          </div>
          ${Utils.renderGraficoBarras(dadosColaboradores, 'Sem dados neste período.')}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section__header">
            <h2 class="section__title" style="font-size:var(--fs-base)">Horas de treinamento por mês</h2>
          </div>
          ${Utils.renderGraficoBarras(dadosHoras, 'Sem dados neste período.')}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section__header">
            <h2 class="section__title" style="font-size:var(--fs-base)">Treinamentos aplicados por mês</h2>
          </div>
          ${Utils.renderGraficoBarras(dadosAplicacoes, 'Sem dados neste período.')}
        </div>
      </div>
    `;
  }

  function formatarHoras(valor) {
    const texto = String(valor).replace('.', ',');
    return `${texto}h`;
  }

  function kpi(label, value) {
    return `
      <div class="kpi-card">
        <span class="kpi-card__label">${label}</span>
        <span class="kpi-card__value">${value}</span>
      </div>
    `;
  }

  function filtroToolbar() {
    const opcoesMeses = NOMES_MESES_COMPLETOS.map((nome, idx) =>
      `<option value="${idx + 1}" ${filtro.mes === idx + 1 ? 'selected' : ''}>${nome}</option>`
    ).join('');

    const anoAtual = hoje.getFullYear();
    const anos = [];
    for (let a = anoAtual - 3; a <= anoAtual + 1; a++) anos.push(a);
    const opcoesAnos = anos.map(a => `<option value="${a}" ${filtro.ano === a ? 'selected' : ''}>${a}</option>`).join('');

    return `
      <div class="toolbar">
        <div class="field field--inline">
          <label for="rel-mes">Mês</label>
          <select class="input" id="rel-mes" onchange="ModuleRelatorios.onFiltroChange('mes', this.value)">${opcoesMeses}</select>
        </div>
        <div class="field field--inline">
          <label for="rel-ano">Ano</label>
          <select class="input" id="rel-ano" onchange="ModuleRelatorios.onFiltroChange('ano', this.value)">${opcoesAnos}</select>
        </div>
        <button class="btn btn--ghost" type="button" onclick="ModuleRelatorios.irParaMesAtual()">Mês atual</button>
      </div>
    `;
  }

  function onFiltroChange(campo, valor) {
    filtro[campo] = parseInt(valor, 10);
    redraw();
  }

  function irParaMesAtual() {
    filtro = { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
    redraw();
  }

  return { render, onFiltroChange, irParaMesAtual };
})();
