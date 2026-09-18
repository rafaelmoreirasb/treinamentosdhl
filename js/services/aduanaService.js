/* ==========================================================================
   aduanaService.js
   Acesso à tabela "aduana_ocorrencias".

   A proteção contra duplicidade agora vive também no banco: a tabela tem
   uma restrição UNIQUE em (colaborador_id, data, aduana_a_mais,
   aduana_faltante) — a mesma regra que o frontend já usava. Isso significa
   que mesmo que duas pessoas importem o mesmo arquivo ao mesmo tempo, de
   computadores diferentes, o banco garante que o registro não duplica.
   ========================================================================== */

window.AduanaService = (function () {

  function tabela() {
    return SupabaseClient.obter().from('aduana_ocorrencias');
  }

  function doBanco(row) {
    return {
      id: row.id,
      colaboradorId: row.colaborador_id,
      data: row.data,
      aMais: row.aduana_a_mais,
      faltante: row.aduana_faltante,
    };
  }

  async function listarTodas() {
    const { data, error } = await tabela().select('*').order('data', { ascending: false });
    if (error) throw error;
    return data.map(doBanco);
  }

  // Insere uma leva de registros já validados de uma importação.
  // Usa "upsert" com ignoreDuplicates para aproveitar a restrição UNIQUE
  // do banco: registros que já existem (mesmo colaborador+data+valores)
  // são simplesmente ignorados, sem gerar erro.
  async function inserirLote(registros, importacaoId) {
    if (!registros || registros.length === 0) return { adicionados: 0, ignorados: 0 };

    const linhas = registros.map(r => ({
      colaborador_id: r.colaboradorId,
      data: r.data,
      aduana_a_mais: r.aMais,
      aduana_faltante: r.faltante,
      importacao_id: importacaoId || null,
    }));

    const { data, error } = await tabela()
      .upsert(linhas, {
        onConflict: 'colaborador_id,data,aduana_a_mais,aduana_faltante',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;

    const adicionados = data.length;
    return { adicionados, ignorados: registros.length - adicionados, registros: data.map(doBanco) };
  }

  return { listarTodas, inserirLote };
})();
