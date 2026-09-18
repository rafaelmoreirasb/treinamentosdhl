/* ==========================================================================
   router.js
   Roteamento simples baseado em hash (#/rota). Cada rota indica qual
   módulo deve renderizar o conteúdo e quais informações exibir no
   cabeçalho e na barra lateral. Novas rotas podem ser adicionadas aqui
   sem alterar os demais arquivos.
   ========================================================================== */

window.Router = (function () {

  function resolve(hash) {
    const path = (hash || '#/inicio').replace(/^#\/?/, '');
    const parts = path.split('/').filter(Boolean);
    const [root, sub] = parts;

    switch (root) {
      case undefined:
      case 'inicio':
        return {
          navKey: 'inicio',
          eyebrow: 'Visão geral',
          title: 'Início',
          html: ModuleDashboard.render(),
        };

      case 'treinamentos':
        return resolveTreinamentos(sub);

      case 'colaboradores':
        if (sub) {
          const colaborador = Utils.getColaborador(sub);
          return {
            navKey: 'colaboradores',
            eyebrow: 'Colaboradores',
            title: colaborador ? colaborador.nome : 'Colaborador',
            html: ModuleColaboradores.renderDetail(sub),
          };
        }
        return {
          navKey: 'colaboradores',
          eyebrow: 'Cadastro',
          title: 'Colaboradores',
          html: ModuleColaboradores.renderList(),
          afterRender: ModuleColaboradores.afterRenderList,
        };

      case 'relatorios':
        return {
          navKey: 'relatorios',
          eyebrow: 'Gestão',
          title: 'Relatórios',
          html: ModulePlaceholder.render('Relatórios', 'A geração de relatórios para a gestão será disponibilizada em uma próxima etapa do projeto.'),
        };

      case 'configuracoes':
        return {
          navKey: 'configuracoes',
          eyebrow: 'Sistema',
          title: 'Configurações',
          html: ModuleConfiguracoes.render(),
          afterRender: ModuleConfiguracoes.afterRender,
        };

      default:
        return {
          navKey: 'inicio',
          eyebrow: 'Visão geral',
          title: 'Início',
          html: ModuleDashboard.render(),
        };
    }
  }

  function resolveTreinamentos(sub) {
    const titulos = {
      aduana: 'Aduana',
      avaria: 'Avaria',
      integracao: 'Integração',
      volumosos: 'Volumosos',
    };

    if (sub === 'aduana') {
      return {
        navKey: 'treinamentos/aduana',
        eyebrow: 'Treinamentos',
        title: 'Aduana',
        html: ModuleAduana.render(),
      };
    }

    if (sub === 'integracao') {
      return {
        navKey: 'treinamentos/integracao',
        eyebrow: 'Treinamentos',
        title: 'Integração',
        html: ModuleIntegracao.render(),
      };
    }

    if (titulos[sub]) {
      return {
        navKey: `treinamentos/${sub}`,
        eyebrow: 'Treinamentos',
        title: titulos[sub],
        html: ModulePlaceholder.render(titulos[sub], `O módulo de ${titulos[sub]} ainda não foi desenvolvido. Ele seguirá a mesma estrutura do módulo Aduana, com campos e indicadores próprios.`),
      };
    }

    // Tela geral de Treinamentos (todos os módulos, registro de treinamentos de teste)
    return {
      navKey: 'treinamentos',
      eyebrow: 'Treinamentos',
      title: 'Treinamentos',
      html: ModuleTreinamentos.renderList(),
    };
  }

  return { resolve };
})();
