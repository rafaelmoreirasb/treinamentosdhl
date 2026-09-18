/* ==========================================================================
   placeholder.js
   Estado "Em breve" — usado por módulos ainda não desenvolvidos.
   Não contém funcionalidades ou dados fictícios de negócio.
   ========================================================================== */

window.ModulePlaceholder = (function () {

  function render(titulo, descricao) {
    return `
      <div class="empty-state">
        <span class="empty-state__icon">${Icons.clock}</span>
        <h2 class="empty-state__title">${titulo} · Em breve</h2>
        <p class="empty-state__text">${descricao}</p>
      </div>
    `;
  }

  return { render };
})();
