/* ==========================================================================
   app.js
   Inicialização do aplicativo: navegação, renderização de views e
   sincronização do estado da barra lateral com a rota atual.

   LOGIN: removido da inicialização por pedido (uso de uma única pessoa,
   sem necessidade de controle de usuários por enquanto). O código de
   autenticação continua existindo (js/services/authService.js,
   js/modules/login.js) e as políticas do banco também — só não são mais
   chamados daqui. Ver a função iniciar() logo abaixo para trazer de volta
   no futuro, se for preciso.
   ========================================================================== */

(function () {

  window.APP_VERSION = '1.0.0';

  const viewRoot = document.getElementById('view-root');
  const headerEyebrow = document.getElementById('header-eyebrow');
  const headerTitle = document.getElementById('header-title');

  function renderRoute() {
    if (!window.Store || !Store.estaInicializado()) return; // dados ainda não carregados

    const route = Router.resolve(window.location.hash);

    viewRoot.innerHTML = route.html;
    headerEyebrow.textContent = route.eyebrow;
    headerTitle.textContent = route.title;
    viewRoot.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    updateSidebar(route.navKey);

    if (typeof route.afterRender === 'function') {
      route.afterRender();
    }
  }

  function updateSidebar(navKey) {
    document.querySelectorAll('.nav-item[data-nav]').forEach(el => {
      el.classList.toggle('is-active', el.dataset.nav === navKey);
    });
    document.querySelectorAll('.nav-subitem[data-nav]').forEach(el => {
      el.classList.toggle('is-active', el.dataset.nav === navKey);
    });

    const treinamentosGroup = document.querySelector('.nav-group[data-group="treinamentos"]');
    if (treinamentosGroup && navKey.startsWith('treinamentos')) {
      treinamentosGroup.classList.add('is-open');
    }
  }

  // -------------------------------------------------------------
  // Inicialização
  // -------------------------------------------------------------
  // O login foi removido da experiência do aplicativo (por pedido: uso
  // de uma pessoa só, sem necessidade de controle de usuários por
  // enquanto). O código de autenticação continua existindo em
  // js/services/authService.js e js/modules/login.js — só não é mais
  // chamado a partir daqui. Para trazer o login de volta no futuro, é
  // essa função (iniciar) que precisa voltar a checar a sessão antes de
  // chamar carregarAppLogado().

  async function iniciar() {
    if (!window.SupabaseClient || !SupabaseClient.estaConfigurado()) {
      Login.mostrarConfiguracaoNecessaria();
      return;
    }

    await carregarAppLogado();
  }

  async function carregarAppLogado() {
    Login.mostrarCarregando('Carregando dados...');
    try {
      await Store.inicializar();
      atualizarCabecalhoUsuario({ nome: 'Modo sem login', papel: 'usuario' });
      const btnSair = document.getElementById('btn-sair');
      if (btnSair) btnSair.style.display = 'none';
      Login.ocultar();
      renderRoute();
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      Login.mostrarErroCarregamento();
    }
  }

  function atualizarCabecalhoUsuario(perfil) {
    if (!perfil) return;
    const nomeExibicao = perfil.nome || perfil.email || 'Usuário';
    const nomeEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-user-avatar');
    if (nomeEl) nomeEl.textContent = nomeExibicao;
    if (avatarEl) avatarEl.textContent = Utils.initials(nomeExibicao);
  }

  async function sair() {
    try {
      await AuthService.sair();
    } catch (erro) {
      console.error('Erro ao sair:', erro);
    }
    Store.limpar();
    viewRoot.innerHTML = '';
    window.location.hash = '#/inicio';
    Login.mostrar();
  }

  // -------------------------------------------------------------
  // Navegação (igual às etapas anteriores)
  // -------------------------------------------------------------

  document.addEventListener('click', (event) => {
    const toggleEl = event.target.closest('[data-toggle-group]');
    if (toggleEl) {
      toggleEl.closest('.nav-group').classList.toggle('is-open');
      return;
    }

    const navEl = event.target.closest('[data-nav]');
    if (!navEl) return;

    window.location.hash = '#/' + navEl.dataset.nav;
  });

  window.addEventListener('hashchange', renderRoute);
  document.addEventListener('DOMContentLoaded', iniciar);

  // Exposto para outros módulos (login, modais, etc.).
  window.App = { refresh: renderRoute, carregarAppLogado, sair };
})();
