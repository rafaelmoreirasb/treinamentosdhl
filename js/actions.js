/* ==========================================================================
   actions.js
   Ações simples, chamadas diretamente pelos botões da interface.
   Mantido separado dos módulos para ficar fácil de encontrar.
   ========================================================================== */

window.Actions = {

  // Botão "Importar Excel" — a importação real será feita na Etapa 3.
  importarExcel: function () {
    Toast.show('Importação de Excel será disponibilizada na próxima etapa.', 'info');
  },

};
