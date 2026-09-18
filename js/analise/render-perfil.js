/* ==========================================================================
   render-perfil.js
   Módulo: ANÁLISE DE EFICÁCIA DO TREINAMENTO — seção do perfil do colaborador.

   Cuida da parte visual e do estado (qual treinamento está selecionado,
   se o período foi ajustado manualmente) para UM colaborador de cada vez.
   Os números em si vêm sempre de window.Analise (js/analise/calculo.js).
   ========================================================================== */

window.AnaliseTreinamento = (function () {

  // Estado por colaborador: { treinamentoId, periodo (null = sugestão automática) }
  const estados = {};

  function treinamentosDoColaborador(colaboradorId) {
    return Store.getTreinamentosPorColaborador(colaboradorId)
      .filter(t => t.tipo === 'Aduana')
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  function getEstado(colaboradorId) {
    if (!estados[colaboradorId]) {
      const treinos = treinamentosDoColaborador(colaboradorId);
      estados[colaboradorId] = {
        treinamentoId: treinos[0] ? treinos[0].id : null,
        periodo: null,
      };
    }
    return estados[colaboradorId];
  }

  function redraw(colaboradorId) {
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = ModuleColaboradores.renderDetail(colaboradorId);
  }

  function selecionarTreinamento(colaboradorId, treinamentoId) {
    const estado = getEstado(colaboradorId);
    estado.treinamentoId = treinamentoId;
    estado.periodo = null; // volta para a sugestão automática ao trocar de treinamento
    redraw(colaboradorId);
  }

  function alterarPeriodo(colaboradorId, campo, valor) {
    const estado = getEstado(colaboradorId);
    if (!estado.periodo) {
      const treinamento = Store.getTreinamentoPorId(estado.treinamentoId);
      estado.periodo = Analise.sugerirPeriodo(treinamento.data);
    }
    estado.periodo[campo] = valor;
    redraw(colaboradorId);
  }

  function redefinirPeriodo(colaboradorId) {
    getEstado(colaboradorId).periodo = null;
    redraw(colaboradorId);
  }

  function imprimir() {
    window.print();
  }

  // -------------------------------------------------------------
  // Renderização
  // -------------------------------------------------------------

  function renderSecaoPerfil(colaboradorId) {
    const treinos = treinamentosDoColaborador(colaboradorId);

    if (treinos.length === 0) {
      return `
        <div class="section">
          <div class="section__header">
            <h2 class="section__title">Análise de treinamento</h2>
          </div>
          <div class="empty-state">
            <p class="empty-state__text">Este colaborador ainda não recebeu nenhum treinamento de Aduana. A análise fica disponível assim que houver pelo menos um treinamento registrado.</p>
          </div>
        </div>
      `;
    }

    const estado = getEstado(colaboradorId);
    const treinamento = Store.getTreinamentoPorId(estado.treinamentoId) || treinos[0];
    const ultimoId = treinos[0].id;

    const ocorrenciasColaborador = window.Store.getAduanaOcorrencias().filter(o => o.colaboradorId === colaboradorId);
    const resultado = Analise.calcular({ ocorrenciasColaborador, treinamento, periodo: estado.periodo });

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Análise de treinamento</h2>
            <p class="section__hint">Comparação objetiva das ocorrências antes e depois do treinamento — sem afirmar causa e efeito</p>
          </div>
          <button class="btn btn--secondary no-print" type="button" onclick="AnaliseTreinamento.imprimir()">Imprimir análise</button>
        </div>
        <div class="card">
          ${seletorTreinamento(colaboradorId, treinos, estado.treinamentoId, ultimoId)}
          ${resultado.status === 'sem-dados'
            ? `<div class="empty-state" style="border:none;padding:var(--space-5) 0;"><p class="empty-state__text">Não existem dados suficientes para realizar esta análise — este colaborador não possui ocorrências de Aduana registradas.</p></div>`
            : corpoAnalise(colaboradorId, resultado)}
        </div>
      </div>
    `;
  }

  function seletorTreinamento(colaboradorId, treinos, selecionadoId, ultimoId) {
    const opcoes = treinos.map(t => `
      <option value="${t.id}" ${t.id === selecionadoId ? 'selected' : ''}>
        ${t.tipo} — ${Utils.formatDate(t.data)}${t.id === ultimoId ? ' (mais recente)' : ''}
      </option>
    `).join('');

    return `
      <div class="toolbar no-print" style="margin-bottom:var(--space-5)">
        <div class="field field--inline">
          <label for="analise-select-treino">Selecionar treinamento para análise</label>
          <select class="input" id="analise-select-treino" style="min-width:260px"
                  onchange="AnaliseTreinamento.selecionarTreinamento('${colaboradorId}', this.value)">
            ${opcoes}
          </select>
        </div>
      </div>
    `;
  }

  function corpoAnalise(colaboradorId, r) {
    const p = r.periodo;
    const personalizado = !!getEstado(colaboradorId).periodo;

    return `
      <div class="analise-periodo-toolbar no-print">
        <div class="field field--inline">
          <label for="ap-antes-inicio">Período antes — de</label>
          <input class="input" type="date" id="ap-antes-inicio" value="${p.antesInicio}"
                 onchange="AnaliseTreinamento.alterarPeriodo('${colaboradorId}', 'antesInicio', this.value)">
        </div>
        <div class="field field--inline">
          <label for="ap-antes-fim">até</label>
          <input class="input" type="date" id="ap-antes-fim" value="${p.antesFim}"
                 onchange="AnaliseTreinamento.alterarPeriodo('${colaboradorId}', 'antesFim', this.value)">
        </div>
        <div class="field field--inline">
          <label for="ap-depois-inicio">Período depois — de</label>
          <input class="input" type="date" id="ap-depois-inicio" value="${p.depoisInicio}"
                 onchange="AnaliseTreinamento.alterarPeriodo('${colaboradorId}', 'depoisInicio', this.value)">
        </div>
        <div class="field field--inline">
          <label for="ap-depois-fim">até</label>
          <input class="input" type="date" id="ap-depois-fim" value="${p.depoisFim}"
                 onchange="AnaliseTreinamento.alterarPeriodo('${colaboradorId}', 'depoisFim', this.value)">
        </div>
        ${personalizado ? `<button class="btn btn--ghost" type="button" onclick="AnaliseTreinamento.redefinirPeriodo('${colaboradorId}')">Usar sugestão automática</button>` : `<span class="section__hint">Período sugerido automaticamente (14 dias antes/depois) — ajuste as datas se quiser</span>`}
      </div>

      <div class="analise-fases">
        ${faseCard('Período antes', `${Utils.formatDate(p.antesInicio)} → ${Utils.formatDate(p.antesFim)}`, `${r.antes.dias} dia(s)`, r.antes)}
        ${faseDia(r.treinamento, r.noDia)}
        ${faseCard('Período depois', `${Utils.formatDate(p.depoisInicio)} → ${Utils.formatDate(p.depoisFim)}`, r.depois.aindaNaoComecou ? null : `${r.depois.dias} dia(s)`, r.depois, r.depois.aindaNaoComecou)}
      </div>

      ${comparacaoResumo(r)}

      ${graficoAntesDepois(r)}

      ${graficoEvolucao(r)}

      ${reincidencia(r)}

      ${resumoDescritivo(r)}
    `;
  }

  function faseCard(titulo, periodoTexto, diasTexto, dados, semDados) {
    if (semDados) {
      return `
        <div class="analise-fase">
          <h4 class="analise-fase__titulo">${titulo}</h4>
          <p class="analise-fase__periodo">${periodoTexto}</p>
          <p class="empty-state__text" style="margin-top:var(--space-3)">Não há dados posteriores suficientes para comparação — o período ainda não terminou.</p>
        </div>
      `;
    }
    return `
      <div class="analise-fase">
        <h4 class="analise-fase__titulo">${titulo}</h4>
        <p class="analise-fase__periodo">${periodoTexto} · ${diasTexto}</p>
        <div class="analise-fase__numeros">
          <div><span>Ocorrências</span><strong>${dados.total}</strong></div>
          <div><span>A mais</span><strong>${dados.aMais}</strong></div>
          <div><span>Faltante</span><strong>${dados.faltante}</strong></div>
          <div><span>Média diária</span><strong>${dados.media != null ? dados.media.toFixed(2).replace('.', ',') : '—'}</strong></div>
        </div>
      </div>
    `;
  }

  function faseDia(treinamento, noDia) {
    return `
      <div class="analise-fase analise-fase--dia">
        <h4 class="analise-fase__titulo">Dia do treinamento</h4>
        <p class="analise-fase__periodo">${Utils.formatDate(treinamento.data)}</p>
        <div class="analise-fase__numeros">
          <div><span>Ocorrências</span><strong>${noDia.total}</strong></div>
          <div><span>A mais</span><strong>${noDia.aMais}</strong></div>
          <div><span>Faltante</span><strong>${noDia.faltante}</strong></div>
        </div>
        <p class="section__hint" style="margin-top:var(--space-2)">Não entra na comparação antes/depois</p>
      </div>
    `;
  }

  function comparacaoResumo(r) {
    let variacaoHtml;
    if (r.depois.aindaNaoComecou) {
      variacaoHtml = `<p class="empty-state__text">Não há dados posteriores suficientes para comparação.</p>`;
    } else if (r.variacaoPct === null) {
      variacaoHtml = `<p class="empty-state__text">Não é possível calcular a variação percentual porque não houve ocorrências no período anterior.</p>`;
    } else {
      const sinal = r.variacaoPct > 0 ? '+' : '';
      const classe = r.variacaoPct < 0 ? 'kpi-card__delta--down' : (r.variacaoPct > 0 ? 'kpi-card__delta--up' : 'kpi-card__delta--neutral');
      variacaoHtml = `<span class="badge ${classe === 'kpi-card__delta--down' ? 'badge--success' : (classe === 'kpi-card__delta--up' ? 'badge--danger' : 'badge--neutral')}">${sinal}${r.variacaoPct.toFixed(1).replace('.', ',')}%</span>`;
    }

    return `
      <div class="section" style="margin-top:var(--space-5)">
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-card__label">Ocorrências antes</span>
            <span class="kpi-card__value">${r.antes.total}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card__label">Ocorrências depois</span>
            <span class="kpi-card__value">${r.depois.aindaNaoComecou ? '—' : r.depois.total}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card__label">Variação</span>
            <div style="margin-top:4px">${variacaoHtml}</div>
          </div>
        </div>
      </div>
    `;
  }

  function graficoAntesDepois(r) {
    const valores = [
      { label: 'Antes', valor: r.antes.total },
      { label: 'No dia', valor: r.noDia.total },
      { label: 'Depois', valor: r.depois.aindaNaoComecou ? 0 : r.depois.total },
    ];
    const max = Math.max(...valores.map(v => v.valor), 1);
    const cols = valores.map(v => `
      <div class="trend-chart__col">
        <span class="trend-chart__value">${v.valor}</span>
        <div class="trend-chart__bar-wrap">
          <div class="trend-chart__bar ${v.label === 'No dia' ? 'trend-chart__bar--peak' : ''}" style="height:${Math.max((v.valor / max) * 100, 4)}%"></div>
        </div>
        <span class="trend-chart__label">${v.label}</span>
      </div>
    `).join('');

    return `
      <div class="card" style="margin-top:var(--space-5)">
        <div class="section__header">
          <h3 class="section__title" style="font-size:var(--fs-base)">Total de ocorrências — antes × depois</h3>
        </div>
        <div class="trend-chart">${cols}</div>
      </div>
    `;
  }

  // Evolução dia a dia dentro da janela analisada, com o dia do
  // treinamento destacado. Se a janela for muito longa, mostra um aviso
  // em vez de um gráfico ilegível.
  function graficoEvolucao(r) {
    const p = r.periodo;
    const totalDias = Analise.diasNoPeriodo(p.antesInicio, r.depois.aindaNaoComecou ? r.treinamento.data : p.depoisFim);

    if (totalDias > 62) {
      return `
        <div class="card" style="margin-top:var(--space-5)">
          <div class="section__header">
            <h3 class="section__title" style="font-size:var(--fs-base)">Evolução ao longo do tempo</h3>
          </div>
          <p class="section__hint">O período selecionado é muito longo para exibir dia a dia (${totalDias} dias). Ajuste o período acima para uma janela menor, ou use os totais mostrados nos cartões.</p>
        </div>
      `;
    }

    const porDia = new Map();
    r.antes.registros.forEach(o => porDia.set(o.data, (porDia.get(o.data) || 0) + o.aMais + o.faltante));
    r.noDia.registros.forEach(o => porDia.set(o.data, (porDia.get(o.data) || 0) + o.aMais + o.faltante));
    if (!r.depois.aindaNaoComecou) {
      r.depois.registros.forEach(o => porDia.set(o.data, (porDia.get(o.data) || 0) + o.aMais + o.faltante));
    }

    const fimJanela = r.depois.aindaNaoComecou ? r.treinamento.data : p.depoisFim;
    const dias = [];
    let cursor = p.antesInicio;
    while (cursor <= fimJanela) {
      dias.push(cursor);
      cursor = Analise.addDias(cursor, 1);
    }

    const max = Math.max(...dias.map(d => porDia.get(d) || 0), 1);
    const cols = dias.map(d => {
      const valor = porDia.get(d) || 0;
      const isTreino = d === r.treinamento.data;
      return `
        <div class="trend-chart__col" title="${Utils.formatDate(d)}: ${valor} ocorrência(s)${isTreino ? ' · dia do treinamento' : ''}">
          <div class="trend-chart__bar-wrap">
            <div class="trend-chart__bar ${isTreino ? 'trend-chart__bar--peak' : ''}" style="height:${Math.max((valor / max) * 100, valor > 0 ? 8 : 2)}%"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="margin-top:var(--space-5)">
        <div class="section__header">
          <h3 class="section__title" style="font-size:var(--fs-base)">Evolução ao longo do tempo</h3>
          <span class="section__hint">A barra em destaque é o dia do treinamento (${Utils.formatDate(r.treinamento.data)}) · passe o mouse para ver cada dia</span>
        </div>
        <div class="trend-chart trend-chart--dense">${cols}</div>
      </div>
    `;
  }

  function reincidencia(r) {
    let corpo;
    if (!r.primeiraOcorrenciaPosterior) {
      corpo = `<p class="empty-state__text">Não foram encontradas ocorrências posteriores ao treinamento no período analisado.</p>`;
    } else {
      corpo = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-card__label">Ocorrências após o treinamento</span>
            <span class="kpi-card__value">${r.ocorrenciasPosterioresTotal}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card__label">Primeira ocorrência após o treinamento</span>
            <span class="kpi-card__value" style="font-size:var(--fs-md)">${Utils.formatDate(r.primeiraOcorrenciaPosterior.data)}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-card__label">Tempo até a primeira ocorrência</span>
            <span class="kpi-card__value">${r.diasAtePrimeiraPosterior} dia(s)</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="card" style="margin-top:var(--space-5)">
        <div class="section__header">
          <h3 class="section__title" style="font-size:var(--fs-base)">Ocorrências após o treinamento (todo o histórico)</h3>
        </div>
        ${corpo}
      </div>
    `;
  }

  // Texto puramente descritivo — só relata os números, nunca conclui
  // se o treinamento "funcionou" ou não.
  function resumoDescritivo(r) {
    const frases = [];

    if (r.depois.aindaNaoComecou) {
      frases.push('O período posterior definido para esta análise ainda não terminou.');
    } else {
      frases.push(`As ocorrências passaram de ${r.antes.total} no período anterior para ${r.depois.total} no período posterior.`);
      if (r.antes.media != null && r.depois.media != null) {
        frases.push(`A média diária passou de ${r.antes.media.toFixed(2).replace('.', ',')} para ${r.depois.media.toFixed(2).replace('.', ',')} ocorrência(s)/dia.`);
      }
    }

    if (!r.primeiraOcorrenciaPosterior) {
      frases.push('Não foram registradas ocorrências após o treinamento durante o período analisado.');
    } else {
      frases.push(`A primeira ocorrência após o treinamento foi em ${Utils.formatDate(r.primeiraOcorrenciaPosterior.data)}, ${r.diasAtePrimeiraPosterior} dia(s) depois.`);
    }

    return `
      <div class="card" style="margin-top:var(--space-5); background:var(--gray-050)">
        <div class="section__header">
          <h3 class="section__title" style="font-size:var(--fs-base)">Resumo dos dados</h3>
        </div>
        <ul style="margin:0; padding-left:var(--space-4); display:flex; flex-direction:column; gap:6px; font-size:var(--fs-sm)">
          ${frases.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return {
    renderSecaoPerfil,
    selecionarTreinamento,
    alterarPeriodo,
    redefinirPeriodo,
    imprimir,
  };
})();
