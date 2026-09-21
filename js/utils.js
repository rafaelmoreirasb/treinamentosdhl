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

  // Agrupa as linhas de treinamento por "aplicacaoId" — várias linhas
  // (uma por colaborador) que pertencem à mesma aplicação viram um só
  // grupo. Registros antigos, sem aplicacaoId, contam cada um como sua
  // própria aplicação (usa o próprio id como chave).
  function agruparTreinamentosPorAplicacao(treinamentos) {
    const mapa = new Map(); // chave -> [linhas]
    treinamentos.forEach(t => {
      const chave = t.aplicacaoId || t.id;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(t);
    });
    return mapa;
  }

  // Agrupa por mês/ano (não mistura o mesmo mês de anos diferentes: Set/2025
  // e Set/2026 ficam separados). Conta APLICAÇÕES de treinamento — um
  // treinamento aplicado a vários colaboradores conta uma vez só, nunca
  // ocorrências de Aduana.
  function agruparTreinamentosPorMes(treinamentos) {
    const porAplicacao = agruparTreinamentosPorAplicacao(treinamentos);
    const contagem = new Map(); // 'YYYY-MM' -> quantidade de aplicações
    porAplicacao.forEach(linhas => {
      const chave = linhas[0].data.slice(0, 7);
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    });
    return [...contagem.keys()].sort().map(chave => {
      const [ano, mes] = chave.split('-');
      return { chave, label: `${NOMES_MESES[parseInt(mes, 10) - 1]}/${ano}`, total: contagem.get(chave) };
    });
  }

  // ---------------------------------------------------------------
  // Indicadores mensais para o Dashboard (Colaboradores treinados,
  // Horas de treinamento, Treinamentos aplicados). Diferencia claramente
  // os três conceitos — ver comentários de cada um.
  // ---------------------------------------------------------------

  function calcularIndicadoresTreinamentoMes(treinamentos, anoMes) {
    const doMes = treinamentos.filter(t => t.data.slice(0, 7) === anoMes);
    const porAplicacao = agruparTreinamentosPorAplicacao(doMes);

    // Colaboradores treinados: pessoas DISTINTAS no mês — se a mesma
    // pessoa participou de 3 treinamentos no mês, conta uma vez só.
    const colaboradoresUnicos = new Set(doMes.map(t => t.colaboradorId));

    // Horas de treinamento: soma a carga horária UMA VEZ por aplicação
    // (nunca multiplicada pela quantidade de participantes daquela aplicação).
    let horas = 0;
    porAplicacao.forEach(linhas => {
      horas += Number(linhas[0].cargaHoraria) || 0;
    });

    return {
      colaboradoresTreinados: colaboradoresUnicos.size,
      horasTreinamento: horas,
      treinamentosAplicados: porAplicacao.size,
    };
  }

  // Mês anterior/posterior no formato 'YYYY-MM', para montar séries de
  // vários meses sem depender de bibliotecas de data.
  function deslocarAnoMes(anoMes, delta) {
    const [ano, mes] = anoMes.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1 + delta, 1));
    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // Série dos últimos 12 meses (incluindo o mês informado como o último),
  // com os três indicadores lado a lado — usada nos três gráficos do
  // Dashboard.
  function calcularSeriesTreinamento12Meses(treinamentos, anoMesFinal) {
    const meses = [];
    for (let i = 11; i >= 0; i--) meses.push(deslocarAnoMes(anoMesFinal, -i));

    return meses.map(anoMes => {
      const [ano, mes] = anoMes.split('-');
      const ind = calcularIndicadoresTreinamentoMes(treinamentos, anoMes);
      return {
        anoMes,
        label: `${NOMES_MESES[parseInt(mes, 10) - 1]}/${ano}`,
        colaboradoresTreinados: ind.colaboradoresTreinados,
        horasTreinamento: ind.horasTreinamento,
        treinamentosAplicados: ind.treinamentosAplicados,
      };
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

  // Valida CPF (formato + dígitos verificadores). Aceita com ou sem
  // pontuação. Rejeita sequências óbvias (000.000.000-00, 111.111.111-11
  // etc.) que passariam no cálculo mas nunca são CPFs reais.
  function validarCPF(valor) {
    const digitos = String(valor || '').replace(/\D/g, '');
    if (digitos.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digitos)) return false;

    function calcularDigito(base) {
      let soma = 0;
      for (let i = 0; i < base.length; i++) {
        soma += parseInt(base[i], 10) * (base.length + 1 - i);
      }
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    }

    const d1 = calcularDigito(digitos.slice(0, 9));
    const d2 = calcularDigito(digitos.slice(0, 9) + d1);
    return digitos === digitos.slice(0, 9) + String(d1) + String(d2);
  }

  // Aplica a máscara 000.000.000-00 enquanto a pessoa digita.
  function mascararCPF(valor) {
    const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11);
    return digitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  return {
    formatDate,
    formatMonthLabel,
    initials,
    getColaborador,
    escapeHtml,
    computeAduanaStats,
    agruparTreinamentosPorMes,
    agruparTreinamentosPorAplicacao,
    calcularIndicadoresTreinamentoMes,
    calcularSeriesTreinamento12Meses,
    renderGraficoBarras,
    renderSecaoTreinamentosPorMes,
    validarCPF,
    mascararCPF,
  };
})();
