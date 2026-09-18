/* ==========================================================================
   utils.js
   Funções auxiliares compartilhadas entre os módulos.
   ========================================================================== */

window.Utils = (function () {

  function formatDate(isoDate) {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatMonthLabel(isoDate) {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [y, m] = isoDate.split('-');
    return meses[parseInt(m, 10) - 1] + '/' + y.slice(2);
  }

  function initials(nome) {
    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  function getColaborador(id) {
    return window.Store.getColaboradores().find(c => c.id === id);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // Calcula os indicadores do módulo Aduana a partir das ocorrências fornecidas.
  function computeAduanaStats(ocorrencias) {
    const stats = {
      totalOcorrencias: ocorrencias.length,
      totalAMais: 0,
      totalFaltante: 0,
      somatoriaGeral: 0,
      diasComOcorrencia: 0,
      colaboradoresComOcorrencia: 0,
      porColaborador: new Map(), // id -> { totalOcorrencias, aMais, faltante, somatoria, datas:Set }
      porMes: new Map(),          // 'YYYY-MM' -> somatoria
    };

    const diasUnicos = new Set();

    ocorrencias.forEach(o => {
      const somatoria = o.aMais + o.faltante;
      stats.totalAMais += o.aMais;
      stats.totalFaltante += o.faltante;
      stats.somatoriaGeral += somatoria;
      diasUnicos.add(o.data);

      if (!stats.porColaborador.has(o.colaboradorId)) {
        stats.porColaborador.set(o.colaboradorId, {
          totalOcorrencias: 0, aMais: 0, faltante: 0, somatoria: 0, datas: new Set()
        });
      }
      const linha = stats.porColaborador.get(o.colaboradorId);
      linha.totalOcorrencias += 1;
      linha.aMais += o.aMais;
      linha.faltante += o.faltante;
      linha.somatoria += somatoria;
      linha.datas.add(o.data);

      const mesKey = o.data.slice(0, 7);
      stats.porMes.set(mesKey, (stats.porMes.get(mesKey) || 0) + somatoria);
    });

    stats.diasComOcorrencia = diasUnicos.size;
    stats.colaboradoresComOcorrencia = stats.porColaborador.size;

    return stats;
  }

  // ---------------------------------------------------------------
  // "Treinamentos por mês" — usado na aba Início e na aba Treinamentos.
  // Fica aqui (um lugar só) de propósito: as duas telas chamam esta
  // mesma função sobre os mesmos dados (Store.getTreinamentos()), então
  // nunca podem divergir uma da outra.
  // ---------------------------------------------------------------

  const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Agrupa uma lista de treinamentos por mês/ano (não mistura o mesmo mês
  // de anos diferentes: Set/2025 e Set/2026 ficam separados). Conta
  // TREINAMENTOS (um registro = um treinamento), nunca ocorrências.
  function agruparTreinamentosPorMes(treinamentos) {
    const contagem = new Map(); // 'YYYY-MM' -> quantidade
    treinamentos.forEach(t => {
      const chave = t.data.slice(0, 7);
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    });
    return [...contagem.keys()].sort().map(chave => {
      const [ano, mes] = chave.split('-');
      return { chave, label: `${NOMES_MESES[parseInt(mes, 10) - 1]}/${ano}`, total: contagem.get(chave) };
    });
  }

  // Desenha um gráfico de barras simples (reaproveita o estilo já usado
  // em Aduana) a partir de uma lista [{ label, total }].
  function renderGraficoBarras(dados, mensagemVazio) {
    if (!dados || dados.length === 0) {
      return `<div class="data-table__empty">${mensagemVazio || 'Sem dados suficientes.'}</div>`;
    }
    const max = Math.max(...dados.map(d => d.total), 1);
    const colunas = dados.map(d => `
      <div class="trend-chart__col">
        <span class="trend-chart__value">${d.total}</span>
        <div class="trend-chart__bar-wrap">
          <div class="trend-chart__bar" style="height:${Math.max((d.total / max) * 100, 6)}%"></div>
        </div>
        <span class="trend-chart__label">${d.label}</span>
      </div>
    `).join('');
    return `<div class="trend-chart">${colunas}</div>`;
  }

  // Seção completa "Treinamentos por mês" (título + gráfico), pronta para
  // ser colocada tanto na aba Início quanto na aba Treinamentos.
  function renderSecaoTreinamentosPorMes(subtitulo) {
    const dados = agruparTreinamentosPorMes(window.Store.getTreinamentos());
    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Treinamentos por mês</h2>
            <p class="section__hint">${subtitulo || 'Quantidade de treinamentos realizados'}</p>
          </div>
        </div>
        <div class="card">
          ${renderGraficoBarras(dados, 'Nenhum treinamento registrado ainda.')}
        </div>
      </div>
    `;
  }

  return {
    formatDate,
    formatMonthLabel,
    initials,
    getColaborador,
    escapeHtml,
    computeAduanaStats,
    agruparTreinamentosPorMes,
    renderGraficoBarras,
    renderSecaoTreinamentosPorMes,
  };
})();
