/**
 * capacitor-adapter.js
 * Adaptador para persistencia de sesión en WebView de Capacitor
 * Supabase guarda tokens en localStorage, Capacitor los preserva
 */
(function() {
  // Capacitor preserva localStorage entre sesiones de la app
  // Pero añadimos un respaldo con Capacitor Preferences
  const setupPersistence = async () => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      
      // Guardar sesión en Preferences como respaldo
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        originalSetItem.call(localStorage, key, value);
        if (key.includes('supabase')) {
          Preferences.set({ key, value }).catch(() => {});
        }
      };
      
      // Recuperar sesión desde Preferences si localStorage está vacío
      const { value } = await Preferences.get({ key: 'supabase.auth.token' });
      if (value && !localStorage.getItem('supabase.auth.token')) {
        localStorage.setItem('supabase.auth.token', value);
      }
      
      console.log('✅ Persistencia de sesión configurada');
    } catch (e) {
      console.warn('Preferences plugin no disponible, usando solo localStorage');
    }
  };

  if (window.Capacitor) {
    setupPersistence();
  }
})();