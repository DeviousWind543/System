/**
 * config.js
 * Configuración centralizada del sistema AquaTrack DW
 * @version 2.0.0
 */

// Namespace global para evitar colisiones
window.AquaTrack = window.AquaTrack || {};

// Congelamos la configuración para evitar modificaciones accidentales
window.AquaTrack.config = Object.freeze({
  // ✅ TUS CREDENCIALES REALES DE SUPABASE
  SUPABASE_URL: 'https://jglsbwrmqknsegvuiyes.supabase.co',
  SUPABASE_KEY: 'sb_publishable_YToISTqTz1bHjmd3Bt4FaA_vEF_OLfA',
  
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
  try {
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase SDK no está cargado. Verifica el CDN en el HTML.');
    }
    
    // Crear cliente con el nuevo formato de API key
    window.AquaTrack.db = supabase.createClient(
      window.AquaTrack.config.SUPABASE_URL,
      window.AquaTrack.config.SUPABASE_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'X-Client-Info': `${window.AquaTrack.config.APP_NAME}/${window.AquaTrack.config.APP_VERSION}`
          }
        }
      }
    );
    
    console.log('✅ AquaTrack DW inicializado correctamente');
    console.log('🔗 URL:', window.AquaTrack.config.SUPABASE_URL);
    console.log('🔑 Key format:', window.AquaTrack.config.SUPABASE_KEY.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('❌ Error al inicializar Supabase:', error.message);
    const msgBox = document.getElementById('msg');
    if (msgBox) {
      msgBox.textContent = 'Error de configuración. Recarga la página.';
      msgBox.style.color = 'red';
    }
  }
})();