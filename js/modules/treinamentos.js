/* ==========================================================================
   treinamentos.js
   Módulo: TREINAMENTOS
   Lista todos os treinamentos registrados, com filtros por período,
   colaborador e tipo, e permite cadastrar, editar e excluir registros.

   ALTERAÇÕES 1 e 2: um treinamento agora pode ser aplicado a VÁRIOS
   colaboradores de uma vez (uma "aplicação"), com carga horária. Cada
   linha da tabela do banco continua sendo um colaborador, mas todas as
   linhas da mesma aplicação compartilham "aplicacaoId" — a tela sempre
   trabalha no nível de "aplicação" (um card = um treinamento aplicado,
   para N colaboradores), nunca mostrando o mesmo treinamento como se
   fossem vários diferentes.
   ========================================================================== */

window.ModuleTreinamentos = (function () {

  let filtros = { inicio: '', fim: '', colaboradorId: '' };
  // Guarda o aplicacaoId sendo excluído, enquanto a confirmação está aberta.
  let aplicacaoIdParaExcluir = null;

  function render() {
    const todos = window.Store.getTreinamentos().filter(t => t.tipo === 'Aduana');
    const filtrados = aplicarFiltros(todos).sort((a, b) => b.data.localeCompare(a.data));
    const aplicacoesFiltradas = Utils.agruparTreinamentosPorAplicacao(filtrados).size;
    const aplicacoesTotais = Utils.agruparTreinamentosPorAplicacao(todos).size;

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Treinamentos registrados</h2>
            <p class="section__hint">${aplicacoesFiltradas} de ${aplicacoesTotais} treinamento(s) aplicado(s) · ${filtrados.length} participação(ões)</p>
          </div>
          <button class="btn btn--primary" type="button" onclick="ModuleTreinamentos.abrirModalTreinamento({})">+ Novo treinamento</button>
        </div>

        ${Utils.renderSecaoTreinamentosPorMes()}

        <div class="card" style="margin-bottom:var(--space-4)">
          ${filtrosToolbar()}
        </div>

        <div class="card card--tight" id="treinamentos-tabela">
          ${tabela(filtrados)}
        </div>
      </div>
    `;
  }

  function redraw() {
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = render();
  }

  function aplicarFiltros(lista) {
    return lista.filter(t => {
      if (filtros.inicio && t.data < filtros.inicio) return false;
      if (filtros.fim && t.data > filtros.fim) return false;
      if (filtros.colaboradorId && t.colaboradorId !== filtros.colaboradorId) return false;
      return true;
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

  function filtrosToolbar() {
    const opcoesColaboradores = window.Store.getColaboradores().map(c =>
      `<option value="${c.id}" ${filtros.colaboradorId === c.id ? 'selected' : ''}>${c.nome}</option>`
    ).join('');

    return `
      <div class="toolbar">
        <div class="field field--inline">
          <label for="ft-inicio">Período inicial</label>
          <input class="input" type="date" id="ft-inicio" value="${filtros.inicio}"
                 onchange="ModuleTreinamentos.onFiltroChange('inicio', this.value)">
        </div>
        <div class="field field--inline">
          <label for="ft-fim">Período final</label>
          <input class="input" type="date" id="ft-fim" value="${filtros.fim}"
                 onchange="ModuleTreinamentos.onFiltroChange('fim', this.value)">
        </div>
        <div class="field field--inline">
          <label for="ft-colaborador">Colaborador</label>
          <select class="input" id="ft-colaborador" onchange="ModuleTreinamentos.onFiltroChange('colaboradorId', this.value)">
            <option value="">Todos os colaboradores</option>
            ${opcoesColaboradores}
          </select>
        </div>
        <div class="field field--inline">
          <label for="ft-tipo">Tipo de treinamento</label>
          <select class="input" id="ft-tipo" disabled title="Por enquanto só existe o tipo Aduana">
            <option>Aduana</option>
          </select>
        </div>
        <button class="btn btn--ghost" type="button" onclick="ModuleTreinamentos.limparFiltros()">Limpar filtros</button>
      </div>
    `;
  }

  // Tabela agrupada por APLICAÇÃO — uma linha por treinamento aplicado,
  // nunca uma linha por participante (isso evitaria o mesmo treinamento
  // aparecer "duplicado" visualmente).
  function tabela(registros) {
    if (registros.length === 0) {
      return `<div class="data-table__empty">Nenhum treinamento encontrado para os filtros selecionados.</div>`;
    }

    const porAplicacao = Utils.agruparTreinamentosPorAplicacao(registros);
    const aplicacoes = [...porAplicacao.entries()]
      .map(([aplicacaoId, linhas]) => ({ aplicacaoId, linhas }))
      .sort((a, b) => b.linhas[0].data.localeCompare(a.linhas[0].data));

    const linhasHtml = aplicacoes.map(({ aplicacaoId, linhas }) => {
      const primeira = linhas[0];
      const nomesEls = linhas.map(l => {
        const c = Utils.getColaborador(l.colaboradorId);
        const nome = c ? c.nome : '(colaborador não encontrado)';
        return `<span data-nav="colaboradores/${l.colaboradorId}" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted;" title="Ver perfil">${Utils.escapeHtml(nome)}</span>`;
      });
      const mostrar = nomesEls.slice(0, 3).join(', ');
      const resto = nomesEls.length > 3 ? ` e mais ${nomesEls.length - 3}` : '';

      return `
        <tr>
          <td>
            <div class="data-table__name">
              <span class="avatar" title="${linhas.length} colaborador(es)">${linhas.length}</span>
              <span>${mostrar}${resto}</span>
            </div>
          </td>
          <td><span class="badge badge--info">${primeira.tipo}</span></td>
          <td>${Utils.formatDate(primeira.data)}</td>
          <td>${Utils.escapeHtml(primeira.responsavel)}</td>
          <td>${primeira.cargaHoraria != null ? String(primeira.cargaHoraria).replace('.', ',') + 'h' : '<span class="section__hint">—</span>'}</td>
          <td>${primeira.observacao ? Utils.escapeHtml(primeira.observacao) : '<span class="section__hint">—</span>'}</td>
          <td class="data-table__acoes">
            <button class="link-action" type="button" onclick="ModuleTreinamentos.abrirModalTreinamento({aplicacaoId:'${aplicacaoId}'})">Editar</button>
            <button class="link-action link-action--danger" type="button" onclick="ModuleTreinamentos.confirmarExclusao('${aplicacaoId}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Colaboradores</th>
              <th>Tipo</th>
              <th>Data</th>
              <th>Responsável</th>
              <th>Carga horária</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Formulário (criar / editar) — sempre com seleção múltipla de
  // colaboradores, mesmo ao editar (dá para adicionar/remover
  // participantes de uma aplicação já existente).
  // -------------------------------------------------------------

  // opcoes: { aplicacaoId } para editar uma aplicação existente, ou
  // { colaboradorId } para pré-marcar um colaborador num novo registro
  // (ex.: botão "+ Novo treinamento" no perfil do colaborador).
  function abrirModalTreinamento(opcoes) {
    opcoes = opcoes || {};
    const editando = !!opcoes.aplicacaoId;
    const linhasExistentes = editando ? Store.getTreinamentosPorAplicacao(opcoes.aplicacaoId) : [];
    const primeira = linhasExistentes[0] || null;
    const selecionados = new Set(linhasExistentes.map(t => t.colaboradorId));
    if (!editando && opcoes.colaboradorId) selecionados.add(opcoes.colaboradorId);

    const colaboradores = window.Store.getColaboradores().slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const hoje = new Date().toISOString().slice(0, 10);

    const checklistHtml = colaboradores.map(c => `
      <label class="checklist-item">
        <input type="checkbox" value="${c.id}" ${selecionados.has(c.id) ? 'checked' : ''} onchange="ModuleTreinamentos.atualizarContagemSelecionados()">
        <span>${Utils.escapeHtml(c.nome)}</span>
      </label>
    `).join('');

    Modal.open({
      title: editando ? 'Editar treinamento' : 'Novo treinamento',
      wide: true,
      bodyHtml: `
        <form id="form-treinamento" onsubmit="ModuleTreinamentos.salvarTreinamento(event, ${editando ? `'${opcoes.aplicacaoId}'` : 'null'})">
          <div class="analise-fase__numeros" style="grid-template-columns:1fr 1fr; column-gap:var(--space-4)">
            <div class="field">
              <label for="campo-tipo">Tipo de treinamento</label>
              <select class="input" id="campo-tipo" required>
                <option value="Aduana" selected>Aduana</option>
              </select>
            </div>
            <div class="field">
              <label for="campo-data">Data</label>
              <input class="input" type="date" id="campo-data" value="${primeira ? primeira.data : hoje}" required>
            </div>
            <div class="field">
              <label for="campo-responsavel">Responsável</label>
              <input class="input" type="text" id="campo-responsavel" placeholder="Nome do responsável"
                     value="${primeira ? Utils.escapeHtml(primeira.responsavel) : ''}" required>
            </div>
            <div class="field">
              <label for="campo-carga-horaria">Carga horária (horas)</label>
              <input class="input" type="number" id="campo-carga-horaria" min="0" step="0.5" placeholder="Ex: 2"
                     value="${primeira && primeira.cargaHoraria != null ? primeira.cargaHoraria : ''}">
            </div>
          </div>
          <div class="field">
            <label for="campo-observacao">Observação (opcional)</label>
            <textarea class="input" id="campo-observacao" rows="2" placeholder="Alguma observação sobre este treinamento...">${primeira ? Utils.escapeHtml(primeira.observacao || '') : ''}</textarea>
          </div>
          <div class="field">
            <label>Colaboradores *</label>
            <input class="input" type="text" placeholder="Pesquisar colaborador..." style="margin-bottom:var(--space-2)"
                   oninput="ModuleTreinamentos.filtrarListaColaboradores(this.value)">
            <div class="checklist-colaboradores" id="checklist-colaboradores">
              ${checklistHtml || '<p class="section__hint" style="padding:var(--space-3)">Nenhum colaborador cadastrado ainda.</p>'}
            </div>
            <p class="section__hint" id="contagem-selecionados" style="margin-top:6px">${selecionados.size} selecionado(s)</p>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
            <button type="submit" class="btn btn--primary">${editando ? 'Salvar alterações' : 'Salvar treinamento'}</button>
          </div>
        </form>
      `,
    });
  }

  function filtrarListaColaboradores(termo) {
    const alvo = termo.trim().toLowerCase();
    document.querySelectorAll('#checklist-colaboradores .checklist-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(alvo) ? '' : 'none';
    });
  }

  function atualizarContagemSelecionados() {
    const marcados = document.querySelectorAll('#checklist-colaboradores input[type="checkbox"]:checked').length;
    const el = document.getElementById('contagem-selecionados');
    if (el) el.textContent = `${marcados} selecionado(s)`;
  }

  async function salvarTreinamento(event, aplicacaoIdEditando) {
    event.preventDefault();

    const tipo = document.getElementById('campo-tipo').value;
    const data = document.getElementById('campo-data').value;
    const responsavel = document.getElementById('campo-responsavel').value.trim();
    const cargaHorariaBruta = document.getElementById('campo-carga-horaria').value;
    const cargaHoraria = cargaHorariaBruta === '' ? null : Number(cargaHorariaBruta);
    const observacao = document.getElementById('campo-observacao').value.trim();
    const colaboradorIds = [...document.querySelectorAll('#checklist-colaboradores input[type="checkbox"]:checked')].map(el => el.value);

    if (!tipo) { Toast.show('Informe o tipo de treinamento.', 'warning'); return; }
    if (!data) { Toast.show('Informe a data.', 'warning'); return; }
    if (!responsavel) { Toast.show('Informe o responsável.', 'warning'); return; }
    if (cargaHorariaBruta !== '' && (isNaN(cargaHoraria) || cargaHoraria < 0)) { Toast.show('Informe uma carga horária válida.', 'warning'); return; }
    if (colaboradorIds.length === 0) { Toast.show('Selecione pelo menos um colaborador.', 'warning'); return; }

    const dadosComuns = { tipo, data, responsavel, cargaHoraria, observacao, colaboradorIds };
    const botao = document.querySelector('#form-treinamento button[type="submit"]');
    if (botao) { botao.disabled = true; botao.textContent = 'Salvando...'; }

    try {
      if (aplicacaoIdEditando) {
        await Store.atualizarAplicacaoTreinamento(aplicacaoIdEditando, dadosComuns);
        Toast.show('Treinamento atualizado com sucesso.', 'success');
      } else {
        await Store.addAplicacaoTreinamento(dadosComuns);
        Toast.show(`Treinamento registrado para ${colaboradorIds.length} colaborador(es).`, 'success');
      }

      Modal.close();
      if (window.App && typeof window.App.refresh === 'function') {
        window.App.refresh();
      }
    } catch (erro) {
      console.error('Erro ao salvar treinamento:', erro);
      if (botao) { botao.disabled = false; botao.textContent = aplicacaoIdEditando ? 'Salvar alterações' : 'Salvar treinamento'; }
      Toast.show('Não foi possível salvar. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  // -------------------------------------------------------------
  // Exclusão (com confirmação) — exclui a aplicação inteira, para todos
  // os colaboradores que participaram dela.
  // -------------------------------------------------------------

  function confirmarExclusao(aplicacaoId) {
    const linhas = Store.getTreinamentosPorAplicacao(aplicacaoId);
    if (linhas.length === 0) return;
    aplicacaoIdParaExcluir = aplicacaoId;

    const nomes = linhas.map(t => {
      const c = Utils.getColaborador(t.colaboradorId);
      return c ? c.nome : '(colaborador não encontrado)';
    });

    Modal.open({
      title: 'Excluir treinamento',
      bodyHtml: `
        <p style="margin-bottom:var(--space-4)">
          Tem certeza que deseja excluir o treinamento de <strong>${Utils.formatDate(linhas[0].data)}</strong>?
          Isso remove o registro para ${linhas.length === 1 ? 'este colaborador' : `estes ${linhas.length} colaboradores`}:
          <strong>${nomes.map(n => Utils.escapeHtml(n)).join(', ')}</strong>. Esta ação não pode ser desfeita.
        </p>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-confirmar-exclusao" style="background:var(--color-danger)" onclick="ModuleTreinamentos.excluirConfirmado()">Excluir</button>
        </div>
      `,
    });
  }

  async function excluirConfirmado() {
    if (!aplicacaoIdParaExcluir) return;
    const botao = document.getElementById('btn-confirmar-exclusao');
    if (botao) { botao.disabled = true; botao.textContent = 'Excluindo...'; }

    try {
      await Store.excluirAplicacaoTreinamento(aplicacaoIdParaExcluir);
      aplicacaoIdParaExcluir = null;
      Modal.close();
      Toast.show('Treinamento excluído.', 'success');
      if (window.App && typeof window.App.refresh === 'function') {
        window.App.refresh();
      }
    } catch (erro) {
      console.error('Erro ao excluir treinamento:', erro);
      if (botao) { botao.disabled = false; botao.textContent = 'Excluir'; }
      Toast.show('Não foi possível excluir. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  return {
    render,
    renderList: render,
    onFiltroChange,
    limparFiltros,
    abrirModalTreinamento,
    filtrarListaColaboradores,
    atualizarContagemSelecionados,
    salvarTreinamento,
    confirmarExclusao,
    excluirConfirmado,
  };
})();
