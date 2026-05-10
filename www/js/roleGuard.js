/**
 * roleGuard.js
 * Sistema de protección de rutas por rol
 * Bloquea el acceso a paneles que no corresponden al rol del usuario
 * @version 1.0.0
 */

async function verifyPanelAccess(expectedRoles) {
  try {
    // Verificar que Supabase esté disponible
    if (!window.AquaTrack || !window.AquaTrack.db) {
      console.warn('⏳ Esperando conexión a Supabase...');
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (window.AquaTrack && window.AquaTrack.db) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    const { data: { user } } = await window.AquaTrack.db.auth.getUser();
    
    if (!user) {
      console.warn('🔒 No hay sesión activa, redirigiendo al login...');
      window.location.href = 'index.html';
      return false;
    }

    const { data: profile, error } = await window.AquaTrack.db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('❌ Error al cargar perfil:', error);
      window.location.href = 'index.html';
      return false;
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!expectedRoles.includes(profile.role)) {
      console.warn(`🚫 Acceso denegado. Rol: ${profile.role}, Roles permitidos: ${expectedRoles.join(', ')}`);
      
      // Mapeo de roles a sus rutas correctas
      const roleRoutes = {
        admin: 'admin.html',
        seller: 'seller.html',
        viewer: 'viewer.html'
      };

      const targetRoute = roleRoutes[profile.role];
      
      // Solo redirigir si no estamos ya en la página correcta
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      
      if (targetRoute && currentPath !== targetRoute) {
        console.log(`↪️ Redirigiendo a: ${targetRoute}`);
        window.location.href = targetRoute;
      }
      
      return false;
    }

    console.log(`✅ Acceso permitido: ${user.email} (${profile.role})`);
    return user;

  } catch (error) {
    console.error('❌ Error en guard de seguridad:', error);
    window.location.href = 'index.html';
    return false;
  }
}

// Exponer globalmente
window.verifyPanelAccess = verifyPanelAccess;