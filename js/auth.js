/**
 * auth.js
 * Sistema de autenticación para AquaTrack DW
 */

// ==================== ESPERAR A QUE SUPABASE ESTÉ LISTO ====================
function waitForSupabase() {
  return new Promise((resolve, reject) => {
    if (window.AquaTrack?.db) {
      resolve();
      return;
    }
    
    window.addEventListener('supabase:ready', () => resolve(), { once: true });
    
    setTimeout(() => {
      if (!window.AquaTrack?.db) {
        reject(new Error('Timeout: Supabase no disponible'));
      } else {
        resolve();
      }
    }, 5000);
  });
}

// ==================== MESSAGE HANDLER ====================
function showMessage(element, text, type = 'info') {
  if (!element) return;
  element.className = 'message-box';
  element.textContent = text;
  if (type) element.classList.add(type);
  if (type === 'success') {
    setTimeout(() => {
      element.className = 'message-box';
      element.textContent = '';
    }, 5000);
  }
}

// ==================== BUTTON LOADING STATE ====================
function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
    const btnText = button.querySelector('.btn-text');
    if (btnText) {
      button.setAttribute('data-original-text', btnText.textContent);
      btnText.textContent = 'Procesando...';
    } else {
      button.setAttribute('data-original-text', button.textContent);
      button.textContent = 'Procesando...';
    }
  } else {
    button.classList.remove('loading');
    button.disabled = false;
    const originalText = button.getAttribute('data-original-text');
    const btnText = button.querySelector('.btn-text');
    if (btnText && originalText) btnText.textContent = originalText;
    else if (originalText) button.textContent = originalText;
  }
}

// ==================== VALIDATION ====================
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

// ==================== LOGIN ====================
async function login() {
  const msg = document.getElementById('msg');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginButton = document.querySelector('#loginForm .btn-primary');

  try {
    // Esperar a que Supabase esté disponible
    await waitForSupabase();
    
    if (!email || !password) {
      showMessage(msg, '⚠️ Completa todos los campos', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showMessage(msg, '⚠️ Ingresa un email válido', 'error');
      return;
    }
    if (!validatePassword(password)) {
      showMessage(msg, '⚠️ La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setButtonLoading(loginButton, true);
    showMessage(msg, '🔄 Iniciando sesión...', 'info');

    const { data, error } = await window.AquaTrack.db.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (error) {
      const errorMessages = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'Email not confirmed': 'Confirma tu email antes de iniciar sesión'
      };
      throw new Error(errorMessages[error.message] || error.message);
    }

    showMessage(msg, '✅ Sesión iniciada correctamente', 'success');
    console.log('✅ Login exitoso:', data.user.email);

  } catch (error) {
    console.error('❌ Error en login:', error);
    showMessage(msg, `❌ ${error.message}`, 'error');
    setButtonLoading(loginButton, false);
  }
}

// ... (resto del código se mantiene igual)

// ==================== AUTO-LOGIN CHECK ====================
(async () => {
  try {
    await waitForSupabase();
    const { data: { session } } = await window.AquaTrack.db.auth.getSession();
    if (session) {
      console.log('🔍 Sesión existente encontrada');
      await redirectBySession(session);
    } else {
      console.log('ℹ️ No hay sesión activa');
    }
  } catch (error) {
    console.error('❌ Error al verificar sesión:', error);
  }
})();

// No ejecutar el listener hasta que Supabase esté listo
waitForSupabase().then(() => {
  window.AquaTrack.db.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state:', event);
    if (event === 'SIGNED_IN') redirectBySession(session);
    if (event === 'SIGNED_OUT') {
      sessionStorage.clear();
      localStorage.removeItem('supabase.auth.token');
      const current = window.location.pathname.split('/').pop();
      if (current !== 'index.html' && current !== '') {
        window.location.href = window.AquaTrack.config.ROUTES.LOGIN;
      }
    }
  });
});

// ==================== EXPORTAR FUNCIONES ====================
window.login = login;
window.register = register;
window.logout = logout;
window.showMessage = showMessage;