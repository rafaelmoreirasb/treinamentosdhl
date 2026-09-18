/* ==========================================================================
   render-dashboard.js
   Módulo: ANÁLISE DE EFICÁCIA DO TREINAMENTO — seção consolidada do
   dashboard Aduana (todos os colaboradores treinados, visão geral).

   Diferente da análise individual (render-perfil.js), aqui não há seleção
   de período por colaborador: cada colaborador treinado usa o próprio
   histórico completo de ocorrências (antes/depois do treinamento mais
   recente dele), e os números são somados. É uma visão geral, não uma
   substituição da análise individual.
   ========================================================================== */

window.AnaliseDashboard = (function () {

  function calcularConsolidado() {
    const treinados = window.Store.getColaboradores().filter(c =>
      Store.getTreinamentosPorColaborador(c.id).some(t => t.tipo === 'Aduana')
    );

    let totalTreinamentos = Store.getTreinamentos().filter(t => t.tipo === 'Aduana').length;
    let ocorrenciasAntes = 0;
    let ocorrenciasDepois = 0;
    let diasAntesSoma = 0;
    let diasDepoisSoma = 0;
    let colaboradoresComOcorrenciaAntes = 0;
    let colaboradoresComDadosDepois = 0;

    treinados.forEach(c => {
      const treinos = Store.getTreinamentosPorColaborador(c.id)
        .filter(t => t.tipo === 'Aduana')
        .sort((a, b) => a.data.localeCompare(b.data));
      const ultimoTreino = treinos[treinos.length - 1];
      const ocorrencias = window.Store.getAduanaOcorrencias().filter(o => o.colaboradorId === c.id);

      const antes = ocorrencias.filter(o => o.data < ultimoTreino.data);
      const depois = ocorrencias.filter(o => o.data > ultimoTreino.data);

      if (antes.length > 0) {
        colaboradoresComOcorrenciaAntes++;
        const datas = antes.map(o => o.data).sort();
        diasAntesSoma += Analise.diasNoPeriodo(datas[0], datas[datas.length - 1]);
        ocorrenciasAntes += antes.reduce((s, o) => s + o.aMais + o.faltante, 0);
      }
      if (depois.length > 0) {
        colaboradoresComDadosDepois++;
        const datas = depois.map(o => o.data).sort();
        diasDepoisSoma += Analise.diasNoPeriodo(datas[0], datas[datas.length - 1]);
        ocorrenciasDepois += depois.reduce((s, o) => s + o.aMais + o.faltante, 0);
      }
    });

    return {
      totalColaboradoresTreinados: treinados.length,
      colaboradoresComOcorrenciaAntes,
      colaboradoresComDadosDepois,
      totalTreinamentos,
      ocorrenciasAntes,
      ocorrenciasDepois,
      mediaDiariaAntes: diasAntesSoma > 0 ? ocorrenciasAntes / diasAntesSoma : null,
      mediaDiariaDepois: diasDepoisSoma > 0 ? ocorrenciasDepois / diasDepoisSoma : null,
    };
  }

  function render() {
    const c = calcularConsolidado();

    if (c.totalColaboradoresTreinados === 0) {
      return `
        <div class="section">
          <div class="section__header">
            <h2 class="section__title">Análise de treinamentos</h2>
          </div>
          <div class="empty-state">
            <p class="empty-state__text">Ainda não há colaboradores treinados para calcular esta visão geral.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Análise de treinamentos</h2>
            <p class="section__hint">Visão geral — cada colaborador usa o histórico completo de ocorrências em torno do seu treinamento mais recente. Para ajustar o período ou escolher outro treinamento, use a análise no perfil de cada colaborador.</p>
          </div>
        </div>
        <div class="kpi-grid">
          ${kpi('Colaboradores treinados', c.totalColaboradoresTreinados)}
          ${kpi('Treinamentos realizados', c.totalTreinamentos)}
          ${kpi('Com ocorrência antes do treinamento', c.colaboradoresComOcorrenciaAntes)}
          ${kpi('Com dados depois do treinamento', c.colaboradoresComDadosDepois)}
          ${kpi('Ocorrências antes (soma)', c.ocorrenciasAntes)}
          ${kpi('Ocorrências depois (soma)', c.ocorrenciasDepois)}
          ${kpi('Média diária antes', c.mediaDiariaAntes != null ? c.mediaDiariaAntes.toFixed(2).replace('.', ',') : '—')}
          ${kpi('Média diária depois', c.mediaDiariaDepois != null ? c.mediaDiariaDepois.toFixed(2).replace('.', ',') : '—')}
        </div>
      </div>
    `;
  }

  function kpi(label, value) {
    return `
      <div class="kpi-card">
        <span class="kpi-card__label">${label}</span>
        <span class="kpi-card__value">${value}</span>
      </div>
    `;
  }

  return { render, calcularConsolidado };
})();
