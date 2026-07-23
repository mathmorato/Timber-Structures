const $ = (selector) => document.querySelector(selector);
const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const modal = $('#auth-modal');
const loginForm = $('#login-form');
const registerForm = $('#register-form');
const message = $('#auth-message');
let signedInUser = null;

$('#year').textContent = new Date().getFullYear();

function openAuth(mode = 'login') { modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); switchTab(mode); }
function closeAuth() { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); message.textContent = ''; }
function switchTab(tab) {
  document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
  loginForm.hidden = tab !== 'login'; registerForm.hidden = tab !== 'register'; message.textContent = '';
}
document.querySelectorAll('[data-open-auth]').forEach(button => button.addEventListener('click', () => openAuth(button.dataset.openAuth)));
document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.authTab)));
$('.close').addEventListener('click', closeAuth);
modal.addEventListener('click', event => { if (event.target === modal) closeAuth(); });

async function loadProfile(authUser) {
  const { data, error } = await client.from('profiles').select('full_name, role').eq('id', authUser.id).single();
  if (error) throw error;
  return { name: data.full_name || authUser.email, role: data.role };
}

function enterDashboard(user) {
  signedInUser = user;
  closeAuth();
  const dashboard = document.createElement('section');
  dashboard.className = `dashboard ${user.role === 'admin' ? 'is-admin' : ''}`;
  dashboard.innerHTML = `<header class="dash-head"><a class="brand" href="#inicio"><span class="brand-mark">TS</span><span>Timber<br><em>Structures</em></span></a><div><span class="role-pill">${user.role === 'admin' ? 'ADMINISTRAÇÃO' : 'PARTICIPANTE'}</span> <button class="text-button" id="logout">Sair</button></div></header><main class="dash-main"><div class="dash-title"><div><p class="eyebrow"><span></span> Área restrita</p><h1>Olá, ${user.name.split(' ')[0]}.</h1><p>Escolha um módulo para continuar seu trabalho na plataforma.</p></div></div><div class="dash-grid"><article class="dash-card"><span>01 · EM BREVE</span><h3>Meus projetos</h3><p>Projetos, modelos e documentos vinculados ao seu perfil.</p></article><article class="dash-card"><span>02 · EM BREVE</span><h3>Biblioteca técnica</h3><p>Normas, tabelas, referências e especificações disponíveis.</p></article><article class="dash-card"><span>03 · EM BREVE</span><h3>Colaboração</h3><p>Revisões, aprovações e compartilhamento com a equipe.</p></article><article class="dash-card admin-only"><span>ADMIN · GESTÃO</span><h3>Usuários</h3><p>Convites, permissões e acompanhamento dos perfis cadastrados.</p></article><article class="dash-card admin-only"><span>ADMIN · GESTÃO</span><h3>Conteúdos</h3><p>Publique e organize os materiais de cada módulo.</p></article><article class="dash-card admin-only"><span>ADMIN · GESTÃO</span><h3>Indicadores</h3><p>Visualize o uso da plataforma e os resultados do projeto.</p></article></div></div></main></section>`;
  document.body.append(dashboard);
  $('#logout').addEventListener('click', async () => { await client.auth.signOut(); signedInUser = null; dashboard.remove(); });
}
registerForm.addEventListener('submit', async event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(registerForm));
  const button = registerForm.querySelector('button'); button.disabled = true; button.textContent = 'Criando conta...';
  const { data: result, error } = await client.auth.signUp({
    email: data.email, password: data.password, options: { data: { full_name: data.name.trim() } }
  });
  button.disabled = false; button.innerHTML = 'Criar conta <b>→</b>';
  if (error) { message.textContent = error.message; return; }
  registerForm.reset();
  if (!result.session) { message.textContent = 'Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre na plataforma.'; return; }
  try { enterDashboard(await loadProfile(result.user)); } catch (profileError) { message.textContent = 'Conta criada, mas o perfil ainda não foi configurado. Execute o arquivo supabase-setup.sql no Supabase.'; }
});
loginForm.addEventListener('submit', async event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(loginForm));
  const button = loginForm.querySelector('button'); button.disabled = true; button.textContent = 'Entrando...';
  const { data: result, error } = await client.auth.signInWithPassword({ email: data.email, password: data.password });
  button.disabled = false; button.innerHTML = 'Entrar <b>→</b>';
  if (error) { message.textContent = 'E-mail ou senha inválidos.'; return; }
  try { enterDashboard(await loadProfile(result.user)); loginForm.reset(); } catch (profileError) { message.textContent = 'Não foi possível carregar seu perfil. Confirme se o script supabase-setup.sql foi executado.'; }
});
document.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => signedInUser ? enterDashboard(signedInUser) : openAuth('login')));

const forgotLink = document.getElementById('forgot-password');
let cooldownTimer = null;

forgotLink.addEventListener('click', async (event) => {
    event.preventDefault();
    if (cooldownTimer) return;

    const email = loginForm.email.value.trim();
    if (!email) {
        message.textContent = 'Informe seu e-mail para recuperar a senha.';
        return;
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    let seconds = 60;
    forgotLink.style.pointerEvents = 'none';
    forgotLink.style.opacity = '.5';
    message.textContent = `Enviamos um link para redefinir sua senha. Reenvio disponível em ${seconds}s`;

    cooldownTimer = setInterval(() => {
        seconds--;
        message.textContent = `Enviamos um link para redefinir sua senha. Reenvio disponível em ${seconds}s`;
        forgotLink.textContent = `Reenviar (${seconds}s)`;

        if (seconds <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            forgotLink.style.pointerEvents = '';
            forgotLink.style.opacity = '';
            forgotLink.textContent = 'Esqueceu sua senha?';
            message.textContent = '';
        }
    }, 1000);
});

client.auth.getUser().then(async ({ data: { user } }) => {
  if (!user) return;
  try { enterDashboard(await loadProfile(user)); } catch (_) { /* O setup ainda pode estar pendente. */ }
});
