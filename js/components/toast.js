/* ==========================================================================
   toast.js
   Notificação simples e temporária no canto da tela, usada para
   confirmar ações (ex: "Treinamento salvo") ou avisar sobre
   funcionalidades futuras (ex: importação de Excel).
   ========================================================================== */

window.Toast = (function () {

  function show(mensagem, tipo) {
    const root = document.getElementById('toast-root');
    if (!root) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo || 'info'}`;
    toast.textContent = mensagem;
    root.appendChild(toast);

    // Remove automaticamente após alguns segundos.
    setTimeout(() => {
      toast.classList.add('toast--leaving');
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  return { show };
})();
