/* ==========================================================================
   aduana-import.js
   Importação real de arquivos Excel (.xlsx) para o módulo Aduana.

   Fluxo: selecionar arquivo → validar colunas → validar linha por linha →
   pré-visualização → confirmar → gravar no Store → atualizar a tela.

   Usa a biblioteca SheetJS (window.XLSX), carregada em
   js/vendor/xlsx.full.min.js — só ela lê o arquivo .xlsx; todo o resto
   deste arquivo é validação e apresentação, específicas do formato de
   planilha do módulo Aduana (Data, Nome, Aduana a Mais, Aduana Faltante,
   Somatória Geral).
   ========================================================================== */

window.ModuleAduanaImport = (function () {

  const COLUNAS_OBRIGATORIAS = ['Data', 'Nome', 'Aduana a Mais', 'Aduana Faltante', 'Somatória Geral'];

  // Guarda o resultado da última planilha processada, para o botão
  // "Confirmar importação" usar sem precisar ler o arquivo de novo.
  let ultimoResultado = null;

  // -------------------------------------------------------------
  // Abrir o seletor de arquivo
  // -------------------------------------------------------------

  function abrirSeletor() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.style.display = 'none';
    input.addEventListener('change', aoSelecionarArquivo);
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  }

  async function aoSelecionarArquivo(event) {
    const arquivo = event.target.files && event.target.files[0];
    if (!arquivo) return;

    if (!/\.xlsx$/i.test(arquivo.name)) {
      Toast.show('Formato de arquivo não suportado. Selecione um arquivo .xlsx.', 'warning');
      return;
    }

    let arquivoRepetido = false;
    try {
      arquivoRepetido = await window.Store.arquivoJaImportado(arquivo);
    } catch (erro) {
      console.error('Erro ao verificar duplicidade do arquivo:', erro);
      Toast.show('Não foi possível verificar duplicidade (sem conexão com o banco). A importação pode continuar, mas essa checagem ficará indisponível.', 'warning');
    }

    let workbook;
    try {
      const buffer = await lerArquivoComoArrayBuffer(arquivo);
      workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch (erro) {
      console.error('Erro ao ler planilha:', erro);
      Toast.show('Não foi possível ler este arquivo. Verifique se ele não está corrompido.', 'warning');
      return;
    }

    const nomeAba = workbook.SheetNames[0];
    if (!nomeAba) {
      Toast.show('A planilha selecionada está vazia.', 'warning');
      return;
    }
    const planilha = workbook.Sheets[nomeAba];
    const linhas = window.XLSX.utils.sheet_to_json(planilha, { header: 1, defval: '', raw: true });

    if (!linhas || linhas.length === 0) {
      Toast.show('A planilha selecionada está vazia.', 'warning');
      return;
    }

    const { mapa, faltando } = localizarColunas(linhas[0]);
    if (faltando.length > 0) {
      abrirModalColunasFaltando(arquivo.name, faltando);
      return;
    }

    const { validas, erros, avisos } = processarLinhas(linhas, mapa);
    abrirPreVisualizacao({ arquivo, arquivoRepetido, validas, erros, avisos });
  }

  function lerArquivoComoArrayBuffer(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = (evento) => resolve(evento.target.result);
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsArrayBuffer(arquivo);
    });
  }

  // -------------------------------------------------------------
  // Validação das colunas do cabeçalho
  // -------------------------------------------------------------

  function normalizarTexto(valor) {
    return String(valor == null ? '' : valor)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function localizarColunas(linhaCabecalho) {
    const normalizados = (linhaCabecalho || []).map(normalizarTexto);
    const mapa = {};
    const faltando = [];
    COLUNAS_OBRIGATORIAS.forEach(nomeColuna => {
      const idx = normalizados.indexOf(normalizarTexto(nomeColuna));
      if (idx === -1) {
        faltando.push(nomeColuna);
      } else {
        mapa[nomeColuna] = idx;
      }
    });
    return { mapa, faltando };
  }

  // -------------------------------------------------------------
  // Conversão e validação de valores
  // -------------------------------------------------------------

  // Datas: aceita células de data do Excel (já convertidas para objeto
  // Date por causa de cellDates:true), número de série do Excel, ou texto
  // no formato brasileiro DD/MM/AAAA. Sempre devolve uma data no formato
  // interno AAAA-MM-DD (usado em todo o resto do aplicativo), evitando
  // confusão entre DD/MM e MM/DD.
  function parseDataBR(valor) {
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return isoFromDate(valor);
    }
    if (typeof valor === 'number' && isFinite(valor)) {
      const epoca = Date.UTC(1899, 11, 30);
      return isoFromDate(new Date(epoca + valor * 86400000));
    }
    if (typeof valor === 'string') {
      const texto = valor.trim();
      const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (br) {
        const dia = parseInt(br[1], 10);
        const mes = parseInt(br[2], 10);
        const ano = parseInt(br[3], 10);
        if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
          const data = new Date(Date.UTC(ano, mes - 1, dia));
          if (data.getUTCDate() === dia && data.getUTCMonth() === mes - 1) {
            return isoFromDate(data);
          }
        }
        return null;
      }
      const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return texto;
    }
    return null;
  }

  function isoFromDate(data) {
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function parseNumero(valor) {
    if (typeof valor === 'number' && isFinite(valor)) return valor;
    if (typeof valor === 'string') {
      const limpo = valor.trim().replace(',', '.');
      if (limpo === '') return null;
      const numero = Number(limpo);
      if (isFinite(numero)) return numero;
    }
    return null;
  }

  // -------------------------------------------------------------
  // Validação linha a linha
  // -------------------------------------------------------------

  function processarLinhas(linhas, mapa) {
    const validas = [];
    const erros = [];
    const avisos = [];
    const vistosNestaPlanilha = new Set();

    // Só faz sentido comparar com dados já existentes quando eles forem
    // dados reais — comparar com os fictícios não tem utilidade.
    const dadosAtuais = window.Store.usandoDadosFicticiosAduana() ? [] : window.Store.getAduanaOcorrencias();

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const numeroLinha = i + 1; // linha 1 = cabeçalho, como no Excel

      if (!linha || linha.every(celula => celula === '' || celula == null)) {
        continue; // ignora linhas em branco no meio da planilha
      }

      const dataBruta = linha[mapa['Data']];
      const nomeBruto = linha[mapa['Nome']];
      const aMaisBruto = linha[mapa['Aduana a Mais']];
      const faltanteBruto = linha[mapa['Aduana Faltante']];
      const somatoriaBruta = linha[mapa['Somatória Geral']];

      const problemas = [];

      const dataIso = parseDataBR(dataBruta);
      if (!dataIso) problemas.push({ campo: 'Data', problema: 'data ausente ou inválida.' });

      const nome = String(nomeBruto == null ? '' : nomeBruto).trim();
      if (!nome) problemas.push({ campo: 'Nome', problema: 'não pode estar vazio.' });

      const aMais = parseNumero(aMaisBruto);
      if (aMais === null || aMais < 0) problemas.push({ campo: 'Aduana a Mais', problema: 'valor inválido — precisa ser um número maior ou igual a zero.' });

      const faltante = parseNumero(faltanteBruto);
      if (faltante === null || faltante < 0) problemas.push({ campo: 'Aduana Faltante', problema: 'valor inválido — precisa ser um número maior ou igual a zero.' });

      if (problemas.length > 0) {
        problemas.forEach(p => erros.push({ linha: numeroLinha, campo: p.campo, problema: p.problema }));
        continue;
      }

      const somatoriaCalculada = aMais + faltante;
      const somatoriaInformada = parseNumero(somatoriaBruta);
      const inconsistente = somatoriaInformada !== null && somatoriaInformada !== somatoriaCalculada;

      const chave = [dataIso, normalizarTexto(nome), aMais, faltante].join('|');
      const duplicadaNaPlanilha = vistosNestaPlanilha.has(chave);
      vistosNestaPlanilha.add(chave);

      const jaExisteNoSistema = dadosAtuais.some(o => {
        const colaboradorExistente = Utils.getColaborador(o.colaboradorId);
        return o.data === dataIso &&
          colaboradorExistente && normalizarTexto(colaboradorExistente.nome) === normalizarTexto(nome) &&
          Number(o.aMais) === aMais && Number(o.faltante) === faltante;
      });

      const avisosLinha = [];
      if (inconsistente) {
        avisosLinha.push(`Somatória Geral informada (${somatoriaInformada}) é diferente da calculada (${somatoriaCalculada}). Será usado o valor calculado.`);
      }
      if (duplicadaNaPlanilha) {
        avisosLinha.push('Registro repetido dentro da própria planilha.');
      }
      if (jaExisteNoSistema) {
        avisosLinha.push('Um registro igual a este já existe nos dados atuais — será ignorado na importação.');
      }
      avisosLinha.forEach(mensagem => avisos.push({ linha: numeroLinha, mensagem, tipo: inconsistente ? 'inconsistencia' : 'duplicidade' }));

      validas.push({
        linha: numeroLinha,
        data: dataIso,
        dataFormatada: Utils.formatDate(dataIso),
        nome,
        aMais,
        faltante,
        somatoriaCalculada,
        avisos: avisosLinha,
        status: avisosLinha.length > 0 ? 'aviso' : 'ok',
      });
    }

    return { validas, erros, avisos };
  }

  // -------------------------------------------------------------
  // Telas (modais)
  // -------------------------------------------------------------

  function abrirModalColunasFaltando(nomeArquivo, faltando) {
    Modal.open({
      title: 'Não foi possível importar o arquivo',
      bodyHtml: `
        <p class="section__hint" style="margin-bottom:var(--space-3)">Arquivo: ${Utils.escapeHtml(nomeArquivo)}</p>
        <p style="margin-bottom:var(--space-3)">Coluna(s) obrigatória(s) ausente(s):</p>
        <ul style="margin:0 0 var(--space-4) var(--space-4); display:flex; flex-direction:column; gap:6px;">
          ${faltando.map(c => `<li>✕ ${Utils.escapeHtml(c)}</li>`).join('')}
        </ul>
        <p class="section__hint">A primeira linha da planilha precisa conter exatamente estas colunas: ${COLUNAS_OBRIGATORIAS.join(', ')}.</p>
        <div class="form-actions"><button class="btn btn--primary" type="button" onclick="Modal.close()">Entendi</button></div>
      `,
    });
  }

  function abrirPreVisualizacao({ arquivo, arquivoRepetido, validas, erros, avisos }) {
    ultimoResultado = { arquivo, validas };

    const linhasComErro = new Set(erros.map(e => e.linha));
    const bloqueado = linhasComErro.size > 0;
    const inconsistencias = avisos.filter(a => a.tipo === 'inconsistencia').length;
    const registrosEncontrados = validas.length + linhasComErro.size;

    let corpo = `
      <p class="import-passos">1. Selecionar arquivo · 2. Validar arquivo · 3. Visualizar registros · 4. Corrigir possíveis erros · 5. Confirmar importação</p>
      <div class="import-resumo">
        <div><span class="import-resumo__label">Arquivo</span><span class="import-resumo__valor" style="font-size:var(--fs-sm)">${Utils.escapeHtml(arquivo.name)}</span></div>
        <div><span class="import-resumo__label">Registros encontrados</span><span class="import-resumo__valor">${registrosEncontrados}</span></div>
        <div><span class="import-resumo__label">Erros encontrados</span><span class="import-resumo__valor ${erros.length ? 'import-resumo__valor--erro' : ''}">${erros.length}</span></div>
        <div><span class="import-resumo__label">Inconsistências</span><span class="import-resumo__valor ${inconsistencias ? 'import-resumo__valor--aviso' : ''}">${inconsistencias}</span></div>
      </div>
    `;

    if (arquivoRepetido) {
      corpo += `<div class="import-aviso-banner">⚠ Este arquivo já foi importado nesta sessão. Registros repetidos serão ignorados automaticamente.</div>`;
    }

    if (bloqueado) {
      const listaErros = erros.map(e =>
        `<li>✕ Linha ${e.linha}: <strong>${Utils.escapeHtml(e.campo)}</strong> ${Utils.escapeHtml(e.problema)}</li>`
      ).join('');
      corpo += `
        <div class="import-erro-banner">
          <strong>Corrija os erros no arquivo e tente novamente.</strong>
          <ul>${listaErros}</ul>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" onclick="ModuleAduanaImport.cancelarImportacao()">Fechar</button>
        </div>
      `;
    } else if (validas.length === 0) {
      corpo += `
        <div class="empty-state" style="border:none;padding:var(--space-5) 0;">
          <p class="empty-state__text">Nenhum registro válido foi encontrado nesta planilha.</p>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" onclick="ModuleAduanaImport.cancelarImportacao()">Fechar</button>
        </div>
      `;
    } else {
      const linhasTabela = validas.map(v => {
        const icone = v.status === 'aviso' ? '⚠' : '✓';
        const titulo = v.avisos.join(' / ');
        return `
          <tr>
            <td>${v.linha}</td>
            <td>${v.dataFormatada}</td>
            <td>${Utils.escapeHtml(v.nome)}</td>
            <td>${v.aMais}</td>
            <td>${v.faltante}</td>
            <td><strong>${v.somatoriaCalculada}</strong></td>
            <td ${titulo ? `title="${Utils.escapeHtml(titulo)}"` : ''}>${icone}</td>
          </tr>
        `;
      }).join('');

      corpo += `
        <div class="table-scroll import-tabela-preview">
          <table class="data-table">
            <thead>
              <tr><th>Linha</th><th>Data</th><th>Nome</th><th>A mais</th><th>Faltante</th><th>Somatória</th><th title="Passe o mouse sobre ⚠ para ver o motivo">Status</th></tr>
            </thead>
            <tbody>${linhasTabela}</tbody>
          </table>
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" type="button" onclick="ModuleAduanaImport.cancelarImportacao()">Cancelar</button>
          <button class="btn btn--primary" type="button" id="btn-confirmar-importacao" onclick="ModuleAduanaImport.confirmarImportacao()">Confirmar importação</button>
        </div>
      `;
    }

    Modal.open({ title: 'Importar dados de Aduana', bodyHtml: corpo, wide: true });
  }

  // -------------------------------------------------------------
  // Ações finais
  // -------------------------------------------------------------

  function cancelarImportacao() {
    ultimoResultado = null;
    Modal.close();
  }

  async function confirmarImportacao() {
    if (!ultimoResultado) return;
    const { arquivo, validas } = ultimoResultado;

    const botao = document.getElementById('btn-confirmar-importacao');
    if (botao) { botao.disabled = true; botao.textContent = 'Importando...'; }

    try {
      const registros = [];
      for (const v of validas) {
        const colaborador = await window.Store.getOuCriarColaboradorPorNome(v.nome);
        registros.push({ data: v.data, colaboradorId: colaborador.id, aMais: v.aMais, faltante: v.faltante });
      }

      const { adicionados, ignorados } = await window.Store.importarAduanaOcorrencias(registros);
      await window.Store.registrarImportacao({ arquivo, registros: adicionados, ignorados, status: 'Importado' });

      ultimoResultado = null;
      Modal.close();
      Toast.show(
        `${adicionados} registro(s) importado(s)${ignorados ? `, ${ignorados} ignorado(s) por já existirem` : ''}.`,
        'success'
      );

      if (window.App && typeof window.App.refresh === 'function') {
        window.App.refresh();
      }
    } catch (erro) {
      console.error('Erro ao confirmar importação:', erro);
      if (botao) { botao.disabled = false; botao.textContent = 'Confirmar importação'; }
      Toast.show('Não foi possível salvar a importação. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  return { abrirSeletor, cancelarImportacao, confirmarImportacao };
})();
