/* ==========================================================================
   integracao.js
   Módulo: INTEGRAÇÃO
   Cadastro e acompanhamento de colaboradores em processo de integração.
   Independente do módulo Aduana e do histórico de treinamentos — "Integração
   QA" e "Oi Cheguei!" são controles próprios deste módulo, não entram na
   aba Treinamentos.
   ========================================================================== */

window.ModuleIntegracao = (function () {

  let filtros = { busca: '', qa: '', oiCheguei: '', cidade: '' };
  let idParaExcluir = null;

  function redraw() {
    const root = document.getElementById('view-root');
    if (root) root.innerHTML = render();
  }

  function render() {
    const todos = window.Store.getIntegracoes();
    const filtrados = aplicarFiltros(todos);

    return `
      <div class="section">
        <div class="section__header">
          <div>
            <h2 class="section__title">Integração</h2>
            <p class="section__hint">Cadastro e acompanhamento da integração de novos colaboradores</p>
          </div>
          <button class="btn btn--primary" type="button" onclick="ModuleIntegracao.abrirModalIntegracao({})">+ Novo colaborador</button>
        </div>
        <div class="kpi-grid">
          ${kpi('Total de colaboradores', todos.length)}
          ${kpi('Integração QA — Realizado', todos.filter(i => i.integracaoQa === 'Realizado').length)}
          ${kpi('Integração QA — Pendente', todos.filter(i => i.integracaoQa === 'Pendente').length)}
          ${kpi('Oi Cheguei! — Realizado', todos.filter(i => i.oiCheguei === 'Realizado').length)}
          ${kpi('Oi Cheguei! — Pendente', todos.filter(i => i.oiCheguei === 'Pendente').length)}
        </div>
      </div>

      <div class="section">
        <div class="card" style="margin-bottom:var(--space-4)">
          ${filtrosToolbar()}
        </div>
        <div class="card card--tight">
          <p class="section__hint" style="padding:var(--space-4) var(--space-4) 0">${filtrados.length} de ${todos.length} colaborador(es)</p>
          ${tabela(filtrados)}
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

  function aplicarFiltros(lista) {
    const termo = filtros.busca.trim().toLowerCase();
    const cidadeTermo = filtros.cidade.trim().toLowerCase();
    return lista.filter(i => {
      if (filtros.qa && i.integracaoQa !== filtros.qa) return false;
      if (filtros.oiCheguei && i.oiCheguei !== filtros.oiCheguei) return false;
      if (cidadeTermo && !i.cidade.toLowerCase().includes(cidadeTermo)) return false;
      if (termo) {
        const alvo = `${i.nome} ${i.matricula} ${i.cidade} ${i.telefone}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }

  function onFiltroChange(campo, valor) {
    filtros[campo] = valor;
    redraw();
    // Mantém o foco no campo de texto que a pessoa estava usando.
    if (campo === 'busca' || campo === 'cidade') {
      const id = campo === 'busca' ? 'integracao-busca' : 'integracao-filtro-cidade';
      const el = document.getElementById(id);
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    }
  }

  function limparFiltros() {
    filtros = { busca: '', qa: '', oiCheguei: '', cidade: '' };
    redraw();
  }

  function filtrosToolbar() {
    return `
      <div class="toolbar">
        <input class="input" type="text" id="integracao-busca" placeholder="Pesquisar por nome, matrícula, cidade ou telefone..."
               style="min-width:260px" value="${Utils.escapeHtml(filtros.busca)}"
               oninput="ModuleIntegracao.onFiltroChange('busca', this.value)">
        <div class="field field--inline">
          <label for="integracao-filtro-qa">Integração QA</label>
          <select class="input" id="integracao-filtro-qa" onchange="ModuleIntegracao.onFiltroChange('qa', this.value)">
            <option value="" ${filtros.qa === '' ? 'selected' : ''}>Todos</option>
            <option value="Realizado" ${filtros.qa === 'Realizado' ? 'selected' : ''}>Realizado</option>
            <option value="Pendente" ${filtros.qa === 'Pendente' ? 'selected' : ''}>Pendente</option>
          </select>
        </div>
        <div class="field field--inline">
          <label for="integracao-filtro-oi">Oi Cheguei!</label>
          <select class="input" id="integracao-filtro-oi" onchange="ModuleIntegracao.onFiltroChange('oiCheguei', this.value)">
            <option value="" ${filtros.oiCheguei === '' ? 'selected' : ''}>Todos</option>
            <option value="Realizado" ${filtros.oiCheguei === 'Realizado' ? 'selected' : ''}>Realizado</option>
            <option value="Pendente" ${filtros.oiCheguei === 'Pendente' ? 'selected' : ''}>Pendente</option>
          </select>
        </div>
        <div class="field field--inline">
          <label for="integracao-filtro-cidade">Cidade</label>
          <input class="input" type="text" id="integracao-filtro-cidade" placeholder="Todas" style="min-width:140px"
                 value="${Utils.escapeHtml(filtros.cidade)}" oninput="ModuleIntegracao.onFiltroChange('cidade', this.value)">
        </div>
        <button class="btn btn--ghost" type="button" onclick="ModuleIntegracao.limparFiltros()">Limpar filtros</button>
      </div>
    `;
  }

  function selo(valor) {
    return valor === 'Realizado'
      ? `<span class="badge badge--success">Realizado</span>`
      : `<span class="badge badge--warning">Pendente</span>`;
  }

  function tabela(lista) {
    if (lista.length === 0) {
      return `<div class="data-table__empty">Nenhum colaborador encontrado para os filtros selecionados.</div>`;
    }

    const linhas = lista.map(i => `
      <tr>
        <td>
          <div class="data-table__name">
            <span class="avatar">${Utils.initials(i.nome)}</span>
            <span>${Utils.escapeHtml(i.nome)}</span>
          </div>
        </td>
        <td>${i.cpf ? Utils.escapeHtml(Utils.mascararCPF(i.cpf)) : '<span class="section__hint">—</span>'}</td>
        <td>${Utils.escapeHtml(i.telefone)}</td>
        <td>${Utils.escapeHtml(i.endereco)}</td>
        <td>${Utils.escapeHtml(i.cidade)}</td>
        <td>${i.matricula ? Utils.escapeHtml(i.matricula) : '<span class="section__hint">—</span>'}</td>
        <td>${Utils.escapeHtml(i.email)}</td>
        <td>${i.ext ? Utils.escapeHtml(i.ext) : '<span class="section__hint">—</span>'}</td>
        <td>${selo(i.integracaoQa)}</td>
        <td>${selo(i.oiCheguei)}</td>
        <td class="data-table__acoes">
          <button class="link-action" type="button" onclick="ModuleIntegracao.abrirModalIntegracao({id:'${i.id}'})">Editar</button>
          <button class="link-action link-action--danger" type="button" onclick="ModuleIntegracao.confirmarExclusao('${i.id}')">Excluir</button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Cidade</th>
              <th>Matrícula</th>
              <th>E-mail</th>
              <th>EXT</th>
              <th>Integração QA</th>
              <th>Oi Cheguei!</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Formulário (criar / editar)
  // -------------------------------------------------------------

  function abrirModalIntegracao(opcoes) {
    opcoes = opcoes || {};
    const editando = opcoes.id ? Store.getIntegracaoPorId(opcoes.id) : null;
    const v = editando || { nome: '', cpf: '', telefone: '', endereco: '', cidade: '', matricula: '', email: '', ext: '', integracaoQa: 'Pendente', oiCheguei: 'Pendente' };

    Modal.open({
      title: editando ? 'Editar colaborador' : 'Novo colaborador',
      wide: true,
      bodyHtml: `
        <form id="form-integracao" onsubmit="ModuleIntegracao.salvarIntegracao(event, ${editando ? `'${editando.id}'` : 'null'})">
          <div class="analise-fase__numeros" style="grid-template-columns:1fr 1fr; column-gap:var(--space-4)">
            <div class="field">
              <label for="int-nome">Nome do colaborador *</label>
              <input class="input" type="text" id="int-nome" value="${Utils.escapeHtml(v.nome)}" required>
            </div>
            <div class="field">
              <label for="int-cpf">CPF</label>
              <input class="input" type="text" id="int-cpf" placeholder="000.000.000-00" maxlength="14"
                     value="${v.cpf ? Utils.escapeHtml(Utils.mascararCPF(v.cpf)) : ''}"
                     oninput="this.value = Utils.mascararCPF(this.value)">
            </div>
            <div class="field">
              <label for="int-telefone">Telefone *</label>
              <input class="input" type="text" id="int-telefone" value="${Utils.escapeHtml(v.telefone)}" required>
            </div>
            <div class="field">
              <label for="int-endereco">Endereço *</label>
              <input class="input" type="text" id="int-endereco" value="${Utils.escapeHtml(v.endereco)}" required>
            </div>
            <div class="field">
              <label for="int-cidade">Cidade *</label>
              <input class="input" type="text" id="int-cidade" value="${Utils.escapeHtml(v.cidade)}" required>
            </div>
            <div class="field">
              <label for="int-matricula">Matrícula</label>
              <input class="input" type="text" id="int-matricula" value="${Utils.escapeHtml(v.matricula)}">
            </div>
            <div class="field">
              <label for="int-email">E-mail *</label>
              <input class="input" type="email" id="int-email" value="${Utils.escapeHtml(v.email)}" required>
            </div>
            <div class="field">
              <label for="int-ext">EXT</label>
              <input class="input" type="text" id="int-ext" value="${Utils.escapeHtml(v.ext)}">
            </div>
            <div></div>
            <div class="field">
              <label for="int-qa">Integração QA *</label>
              <select class="input" id="int-qa" required>
                <option value="Pendente" ${v.integracaoQa === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Realizado" ${v.integracaoQa === 'Realizado' ? 'selected' : ''}>Realizado</option>
              </select>
            </div>
            <div class="field">
              <label for="int-oi">Oi Cheguei! *</label>
              <select class="input" id="int-oi" required>
                <option value="Pendente" ${v.oiCheguei === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Realizado" ${v.oiCheguei === 'Realizado' ? 'selected' : ''}>Realizado</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
            <button type="submit" class="btn btn--primary">${editando ? 'Salvar alterações' : 'Salvar colaborador'}</button>
          </div>
        </form>
      `,
    });
  }

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function salvarIntegracao(event, idEditando) {
    event.preventDefault();

    const dados = {
      nome: document.getElementById('int-nome').value.trim(),
      cpf: document.getElementById('int-cpf').value.trim(),
      telefone: document.getElementById('int-telefone').value.trim(),
      endereco: document.getElementById('int-endereco').value.trim(),
      cidade: document.getElementById('int-cidade').value.trim(),
      matricula: document.getElementById('int-matricula').value.trim(),
      email: document.getElementById('int-email').value.trim(),
      ext: document.getElementById('int-ext').value.trim(),
      integracaoQa: document.getElementById('int-qa').value,
      oiCheguei: document.getElementById('int-oi').value,
    };

    if (!dados.nome || !dados.telefone || !dados.endereco || !dados.cidade || !dados.email) {
      Toast.show('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    if (dados.cpf && !Utils.validarCPF(dados.cpf)) {
      Toast.show('Informe um CPF válido (ou deixe o campo em branco).', 'warning');
      return;
    }
    if (!validarEmail(dados.email)) {
      Toast.show('Informe um e-mail válido.', 'warning');
      return;
    }
    if (!['Realizado', 'Pendente'].includes(dados.integracaoQa) || !['Realizado', 'Pendente'].includes(dados.oiCheguei)) {
      Toast.show('Selecione uma opção válida para Integração QA e Oi Cheguei!.', 'warning');
      return;
    }

    const botao = document.querySelector('#form-integracao button[type="submit"]');
    if (botao) { botao.disabled = true; botao.textContent = 'Salvando...'; }

    try {
      if (idEditando) {
        await Store.updateIntegracao(idEditando, dados);
        Toast.show('Colaborador atualizado com sucesso.', 'success');
      } else {
        await Store.addIntegracao(dados);
        Toast.show('Colaborador cadastrado com sucesso.', 'success');
      }
      Modal.close();
      if (window.App && typeof window.App.refresh === 'function') window.App.refresh();
    } catch (erro) {
      console.error('Erro ao salvar integração:', erro);
      if (botao) { botao.disabled = false; botao.textContent = idEditando ? 'Salvar alterações' : 'Salvar colaborador'; }
      Toast.show('Não foi possível salvar. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  // -------------------------------------------------------------
  // Exclusão (com confirmação) — exclui só o registro de Integração;
  // não afeta colaboradores, treinamentos ou ocorrências de Aduana.
  // -------------------------------------------------------------

  function confirmarExclusao(id) {
    const registro = Store.getIntegracaoPorId(id);
    if (!registro) return;
    idParaExcluir = id;

    Modal.open({
      title: 'Excluir registro de integração',
      bodyHtml: `
        <p style="margin-bottom:var(--space-4)">
          Tem certeza que deseja excluir o registro de integração de <strong>${Utils.escapeHtml(registro.nome)}</strong>?
          Esta ação não pode ser desfeita. Isso não afeta treinamentos, ocorrências de Aduana nem outros dados deste colaborador.
        </p>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="Modal.close()">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-confirmar-exclusao-integracao" style="background:var(--color-danger)" onclick="ModuleIntegracao.excluirConfirmado()">Excluir</button>
        </div>
      `,
    });
  }

  async function excluirConfirmado() {
    if (!idParaExcluir) return;
    const botao = document.getElementById('btn-confirmar-exclusao-integracao');
    if (botao) { botao.disabled = true; botao.textContent = 'Excluindo...'; }

    try {
      await Store.deleteIntegracao(idParaExcluir);
      idParaExcluir = null;
      Modal.close();
      Toast.show('Registro excluído.', 'success');
      if (window.App && typeof window.App.refresh === 'function') window.App.refresh();
    } catch (erro) {
      console.error('Erro ao excluir integração:', erro);
      if (botao) { botao.disabled = false; botao.textContent = 'Excluir'; }
      Toast.show('Não foi possível excluir. Verifique sua conexão e tente novamente.', 'warning');
    }
  }

  return {
    render,
    onFiltroChange,
    limparFiltros,
    abrirModalIntegracao,
    salvarIntegracao,
    confirmarExclusao,
    excluirConfirmado,
  };
})();
