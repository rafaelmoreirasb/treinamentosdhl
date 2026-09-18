/* ==========================================================================
   login.js
   Tela de login/cadastro e os estados de "carregando" e "não configurado".
   Tudo isso é desenhado dentro de #auth-root, uma camada que cobre o
   aplicativo inteiro até a pessoa estar autenticada e os dados carregados.
   ========================================================================== */

window.Login = (function () {

  function root() {
    return document.getElementById('auth-root');
  }

  function moldura(conteudoHtml) {
    return `
      <div class="auth-overlay">
        <div class="auth-card">
          <div class="auth-card__brand">
            <span class="sidebar__brand-mark">DHL</span>
            <div>
              <div class="auth-card__titulo">Gestão de Treinamentos</div>
              <div class="auth-card__subtitulo">DHL Supply Chain</div>
            </div>
          </div>
          ${conteudoHtml}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Estados sem formulário
  // -------------------------------------------------------------

  function mostrarConfiguracaoNecessaria() {
    root().innerHTML = moldura(`
      <h2 class="auth-card__heading">Configuração necessária</h2>
      <p class="section__hint" style="margin-bottom:var(--space-4)">
        Este aplicativo ainda não está conectado a um projeto Supabase.
      </p>
      <ol class="auth-passos">
        <li>Crie uma conta gratuita em supabase.com e um novo projeto</li>
        <li>No SQL Editor do projeto, rode o conteúdo de <code>db/schema.sql</code></li>
        <li>Copie a URL e a "anon public key" (Project Settings → API)</li>
        <li>Cole esses dois valores em <code>js/config.js</code> (veja <code>js/config.example.js</code>)</li>
        <li>Recarregue esta página</li>
      </ol>
      <p class="section__hint">O passo a passo completo está no README do projeto.</p>
    `);
  }

  function mostrarCarregando(mensagem) {
    root().innerHTML = moldura(`
      <div class="auth-carregando">
        <div class="spinner" aria-hidden="true"></div>
        <p>${Utils.escapeHtml(mensagem || 'Carregando...')}</p>
      </div>
    `);
  }

  function mostrarErroCarregamento() {
    root().innerHTML = moldura(`
      <h2 class="auth-card__heading">Não foi possível carregar os dados</h2>
      <p class="section__hint" style="margin-bottom:var(--space-4)">Verifique sua conexão com a internet e tente novamente. Se o problema continuar, confira se as tabelas e permissões do banco (Supabase) estão configuradas corretamente.</p>
      <div class="form-actions" style="justify-content:flex-start">
        <button class="btn btn--primary" type="button" onclick="Login.tentarNovamenteCarregar()">Tentar novamente</button>
      </div>
    `);
  }

  function tentarNovamenteCarregar() {
    if (window.App && typeof window.App.carregarAppLogado === 'function') {
      window.App.carregarAppLogado();
    }
  }

  // -------------------------------------------------------------
  // Login
  // -------------------------------------------------------------

  function mostrar(mensagemErro) {
    root().innerHTML = moldura(`
      <h2 class="auth-card__heading">Entrar</h2>
      ${mensagemErro ? `<div class="auth-card__erro">${Utils.escapeHtml(mensagemErro)}</div>` : ''}
      <form id="form-login" onsubmit="Login.entrar(event)">
        <div class="field">
          <label for="login-email">E-mail</label>
          <input class="input" type="email" id="login-email" required autocomplete="username">
        </div>
        <div class="field">
          <label for="login-senha">Senha</label>
          <input class="input" type="password" id="login-senha" required autocomplete="current-password">
        </div>
        <button class="btn btn--primary" type="submit" id="btn-entrar" style="width:100%">Entrar</button>
      </form>
      <button class="link-action" type="button" onclick="Login.mostrarCadastro()" style="margin-top:var(--space-4)">Ainda não tenho conta</button>
    `);
    const primeiroCampo = document.getElementById('login-email');
    if (primeiroCampo) primeiroCampo.focus();
  }

  async function entrar(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const botao = document.getElementById('btn-entrar');
    botao.disabled = true;
    botao.textContent = 'Entrando...';

    try {
      await AuthService.entrar(email, senha);
      await window.App.carregarAppLogado();
    } catch (erro) {
      mostrar(erro.message || 'Não foi possível entrar. Tente novamente.');
    }
  }

  // -------------------------------------------------------------
  // Cadastro
  // -------------------------------------------------------------

  function mostrarCadastro(mensagem, tipoMensagem) {
    root().innerHTML = moldura(`
      <h2 class="auth-card__heading">Criar conta</h2>
      ${mensagem ? `<div class="${tipoMensagem === 'info' ? 'auth-card__info' : 'auth-card__erro'}">${Utils.escapeHtml(mensagem)}</div>` : ''}
      <form id="form-cadastro" onsubmit="Login.cadastrar(event)">
        <div class="field">
          <label for="cad-nome">Nome</label>
          <input class="input" type="text" id="cad-nome" required autocomplete="name">
        </div>
        <div class="field">
          <label for="cad-email">E-mail</label>
          <input class="input" type="email" id="cad-email" required autocomplete="username">
        </div>
        <div class="field">
          <label for="cad-senha">Senha</label>
          <input class="input" type="password" id="cad-senha" required minlength="6" autocomplete="new-password">
          <span class="section__hint">Mínimo de 6 caracteres</span>
        </div>
        <button class="btn btn--primary" type="submit" id="btn-cadastrar" style="width:100%">Criar conta</button>
      </form>
      <button class="link-action" type="button" onclick="Login.mostrar()" style="margin-top:var(--space-4)">Já tenho conta</button>
    `);
  }

  async function cadastrar(event) {
    event.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;
    const botao = document.getElementById('btn-cadastrar');
    botao.disabled = true;
    botao.textContent = 'Criando conta...';

    try {
      const resultado = await AuthService.cadastrar(email, senha, nome);
      if (resultado.session) {
        // Confirmação de e-mail desativada no projeto: já entra direto.
        await window.App.carregarAppLogado();
      } else {
        mostrar('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
      }
    } catch (erro) {
      mostrarCadastro(erro.message || 'Não foi possível criar a conta.', 'erro');
    }
  }

  function ocultar() {
    root().innerHTML = '';
  }

  return {
    mostrar,
    mostrarCadastro,
    mostrarConfiguracaoNecessaria,
    mostrarCarregando,
    mostrarErroCarregamento,
    tentarNovamenteCarregar,
    entrar,
    cadastrar,
    ocultar,
  };
})();
