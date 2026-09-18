/* ==========================================================================
   treinamentos.js
   Módulo: TREINAMENTOS
   Lista todos os treinamentos registrados, com filtros por período,
   colaborador e tipo, e permite cadastrar, editar e excluir registros.

   ETAPA 4: filtros funcionais, edição e exclusão (com confirmação), e o
   campo "Colaborador" do formulário agora é uma lista pesquisável (o
   navegador filtra as opções enquanto a pessoa digita).
   ========================================================================== */

window.ModuleTreinamentos = (function () {

  let filtros = { inicio: '', fim: '', colaboradorId: '' };
  // Guarda o id do treinamento sendo excluído, enquanto a confirmação
  // está aberta (evita excluir o item errado por engano).
  let idParaExcluir = null;

  function render() {
    const todos = window.Store.getTreinamentos().filter(t => t.tipo === 'Aduana');
    const filtrados = aplicarFiltros(todos).sort((a, b) => b.data.localeCompare(a.data));

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Treinamentos registrados</h2>
            <p class="section__hint">${filtrados.length} de ${todos.length} registro(s)</p>
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

  function tabela(registros) {
    if (registros.length === 0) {
      return `<div class="data-table__empty">Nenhum treinamento encontrado para os filtros selecionados.</div>`;
    }

    const linhas = registros.map(t => {
      const colaborador = Utils.getColaborador(t.colaboradorId);
      const nome = colaborador ? colaborador.nome : '(colaborador não encontrado)';
      return `
        <tr>
          <td data-nav="colaboradores/${t.colaboradorId}" style="cursor:pointer">
            <div class="data-table__name">
              <span class="avatar">${colaborador ? Utils.initials(colaborador.nome) : '?'}</span>
              <span>${nome}</span>
            </div>
          </td>
          <td><span class="badge badge--info">${t.tipo}</span></td>
          <td>${Utils.formatDate(t.data)}</td>
          <td>${Utils.escapeHtml(t.responsavel)}</td>
          <td>${t.observacao ? Utils.escapeHtml(t.observacao) : '<span class="section__hint">—</span>'}</td>
          <td class="data-table__acoes">
            <button class="link-action" type="button" onclick="ModuleTreinamentos.abrirModalTreinamento({id:'${t.id}'})">Editar</button>
            <button class="link-action link-action--danger" type="button" onclick="ModuleTreinamentos.confirmarExclusao('${t.id}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Tipo</th>
              <th>Data</th>
              <th>Responsável</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Formulário (criar / editar) — em modal
  // -------------------------------------------------------------

  // opcoes: { id } para editar um treinamento existente, ou
  // { colaboradorId } para pré-selecionar o colaborador num novo registro.
  function abrirModalTreinamento(opcoes) {
    opcoes = opcoes || {};
    const editando = opcoes.id ? Store.getTreinamentoPorId(opcoes.id) : null;
    const colaboradorAtual = editando
      ? Utils.getColaborador(editando.colaboradorId)
      : (opcoes.colaboradorId ? Utils.getColaborador(opcoes.colaboradorId) : null);

    const datalist = window.Store.getColaboradores().map(c =>
      `<option value="${Utils.escapeHtml(c.nome)}">`
    ).join('');

    const hoje = new Date().toISOString().slice(0, 10);

    Modal.open({
      title: editando ? 'Editar treinamento' : 'Novo treinamento',
      bodyHtml: `
        <form id="form-treinamento" onsubmit="ModuleTreinamentos.salvarTreinamento(event, ${editando ? `'${editando.id}'` : 'null'})">
          <div class="field">
            <label for="campo-colaborador-nome">Colaborador</label>
            <input class="input" type="text" id="campo-colaborador-nome" list="lista-colaboradores"
                   placeholder="Digite para pesquisar..." autocomplete="off"
                   value="${colaboradorAtual ? Utils.escapeHtml(colaboradorAtual.nome) : ''}" required>
            <datalist id="lista-colaboradores">${datalist}</datalist>
          </div>
          <div class="field">
            <label for="campo-tipo">Tipo de treinamento</label>
            <select class="input" id="campo-tipo" required>
              <option value="Aduana" selected>Aduana</option>
            </select>
          </div>
          <div class="field">
            <label for="campo-data">Data</label>
            <input class="input" type="date" id="campo-data" value="${editando ? editando.data : hoje}" required>
          </div>
          <div class="field">
            <label for="campo-responsavel">Responsável</label>
            <input class="input" type="text" id="campo-responsavel" placeholder="Nome do responsável"
                   value="${editando ? Utils.escapeHtml(editando.responsavel) : ''}" required>
          </div>
          <div class="field">
            <label for="campo-observacao">Observação (opcional)</label>
            <textarea class="input" id="campo-observacao" rows="3" placeholder="Alguma observação sobre este treinamento...">${editando ? Utils.escapeHtml(editando.observacao || '') : ''}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
            <button type="submit" class="btn btn--primary">${editando ? 'Salvar alterações' : 'Salvar treinamento'}</button>
          </div>
        </form>
      `,
    });
  }

  async function salvarTreinamento(event, idEditando) {
    event.preventDefault();

    const nomeColaborador = document.getElementById('campo-colaborador-nome').value.trim();
    const tipo = document.getElementById('campo-tipo').value;
    const data = document.getElementById('campo-data').value;
    const responsavel = document.getElementById('campo-responsavel').value.trim();
    const observacao = document.getElementById('campo-observacao').value.trim();

    if (!nomeColaborador) { Toast.show('Informe o colaborador.', 'warning'); return; }
    if (!tipo) { Toast.show('Informe o tipo de treinamento.', 'warning'); return; }
    if (!data) { Toast.show('Informe a data.', 'warning'); return; }
    if (!responsavel) { Toast.show('Informe o responsável.', 'warning'); return; }

    const colaborador = window.Store.getColaboradorPorNome(nomeColaborador);
    if (!colaborador) {
      Toast.show('Colaborador não encontrado. Selecione um nome da lista.', 'warning');
      return;
    }

    const dados = { colaboradorId: colaborador.id, tipo, data, responsavel, observacao };
    const botao = document.querySelector('#form-treinamento button[type="submit"]');
    if (botao) { botao.disabled = true; botao.textContent = 'Salvando...'; }

    try {
      if (idEditando) {
        await Store.updateTreinamento(idEditando, dados);
        Toast.show('Treinamento atualizado com sucesso.', 'success');
      } else {
        await Store.addTreinamento(dados);
        Toast.show('Treinamento registrado com sucesso.', 'success');
      }

      Modal.close();
      if (window.App && typeof window.App.refresh === 'function') {
        window.App.refresh();
      }
    } catch (erro) {
      console.error('Erro ao salvar treinamento:', erro);
      if (botao) { botao.disabled = false; botao.textContent = idEditando ? 'Salvar alterações' : 'Salvar treinamento'; }
      Toast.show('Não foi possível salvar. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  // -------------------------------------------------------------
  // Exclusão (com confirmação)
  // -------------------------------------------------------------

  function confirmarExclusao(id) {
    const registro = Store.getTreinamentoPorId(id);
    if (!registro) return;
    idParaExcluir = id;
    const colaborador = Utils.getColaborador(registro.colaboradorId);

    Modal.open({
      title: 'Excluir treinamento',
      bodyHtml: `
        <p style="margin-bottom:var(--space-4)">
          Tem certeza que deseja excluir o treinamento de <strong>${colaborador ? Utils.escapeHtml(colaborador.nome) : 'colaborador'}</strong>
          em <strong>${Utils.formatDate(registro.data)}</strong>? Esta ação não pode ser desfeita, e não afeta os
          outros treinamentos deste colaborador.
        </p>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-confirmar-exclusao" style="background:var(--color-danger)" onclick="ModuleTreinamentos.excluirConfirmado()">Excluir</button>
        </div>
      `,
    });
  }

  async function excluirConfirmado() {
    if (!idParaExcluir) return;
    const botao = document.getElementById('btn-confirmar-exclusao');
    if (botao) { botao.disabled = true; botao.textContent = 'Excluindo...'; }

    try {
      await Store.deleteTreinamento(idParaExcluir);
      idParaExcluir = null;
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
    salvarTreinamento,
    confirmarExclusao,
    excluirConfirmado,
  };
})();
