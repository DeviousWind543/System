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
window.showMessage = showMessage;/**
 * auth.js
 * Sistema de autenticación para AquaTrack DW
 * Registro con nombre · Login · Redirección por rol
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
        'Email not confirmed': 'Confirma tu email antes de iniciar sesión',
        'User not found': 'Usuario no encontrado'
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

// ==================== REGISTER (CON NOMBRE) ====================
async function register() {
  const msg = document.getElementById('msg');
  const name = document.getElementById('registerName')?.value.trim() || '';
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const registerButton = document.querySelector('#registerForm .btn-primary');

  try {
    // Validaciones
    if (!name || !email || !password) {
      showMessage(msg, '⚠️ Completa todos los campos (nombre, email y contraseña)', 'error');
      return;
    }
    if (name.length < 2) {
      showMessage(msg, '⚠️ El nombre debe tener al menos 2 caracteres', 'error');
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

    setButtonLoading(registerButton, true);
    showMessage(msg, '🔄 Creando cuenta...', 'info');

    // 1. Registrar usuario en Auth con metadata del nombre
    const { data, error } = await window.AquaTrack.db.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (error) {
      const errorMessages = {
        'User already registered': 'Este email ya está registrado'
      };
      throw new Error(errorMessages[error.message] || error.message);
    }

    if (data.user) {
      // 2. Actualizar/Asegurar perfil con el nombre
      try {
        await window.AquaTrack.db
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email.toLowerCase(),
            role: 'viewer',
            full_name: name
          });
      } catch (profileError) {
        console.warn('No se pudo guardar nombre en profiles:', profileError);
      }

      showMessage(msg, '✅ Cuenta creada exitosamente. Ya puedes iniciar sesión.', 'success');

      // Limpiar campos
      const nameInput = document.getElementById('registerName');
      if (nameInput) nameInput.value = '';
      document.getElementById('registerEmail').value = '';
      document.getElementById('registerPassword').value = '';

      // Cambiar a login después de 2 segundos
      setTimeout(() => {
        document.getElementById('btnLogin').click();
      }, 2000);
    }

  } catch (error) {
    console.error('❌ Error en registro:', error);
    showMessage(msg, `❌ ${error.message}`, 'error');
  } finally {
    setButtonLoading(registerButton, false);
  }
}

// ==================== SESSION & REDIRECT ====================
async function redirectBySession(session) {
  if (!session?.user) return;

  try {
    console.log('🔄 Verificando perfil para:', session.user.email);

    // Intentar cargar perfil
    let profile = null;
    try {
      const { data, error } = await window.AquaTrack.db
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        profile = data;
      }
    } catch (e) {
      console.warn('Error cargando perfil:', e.message);
    }

    // Si no hay perfil, crearlo
    if (!profile) {
      console.log('Creando perfil para nuevo usuario...');
      const metaName = session.user.user_metadata?.full_name || 
                       session.user.email?.split('@')[0] || 
                       'Usuario';

      try {
        await window.AquaTrack.db.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email,
          role: 'viewer',
          full_name: metaName
        });
        
        profile = {
          role: 'viewer',
          email: session.user.email,
          full_name: metaName
        };
      } catch (insertError) {
        console.error('Error creando perfil:', insertError);
        window.location.href = window.AquaTrack.config.ROUTES.VIEWER;
        return;
      }
    }

    console.log('✅ Perfil:', profile.role, '| Nombre:', profile.full_name);

    // Guardar en sessionStorage
    sessionStorage.setItem('userRole', profile.role);
    sessionStorage.setItem('userEmail', profile.email || session.user.email);
    sessionStorage.setItem('userName', profile.full_name || '');

    // Redirección por rol
    const roleRoutes = {
      admin: window.AquaTrack.config.ROUTES.ADMIN,
      seller: window.AquaTrack.config.ROUTES.SELLER,
      viewer: window.AquaTrack.config.ROUTES.VIEWER
    };

    const target = roleRoutes[profile.role] || roleRoutes.viewer;
    const current = window.location.pathname.split('/').pop();

    // Solo redirigir si estamos en login o en ruta incorrecta
    if (current === 'index.html' || current === '' || current === 'dashboard.html') {
      window.location.href = target;
    }

  } catch (error) {
    console.error('❌ Error en redirección:', error);
    const msg = document.getElementById('msg');
    if (msg) {
      showMessage(msg, 'Error al cargar el perfil. Intenta de nuevo.', 'error');
    }
  }
}

// ==================== LOGOUT ====================
async function logout() {
  try {
    await window.AquaTrack.db.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('supabase.auth.token');
    window.location.href = window.AquaTrack.config.ROUTES.LOGIN;
  } catch (error) {
    window.location.href = window.AquaTrack.config.ROUTES.LOGIN;
  }
}

// ==================== INICIALIZACIÓN ====================
(async () => {
  try {
    await waitForSupabase();
    
    // Listener de cambios de auth
    window.AquaTrack.db.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state:', event);
      
      if (event === 'SIGNED_IN') {
        redirectBySession(session);
      }
      
      if (event === 'SIGNED_OUT') {
        sessionStorage.clear();
        localStorage.removeItem('supabase.auth.token');
        const current = window.location.pathname.split('/').pop();
        if (current !== 'index.html' && current !== '') {
          window.location.href = window.AquaTrack.config.ROUTES.LOGIN;
        }
      }
    });

    // Verificar sesión existente
    const { data: { session } } = await window.AquaTrack.db.auth.getSession();
    if (session) {
      console.log('🔍 Sesión existente encontrada');
      await redirectBySession(session);
    } else {
      console.log('ℹ️ No hay sesión activa');
    }
  } catch (error) {
    console.error('❌ Error al inicializar auth:', error);
  }
})();

// ==================== EXPORTAR FUNCIONES ====================
window.login = login;
window.register = register;
window.logout = logout;
window.showMessage = showMessage;