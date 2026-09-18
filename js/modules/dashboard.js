/* ==========================================================================
   dashboard.js
   Módulo: INÍCIO
   Visão geral do aplicativo — resumo do módulo Aduana (único ativo até
   o momento) e status dos demais módulos.
   ========================================================================== */

window.ModuleDashboard = (function () {

  const modulosInfo = [
    { id: 'aduana', nome: 'Aduana', desc: 'Controle de aduana a mais e faltante por colaborador.', icon: Icons.box, ativo: true },
    { id: 'avaria', nome: 'Avaria', desc: 'Registro de ocorrências de avaria de mercadorias.', icon: Icons.alertTriangle, ativo: false },
    { id: 'integracao', nome: 'Integração', desc: 'Cadastro e acompanhamento da integração de novos colaboradores.', icon: Icons.truck, ativo: true },
    { id: 'volumosos', nome: 'Volumosos', desc: 'Ocorrências e treinamentos de itens volumosos.', icon: Icons.layers, ativo: false },
  ];

  function render() {
    const stats = Utils.computeAduanaStats(window.Store.getAduanaOcorrencias());

    // Colaboradores com ocorrência mas sem treinamento de Aduana registrado
    // (considera também os treinamentos cadastrados pelo usuário nesta sessão)
    const colaboradoresTreinados = new Set(
      Store.getTreinamentos().filter(t => t.tipo === 'Aduana').map(t => t.colaboradorId)
    );
    const pendentes = [...stats.porColaborador.entries()]
      .filter(([colabId]) => !colaboradoresTreinados.has(colabId))
      .map(([colabId, dados]) => ({ colaborador: Utils.getColaborador(colabId), dados }))
      .sort((a, b) => b.dados.somatoria - a.dados.somatoria);

    return `
      ${Utils.renderSecaoTreinamentosPorMes()}

      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Módulos de treinamento</h2>
            <p class="section__hint">Selecione um módulo para visualizar os detalhes</p>
          </div>
        </div>
        <div class="module-grid">
          ${modulosInfo.map(moduleCard).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Colaboradores com ocorrência e sem treinamento</h2>
            <p class="section__hint">Aduana · prioridade sugerida por somatória geral</p>
          </div>
        </div>
        <div class="card card--tight">
          ${pendentesTable(pendentes)}
        </div>
      </div>
    `;
  }

  function moduleCard(mod) {
    if (mod.ativo) {
      return `
        <button class="module-card module-card--clickable" data-nav="treinamentos/${mod.id}">
          <div class="module-card__top">
            <span class="module-card__icon">${mod.icon}</span>
            <span class="badge badge--success">Ativo</span>
          </div>
          <span class="module-card__title">${mod.nome}</span>
          <p class="module-card__desc">${mod.desc}</p>
          <span class="module-card__footer">Ver detalhes →</span>
        </button>
      `;
    }
    return `
      <div class="module-card module-card--disabled">
        <div class="module-card__top">
          <span class="module-card__icon">${mod.icon}</span>
          <span class="badge badge--neutral">Em breve</span>
        </div>
        <span class="module-card__title">${mod.nome}</span>
        <p class="module-card__desc">${mod.desc}</p>
        <span class="module-card__footer">Em desenvolvimento</span>
      </div>
    `;
  }

  function pendentesTable(pendentes) {
    if (pendentes.length === 0) {
      return `<div class="data-table__empty">Nenhum colaborador pendente no momento.</div>`;
    }
    const linhas = pendentes.slice(0, 6).map(({ colaborador, dados }) => `
      <tr data-nav="colaboradores/${colaborador.id}" style="cursor:pointer">
        <td>
          <div class="data-table__name">
            <span class="avatar">${Utils.initials(colaborador.nome)}</span>
            <span>${colaborador.nome}</span>
          </div>
        </td>
        <td>${colaborador.cargo}</td>
        <td>${dados.totalOcorrencias}</td>
        <td>${dados.somatoria}</td>
        <td><span class="badge badge--danger">Sem treinamento</span></td>
      </tr>
    `).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Cargo</th>
              <th>Ocorrências</th>
              <th>Somatória</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  return { render };
})();
