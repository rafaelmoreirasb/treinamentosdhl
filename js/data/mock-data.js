/* ==========================================================================
   mock-data.js
   DADOS FICTÍCIOS — de referência apenas.

   ATÉ A ETAPA 5, este arquivo alimentava o aplicativo enquanto não havia
   dados reais. A PARTIR DA ETAPA 6, o aplicativo é 100% online (banco de
   dados via Supabase) e não usa mais estes dados para funcionar.

   Este arquivo continua no projeto só para a ferramenta de migração
   (js/modules/migracao.js), que pode precisar destes nomes fictícios para
   entender registros antigos salvos no localStorage de quem já usava o
   aplicativo antes desta etapa. Pode ser removido com segurança depois que
   a migração de todo mundo for concluída.
   ========================================================================== */

window.MOCK = (function () {

  const colaboradores = [
    { id: 'c01', nome: 'João da Silva',       cargo: 'Operador de Armazém', turno: '1º Turno' },
    { id: 'c02', nome: 'Maria Oliveira',      cargo: 'Conferente',          turno: '2º Turno' },
    { id: 'c03', nome: 'Carlos Souza',        cargo: 'Operador de Armazém', turno: '1º Turno' },
    { id: 'c04', nome: 'Ana Pereira',         cargo: 'Conferente',          turno: '3º Turno' },
    { id: 'c05', nome: 'Pedro Santos',        cargo: 'Operador de Empilhadeira', turno: '1º Turno' },
    { id: 'c06', nome: 'Juliana Costa',       cargo: 'Conferente',          turno: '2º Turno' },
    { id: 'c07', nome: 'Rafael Lima',         cargo: 'Operador de Armazém', turno: '2º Turno' },
    { id: 'c08', nome: 'Fernanda Alves',      cargo: 'Conferente',          turno: '1º Turno' },
    { id: 'c09', nome: 'Bruno Ferreira',      cargo: 'Operador de Empilhadeira', turno: '3º Turno' },
    { id: 'c10', nome: 'Camila Rodrigues',    cargo: 'Conferente',          turno: '1º Turno' },
  ];

  // Ocorrências do módulo ADUANA — cada linha representa um registro
  // importado (fictício) de: Data, Nome, Aduana a Mais, Aduana Faltante.
  const aduanaOcorrencias = [
    { id: 'a001', colaboradorId: 'c01', data: '2026-06-03', aMais: 3, faltante: 2 },
    { id: 'a002', colaboradorId: 'c01', data: '2026-06-03', aMais: 1, faltante: 1 },
    { id: 'a003', colaboradorId: 'c02', data: '2026-06-04', aMais: 0, faltante: 4 },
    { id: 'a004', colaboradorId: 'c03', data: '2026-06-05', aMais: 2, faltante: 0 },
    { id: 'a005', colaboradorId: 'c01', data: '2026-06-10', aMais: 1, faltante: 0 },
    { id: 'a006', colaboradorId: 'c04', data: '2026-06-12', aMais: 5, faltante: 3 },
    { id: 'a007', colaboradorId: 'c05', data: '2026-06-15', aMais: 0, faltante: 2 },
    { id: 'a008', colaboradorId: 'c02', data: '2026-06-18', aMais: 2, faltante: 1 },
    { id: 'a009', colaboradorId: 'c06', data: '2026-06-20', aMais: 1, faltante: 1 },
    { id: 'a010', colaboradorId: 'c03', data: '2026-06-22', aMais: 3, faltante: 2 },
    { id: 'a011', colaboradorId: 'c07', data: '2026-07-02', aMais: 1, faltante: 0 },
    { id: 'a012', colaboradorId: 'c01', data: '2026-07-05', aMais: 0, faltante: 1 },
    { id: 'a013', colaboradorId: 'c08', data: '2026-07-08', aMais: 2, faltante: 2 },
    { id: 'a014', colaboradorId: 'c04', data: '2026-07-11', aMais: 1, faltante: 0 },
    { id: 'a015', colaboradorId: 'c09', data: '2026-07-14', aMais: 0, faltante: 3 },
    { id: 'a016', colaboradorId: 'c02', data: '2026-07-19', aMais: 1, faltante: 1 },
    { id: 'a017', colaboradorId: 'c10', data: '2026-07-21', aMais: 2, faltante: 0 },
    { id: 'a018', colaboradorId: 'c03', data: '2026-07-25', aMais: 1, faltante: 1 },
    { id: 'a019', colaboradorId: 'c05', data: '2026-08-02', aMais: 0, faltante: 1 },
    { id: 'a020', colaboradorId: 'c01', data: '2026-08-06', aMais: 2, faltante: 1 },
    { id: 'a021', colaboradorId: 'c06', data: '2026-08-09', aMais: 1, faltante: 0 },
    { id: 'a022', colaboradorId: 'c04', data: '2026-08-14', aMais: 0, faltante: 2 },
    { id: 'a023', colaboradorId: 'c07', data: '2026-08-18', aMais: 1, faltante: 1 },
    { id: 'a024', colaboradorId: 'c02', data: '2026-08-22', aMais: 0, faltante: 1 },
    { id: 'a025', colaboradorId: 'c03', data: '2026-08-27', aMais: 1, faltante: 0 },
    { id: 'a026', colaboradorId: 'c09', data: '2026-09-02', aMais: 0, faltante: 2 },
    { id: 'a027', colaboradorId: 'c01', data: '2026-09-05', aMais: 1, faltante: 0 },
    { id: 'a028', colaboradorId: 'c08', data: '2026-09-09', aMais: 1, faltante: 1 },
    { id: 'a029', colaboradorId: 'c10', data: '2026-09-12', aMais: 0, faltante: 1 },
    { id: 'a030', colaboradorId: 'c04', data: '2026-09-15', aMais: 1, faltante: 0 },
  ];

  // Histórico geral de treinamentos — nunca é apagado ou substituído.
  const treinamentos = [
    { id: 't01', colaboradorId: 'c01', tipo: 'Aduana',  data: '2026-06-11', responsavel: 'Marcos Tavares', observacao: 'Reforço após ocorrências de estoque.' },
    { id: 't02', colaboradorId: 'c01', tipo: 'Aduana',  data: '2026-07-20', responsavel: 'Marcos Tavares', observacao: '' },
    { id: 't03', colaboradorId: 'c02', tipo: 'Aduana',  data: '2026-06-25', responsavel: 'Marcos Tavares', observacao: '' },
    { id: 't04', colaboradorId: 'c03', tipo: 'Aduana',  data: '2026-07-28', responsavel: 'Luciana Prado', observacao: '' },
    { id: 't05', colaboradorId: 'c04', tipo: 'Aduana',  data: '2026-08-01', responsavel: 'Marcos Tavares', observacao: 'Colaborador reincidente.' },
    { id: 't06', colaboradorId: 'c01', tipo: 'Avaria',  data: '2026-08-15', responsavel: 'Luciana Prado', observacao: '' },
    { id: 't07', colaboradorId: 'c06', tipo: 'Aduana',  data: '2026-08-25', responsavel: 'Marcos Tavares', observacao: '' },
    { id: 't08', colaboradorId: 'c09', tipo: 'Aduana',  data: '2026-09-04', responsavel: 'Luciana Prado', observacao: '' },
  ];

  return { colaboradores, aduanaOcorrencias, treinamentos };
})();
