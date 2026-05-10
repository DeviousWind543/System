/**
 * users.js
 * Panel de administración de usuarios para Admin
 * Gestión de roles y usuarios
 */

(async function() {
  'use strict';
  
  // ==================== AUTH CHECK ====================
  const user = await requireAuth(['admin']);
  if (!user) return;
  
  console.log('✅ Panel de administración cargado:', user.email);
  
  // ==================== LOAD USERS ====================
  window.loadUsers = async function() {
    const tableBody = document.getElementById('usersTable');
    
    try {
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;"><div class="loading-spinner"></div></td></tr>';
      
      const { data: users, error } = await window.AquaTrack.db
        .from('profiles')
        .select('*')
        .order('email');
      
      if (error) throw error;
      
      if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#666;">👥 No hay usuarios registrados</td></tr>';
        return;
      }
      
      const roles = window.AquaTrack.config.ROLES;
      
      // Escapar HTML para prevenir XSS
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
      
      tableBody.innerHTML = users.map(u => `
        <tr>
          <td>${escapeHtml(u.email || 'Sin email')}</td>
          <td>
            <span class="user-role" style="
              display: inline-block;
              padding: 4px 12px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              ${u.role === 'admin' ? 'background: #e53e3e; color: white;' : ''}
              ${u.role === 'seller' ? 'background: #00c6ff; color: white;' : ''}
              ${u.role === 'viewer' ? 'background: #38a169; color: white;' : ''}
            ">
              ${escapeHtml(u.role)}
            </span>
          </td>
          <td>
            <select 
              class="role-select" 
              onchange="changeRole('${u.id}', this.value)"
              ${u.id === user.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}
            >
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="seller" ${u.role === 'seller' ? 'selected' : ''}>Seller</option>
              <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
            </select>
          </td>
        </tr>
      `).join('');
      
    } catch (error) {
      console.error('Error loading users:', error);
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:30px;color:#e53e3e;">❌ Error: ${error.message}</td></tr>`;
    }
  };
  
  // ==================== CHANGE ROLE ====================
  window.changeRole = async function(userId, newRole) {
    // Confirmación visual
    if (!confirm(`¿Cambiar el rol de este usuario a "${newRole}"?`)) {
      await loadUsers(); // Revertir el select
      return;
    }
    
    try {
      const { error } = await window.AquaTrack.db
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast(`✅ Rol actualizado a "${newRole}" correctamente`, 'success');
      await loadUsers();
      
    } catch (error) {
      console.error('Error changing role:', error);
      showToast('❌ Error al cambiar el rol', 'error');
      await loadUsers(); // Revertir cambios en UI
    }
  };
  
  // ==================== TOAST ====================
  function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:20px;">${icons[type]}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  
  // ==================== CHECK PROFILE TABLE ====================
  // Asegurar que la tabla profiles existe y tiene datos
  async function ensureProfileTable() {
    try {
      const { error } = await window.AquaTrack.db
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('⚠️ Error verificando tabla profiles:', error);
        showToast('Error al acceder a la tabla de perfiles. Verifica la base de datos.', 'error');
      }
    } catch (error) {
      console.error('Error checking profiles table:', error);
    }
  }
  
  // ==================== INIT ====================
  await ensureProfileTable();
  await loadUsers();
  
  // Auto-refresh cada 60 segundos
  setInterval(loadUsers, 60000);
  
  console.log('✅ Panel de administración listo');
  
})();