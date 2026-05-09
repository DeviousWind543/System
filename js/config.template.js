/**
 * config.template.js
 * Template para inyección de credenciales (GitHub Actions)
 * O usar directamente como config.js en desarrollo local
 */
window.AquaTrack = window.AquaTrack || {};

window.AquaTrack.config = Object.freeze({
  SUPABASE_URL: '{{SUPABASE_URL}}',
  SUPABASE_KEY: '{{SUPABASE_KEY}}',
  
  APP_NAME: 'AquaTrack DW',
  APP_VERSION: '2.0.0',
  
  ROLES: {
    ADMIN: 'admin',
    SELLER: 'seller',
    VIEWER: 'viewer'
  },
  
  ROUTES: {
    LOGIN: 'index.html',
    ADMIN: 'admin.html',
    SELLER: 'seller.html',
    VIEWER: 'viewer.html',
    DASHBOARD: 'dashboard.html'
  },
  
  TOAST_DURATION: 4000
});

// Inicializar cliente Supabase
(function initSupabase() {
  function createClient() {
    if (typeof supabase === 'undefined') {
      console.warn('⏳ Supabase SDK no cargado aún, esperando...');
      return false;
    }
    
    try {
      window.AquaTrack.db = supabase.createClient(
        window.AquaTrack.config.SUPABASE_URL,
        window.AquaTrack.config.SUPABASE_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );
      
      console.log('✅ Supabase inicializado correctamente');
      window.dispatchEvent(new Event('supabase:ready'));
      return true;
    } catch (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
  }
  
  // Intentar inmediatamente
  if (!createClient()) {
    // Reintentar cuando el DOM esté listo
    window.addEventListener('DOMContentLoaded', () => {
      if (!window.AquaTrack.db) {
        createClient();
      }
    });
  }
})();