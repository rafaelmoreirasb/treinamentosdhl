/* ==========================================================================
   modal.js
   Componente genérico de modal (janela sobreposta). Qualquer módulo pode
   usar Modal.open({ title, bodyHtml }) para exibir um formulário ou
   mensagem, e Modal.close() para fechar.
   ========================================================================== */

window.Modal = (function () {

  function root() {
    return document.getElementById('modal-root');
  }

  function open({ title, bodyHtml, wide }) {
    root().innerHTML = `
      <div class="modal-overlay" onclick="Modal.closeOnOverlay(event)">
        <div class="modal-dialog ${wide ? 'modal-dialog--wide' : ''}" role="dialog" aria-modal="true" aria-label="${Utils.escapeHtml(title)}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button type="button" class="modal-close" onclick="Modal.close()" aria-label="Fechar">✕</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
        </div>
      </div>
    `;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    root().innerHTML = '';
    document.body.style.overflow = '';
  }

  // Fecha somente se o clique foi no fundo escuro, não dentro da caixa.
  function closeOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
      close();
    }
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root().innerHTML.trim() !== '') {
      close();
    }
  });

  return { open, close, closeOnOverlay };
})();
