/**
 * config.template.js
 * Template para inyección de credenciales
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
},
  
  TOAST_DURATION: 4000
});