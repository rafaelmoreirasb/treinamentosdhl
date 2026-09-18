/* ==========================================================================
   calculo.js
   Módulo: ANÁLISE DE EFICÁCIA DO TREINAMENTO — cálculo puro.

   Este arquivo não desenha nada na tela. Ele só recebe dados (ocorrências
   de um colaborador + um treinamento de referência + um período) e devolve
   números já calculados. Isso deixa a lógica fácil de testar sozinha, sem
   precisar simular a interface.

   IMPORTANTE (regra do projeto): este módulo NUNCA afirma que o
   treinamento causou redução ou aumento de ocorrências. Ele só compara
   números. A interpretação é sempre do usuário.
   ========================================================================== */

window.Analise = (function () {

  function addDias(dataIso, n) {
    const d = new Date(dataIso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return isoFromDate(d);
  }

  function isoFromDate(d) {
    const ano = d.getUTCFullYear();
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(d.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function isoHoje() {
    return isoFromDate(new Date());
  }

  // Quantidade de dias entre duas datas ISO, incluindo o primeiro e o
  // último dia (um período de 01/09 a 01/09 tem 1 dia; de 01/09 a 02/09
  // tem 2 dias).
  function diasNoPeriodo(inicioIso, fimIso) {
    const a = new Date(inicioIso + 'T00:00:00Z');
    const b = new Date(fimIso + 'T00:00:00Z');
    return Math.round((b - a) / 86400000) + 1;
  }

  // Diferença simples em dias entre duas datas (não inclusiva) — usada
  // para "quantos dias até a primeira ocorrência posterior".
  function diferencaDias(dataIsoA, dataIsoB) {
    const a = new Date(dataIsoA + 'T00:00:00Z');
    const b = new Date(dataIsoB + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  // Sugestão inicial de período: 14 dias antes e 14 dias depois da data
  // do treinamento. O usuário pode ajustar livremente depois.
  function sugerirPeriodo(dataTreinamento) {
    return {
      antesInicio: addDias(dataTreinamento, -14),
      antesFim: addDias(dataTreinamento, -1),
      depoisInicio: addDias(dataTreinamento, 1),
      depoisFim: addDias(dataTreinamento, 14),
    };
  }

  function somarCategorias(registros) {
    return registros.reduce((acc, o) => {
      acc.total += o.aMais + o.faltante;
      acc.aMais += o.aMais;
      acc.faltante += o.faltante;
      return acc;
    }, { total: 0, aMais: 0, faltante: 0 });
  }

  // Variação percentual de Antes para Depois. Retorna null quando Antes
  // é zero (não dá para calcular percentual dividindo por zero).
  function calcularVariacao(totalAntes, totalDepois) {
    if (totalAntes === 0) return null;
    return ((totalDepois - totalAntes) / totalAntes) * 100;
  }

  // Ponto central: recebe as ocorrências de UM colaborador (todo o
  // histórico), um treinamento de referência e um período (ou usa a
  // sugestão automática), e devolve a análise completa.
  function calcular({ ocorrenciasColaborador, treinamento, periodo }) {
    if (!treinamento) {
      return { status: 'sem-treinamento' };
    }
    if (!ocorrenciasColaborador || ocorrenciasColaborador.length === 0) {
      return { status: 'sem-dados', treinamento };
    }

    const dataTreino = treinamento.data;
    const periodoFinal = periodo || sugerirPeriodo(dataTreino);
    const hoje = isoHoje();

    const antes = ocorrenciasColaborador.filter(o => o.data >= periodoFinal.antesInicio && o.data <= periodoFinal.antesFim);
    const noDia = ocorrenciasColaborador.filter(o => o.data === dataTreino);
    const depois = ocorrenciasColaborador.filter(o => o.data >= periodoFinal.depoisInicio && o.data <= periodoFinal.depoisFim);

    const somaAntes = somarCategorias(antes);
    const somaDepois = somarCategorias(depois);
    const somaNoDia = somarCategorias(noDia);

    const diasAntes = diasNoPeriodo(periodoFinal.antesInicio, periodoFinal.antesFim);
    const diasDepois = diasNoPeriodo(periodoFinal.depoisInicio, periodoFinal.depoisFim);

    // Se o período "depois" ainda nem começou (treinamento muito recente),
    // não é zero ocorrências — é ausência de dados mesmo.
    const depoisAindaNaoComecou = periodoFinal.depoisInicio > hoje;

    const variacaoPct = calcularVariacao(somaAntes.total, somaDepois.total);

    // Reincidência: olha para TODO o histórico após a data do treinamento
    // (não limitado pela janela "depois" escolhida), pois a pergunta é
    // simplesmente "quando foi a primeira ocorrência depois deste treinamento".
    const posterioresHistorico = ocorrenciasColaborador
      .filter(o => o.data > dataTreino)
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));
    const primeiraPosterior = posterioresHistorico[0] || null;
    const diasAtePrimeiraPosterior = primeiraPosterior ? diferencaDias(dataTreino, primeiraPosterior.data) : null;

    return {
      status: 'ok',
      treinamento,
      periodo: periodoFinal,
      hoje,
      antes: { registros: antes, ...somaAntes, dias: diasAntes, media: diasAntes > 0 ? somaAntes.total / diasAntes : null },
      noDia: { registros: noDia, ...somaNoDia },
      depois: {
        registros: depois,
        ...somaDepois,
        dias: diasDepois,
        media: diasDepois > 0 ? somaDepois.total / diasDepois : null,
        aindaNaoComecou: depoisAindaNaoComecou,
      },
      variacaoPct,
      ocorrenciasPosterioresTotal: posterioresHistorico.length,
      primeiraOcorrenciaPosterior: primeiraPosterior,
      diasAtePrimeiraPosterior,
    };
  }

  return {
    calcular,
    sugerirPeriodo,
    diasNoPeriodo,
    diferencaDias,
    somarCategorias,
    calcularVariacao,
    isoHoje,
    addDias,
  };
})();
