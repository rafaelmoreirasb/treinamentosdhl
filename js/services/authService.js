/* ==========================================================================
   authService.js
   Login, cadastro, logout e leitura do usuário/perfil atual — tudo que
   envolve autenticação passa por aqui.
   ========================================================================== */

window.AuthService = (function () {

  function cliente() {
    return SupabaseClient.obter();
  }

  async function entrar(email, senha) {
    const { data, error } = await cliente().auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErro(error));
    return data.session;
  }

  async function cadastrar(email, senha, nome) {
    const { data, error } = await cliente().auth.signUp({
      email,
      password: senha,
      options: { data: { nome: nome || '' } },
    });
    if (error) throw new Error(traduzirErro(error));
    return data;
  }

  async function sair() {
    const { error } = await cliente().auth.signOut();
    if (error) throw new Error(traduzirErro(error));
  }

  async function sessaoAtual() {
    const { data, error } = await cliente().auth.getSession();
    if (error) return null;
    return data.session;
  }

  // Perfil = sessão + papel (admin/usuario), lido da tabela "perfis".
  async function perfilAtual() {
    const sessao = await sessaoAtual();
    if (!sessao) return null;

    const { data, error } = await cliente()
      .from('perfis')
      .select('*')
      .eq('id', sessao.user.id)
      .single();

    if (error || !data) {
      // Perfil ainda não existe (raríssimo — o gatilho no banco cria na
      // hora do cadastro) ou a leitura falhou; segue como "usuario".
      return { id: sessao.user.id, email: sessao.user.email, nome: '', papel: 'usuario' };
    }
    return { ...data, email: sessao.user.email };
  }

  function traduzirErro(error) {
    const msg = (error && error.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
    if (msg.includes('user already registered')) return 'Já existe uma conta com este e-mail.';
    if (msg.includes('password') && (msg.includes('least') || msg.includes('short'))) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (msg.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
    if (msg.includes('fetch') || msg.includes('network')) return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
    return 'Não foi possível completar a operação. Tente novamente.';
  }

  return { entrar, cadastrar, sair, sessaoAtual, perfilAtual };
})();
