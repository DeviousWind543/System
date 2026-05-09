/**
 * admin.js - Panel Admin AquaTrack DW
 * CRUD completo: Usuarios + Ventas con edición
 */
(async function() {
  'use strict';

  // ==================== VERIFICAR AUTENTICACIÓN ====================
  const { data: { user } } = await window.AquaTrack.db.auth.getUser();
  if (!user) { location.href = 'index.html'; return; }

  console.log('✅ Admin autenticado:', user.email);

  // ==================== OBTENER DATOS DEL PERFIL ====================
  let userName = user.email?.split('@')[0] || 'Admin';
  let userEmail = user.email;
  let userInitial = (user.email?.[0] || 'A').toUpperCase();

  try {
    const { data: profileData } = await window.AquaTrack.db
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (profileData) {
      userName = profileData.full_name || userName;
      userEmail = profileData.email || userEmail;
      userInitial = (userName?.charAt(0) || 'A').toUpperCase();
    }
  } catch (e) {
    console.warn('No se pudo cargar perfil, usando datos de auth:', e.message);
  }

  // ==================== INICIALIZAR UI ====================
  document.getElementById('userRoleDisplay').textContent = 'Admin';
  document.getElementById('sidebarUserName').textContent = userName;
  document.getElementById('sidebarUserEmail').textContent = userEmail;
  document.getElementById('userAvatar').textContent = userInitial;
  
  const settingsEmail = document.getElementById('settingsEmail');
  if (settingsEmail) settingsEmail.value = userEmail;

  // ==================== SIDEBAR ====================
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btnMenu = document.getElementById('btnMenu');
  let currentSection = 'users';
  let sidebarOpen = false;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    sidebarOpen = true;
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
    document.body.style.overflow = '';
    sidebarOpen = false;
  }

  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebarOpen ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarOpen) closeSidebar();
  });

  // ==================== NAVEGACIÓN ====================
  function navigateTo(section) {
    currentSection = section;
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
    
    document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.bottom-nav-item[data-section="${section}"]`)?.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');
    
    closeSidebar();
    
    if (section === 'users') loadUsersTable();
    if (section === 'sales') loadSalesTable();
    if (section === 'analytics') setTimeout(() => renderChartsFromCache(), 150);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.section); });
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.section));
  });

  // ==================== CACHE ====================
  let cachedUsers = [];
  let cachedSales = [];
  let cachedProfiles = {};

  // ==================== CARGAR DATOS ====================
  async function loadAllData() {
    try {
      const [usersResult, salesResult] = await Promise.all([
        window.AquaTrack.db.from('profiles').select('*').order('created_at', { ascending: false }),
        window.AquaTrack.db.from('sales').select('*').order('date', { ascending: false }).limit(500)
      ]);

      if (usersResult.error) throw usersResult.error;
      if (salesResult.error) throw salesResult.error;

      cachedUsers = usersResult.data || [];
      cachedSales = salesResult.data || [];

      const userIds = [...new Set(cachedSales.map(s => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await window.AquaTrack.db
          .from('profiles').select('id, email').in('id', userIds);
        cachedProfiles = {};
        (profiles || []).forEach(p => { cachedProfiles[p.id] = p.email; });
      }

      updateStatsCards();
      document.getElementById('sidebarUserCount').textContent = cachedUsers.length;
      document.getElementById('sidebarSaleCount').textContent = cachedSales.length;

      if (currentSection === 'users') loadUsersTable();
      if (currentSection === 'sales') loadSalesTable();

    } catch (e) {
      console.error('Error loadAllData:', e);
      toast.error('Error al cargar datos');
    }
  }

  function updateStatsCards() {
    document.getElementById('statUsers').textContent = cachedUsers.length;
    document.getElementById('statSales').textContent = cachedSales.length;
    document.getElementById('statProducts').textContent = [...new Set(cachedSales.map(s => s.description).filter(Boolean))].length;
    
    const total = cachedSales.reduce((s, v) => s + (v.total || 0), 0);
    document.getElementById('statRevenue').textContent = '$' + total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ==================== TABLA DE USUARIOS ====================
  function loadUsersTable() {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    if (!cachedUsers.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span style="font-size:40px;">👥</span><p>No hay usuarios</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = cachedUsers.map(u => `
      <tr>
        <td data-label="Usuario">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#3b82f6;">${(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}</div>
            <strong>${u.full_name || u.email?.split('@')[0] || 'Usuario'}</strong>
          </div>
        </td>
        <td data-label="Email" style="font-size:12px;color:#64748b;">${u.email || 'Sin email'}</td>
        <td data-label="Rol">
          <span class="tag" style="
            ${u.role==='admin'?'background:#fee2e2;color:#991b1b;':''}
            ${u.role==='seller'?'background:#dbeafe;color:#1e40af;':''}
            ${u.role==='viewer'?'background:#d1fae5;color:#065f46;':''}
          ">${u.role==='admin'?'Admin':u.role==='seller'?'Vendedor':'Visualizador'}</span>
        </td>
        <td data-label="Registro">${new Date(u.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</td>
        <td data-label="Acción">
          <div style="display:flex;gap:6px;align-items:center;">
            <select class="form-input form-input-sm" onchange="cambiarRolUsuario('${u.id}', this.value)" 
                    ${u.id===user.id?'disabled':''} style="width:auto;padding:5px 24px 5px 8px;font-size:11px;">
              <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
              <option value="seller" ${u.role==='seller'?'selected':''}>Vendedor</option>
              <option value="viewer" ${u.role==='viewer'?'selected':''}>Visualizador</option>
            </select>
            ${u.id !== user.id ? `<button class="btn-icon delete" onclick="eliminarUsuario('${u.id}')" title="Eliminar usuario" style="width:28px;height:28px;font-size:12px;">✕</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ==================== CAMBIAR ROL ====================
  window.cambiarRolUsuario = async function(userId, newRole) {
    const roleNames = { admin: 'Admin', seller: 'Vendedor', viewer: 'Visualizador' };
    
    modal.confirm(`¿Cambiar rol a <strong>${roleNames[newRole]}</strong>?`, 'Cambiar Rol', 'warning').then(async (confirmed) => {
      if (!confirmed) { loadUsersTable(); return; }
      
      const loading = toast.loading('Actualizando...');
      try {
        const { error } = await window.AquaTrack.db.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;

        const idx = cachedUsers.findIndex(u => u.id === userId);
        if (idx !== -1) cachedUsers[idx].role = newRole;

        loading.close();
        toast.success('Rol actualizado');
        loadUsersTable();
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
        loadUsersTable();
      }
    });
  };

  window.changeRole = window.cambiarRolUsuario;

  // ==================== ELIMINAR USUARIO ====================
  window.eliminarUsuario = function(userId) {
    modal.delete('¿Eliminar este usuario permanentemente? Se eliminarán también sus ventas.', async () => {
      const loading = toast.loading('Eliminando usuario...');
      try {
        await window.AquaTrack.db.from('sales').delete().eq('user_id', userId);
        const { error } = await window.AquaTrack.db.from('profiles').delete().eq('id', userId);
        if (error) throw error;

        cachedUsers = cachedUsers.filter(u => u.id !== userId);
        cachedSales = cachedSales.filter(s => s.user_id !== userId);

        loading.close();
        toast.success('Usuario eliminado');
        updateStatsCards();
        loadUsersTable();
        document.getElementById('sidebarUserCount').textContent = cachedUsers.length;
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
      }
    });
  };

  // ==================== TABLA DE VENTAS ====================
  function loadSalesTable() {
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;

    if (!cachedSales.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span style="font-size:40px;">💰</span><p>No hay ventas</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = cachedSales.slice(0, 200).map(v => {
      const d = new Date(v.date);
      const sellerEmail = cachedProfiles[v.user_id] || 'N/A';
      const desc = (v.description || 'Bidón').replace(/'/g, "\\'");
      return `<tr>
        <td data-label="Fecha">${d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}</td>
        <td data-label="Producto"><span class="tag">💧 ${v.description||'Bidón'}</span></td>
        <td data-label="Cant">${v.quantity}</td>
        <td data-label="Precio">$${v.price.toFixed(2)}</td>
        <td data-label="Total" style="font-weight:700;color:#3b82f6;">$${v.total.toFixed(2)}</td>
        <td data-label="Vendedor" style="font-size:12px;">${sellerEmail.split('@')[0]}</td>
        <td data-label="">
          <button class="btn-icon edit" onclick="editarVentaAdmin('${v.id}',${v.quantity},${v.price},'${v.date}','${desc}')" title="Editar">✎</button>
          <button class="btn-icon delete" onclick="eliminarVentaAdmin('${v.id}')" title="Eliminar">✕</button>
        </td>
      </tr>`;
    }).join('');
  }

  // ==================== EDITAR VENTA (ADMIN) ====================
  window.editarVentaAdmin = function(id, qty, price, date, desc) {
    const descStr = desc || '';
    const fechaFormateada = date ? new Date(date).toISOString().split('T')[0] : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;
    `;

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px;">✏️ Editar Venta</h3>
        
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Producto</label>
          <select id="editTamano" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;background:#f8fafc;">
            <option value="Bidón 20L" ${descStr.includes('20L')?'selected':''}>Bidón 20L</option>
            <option value="Bidón 12L" ${descStr.includes('12L')?'selected':''}>Bidón 12L</option>
            <option value="Bidón 5L" ${descStr.includes('5L')?'selected':''}>Bidón 5L</option>
            <option value="Bidón 1L" ${descStr.includes('1L')?'selected':''}>Bidón 1L</option>
            <option value="Botella 500ml" ${descStr.includes('500ml')?'selected':''}>Botella 500ml</option>
          </select>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Cantidad</label>
            <input type="number" id="editCantidad" value="${qty}" min="1" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Precio ($)</label>
            <input type="number" id="editPrecio" value="${price}" min="0.01" step="0.01" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
          </div>
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Fecha</label>
          <input type="date" id="editFecha" value="${fechaFormateada}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
        </div>
        
        <div style="display:flex;gap:10px;">
          <button id="cancelEdit" style="flex:1;padding:12px;border-radius:10px;border:1px solid #e2e8f0;background:#f1f5f9;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button id="saveEdit" style="flex:1;padding:12px;border-radius:10px;border:none;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-family:inherit;">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const cerrar = () => { overlay.remove(); document.body.style.overflow = ''; };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
    document.getElementById('cancelEdit').addEventListener('click', cerrar);

    document.getElementById('saveEdit').addEventListener('click', async () => {
      const nTamano = document.getElementById('editTamano').value;
      const nCant = parseInt(document.getElementById('editCantidad').value);
      const nPrecio = parseFloat(document.getElementById('editPrecio').value);
      const nFecha = document.getElementById('editFecha').value;

      if (!nCant || nCant < 1) { toast.warning('Cantidad inválida'); return; }
      if (!nPrecio || nPrecio <= 0) { toast.warning('Precio inválido'); return; }

      const loading = toast.loading('Actualizando...');
      try {
        const { error } = await window.AquaTrack.db.from('sales').update({
          quantity: nCant, price: nPrecio, total: nCant * nPrecio,
          date: nFecha ? new Date(nFecha + 'T12:00:00').toISOString() : new Date().toISOString(),
          description: nTamano
        }).eq('id', id);
        if (error) throw error;

        const idx = cachedSales.findIndex(s => s.id === id);
        if (idx !== -1) {
          cachedSales[idx].quantity = nCant;
          cachedSales[idx].price = nPrecio;
          cachedSales[idx].total = nCant * nPrecio;
          cachedSales[idx].description = nTamano;
          if (nFecha) cachedSales[idx].date = new Date(nFecha + 'T12:00:00').toISOString();
        }

        loading.close();
        toast.success('Venta actualizada');
        cerrar();
        updateStatsCards();
        loadSalesTable();
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
      }
    });
  };

  // ==================== ELIMINAR VENTA ====================
  window.eliminarVentaAdmin = function(id) {
    modal.delete('¿Eliminar esta venta?', async () => {
      const loading = toast.loading('Eliminando...');
      try {
        const { error } = await window.AquaTrack.db.from('sales').delete().eq('id', id);
        if (error) throw error;

        cachedSales = cachedSales.filter(s => s.id !== id);
        loading.close();
        toast.success('Venta eliminada');
        updateStatsCards();
        loadSalesTable();
        document.getElementById('sidebarSaleCount').textContent = cachedSales.length;
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
      }
    });
  };

  // ==================== GRÁFICOS ====================
  let salesChart = null, productsChart = null;

  function renderChartsFromCache() {
    if (!cachedSales.length) return;

    const byDay = {};
    cachedSales.forEach(v => {
      const key = new Date(v.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
      byDay[key] = (byDay[key] || 0) + v.total;
    });

    const ctx1 = document.getElementById('salesChart')?.getContext('2d');
    if (ctx1) {
      if (salesChart) salesChart.destroy();
      const labels = Object.keys(byDay).slice(-14);
      const values = Object.values(byDay).slice(-14);
      if (labels.length > 0) {
        salesChart = new Chart(ctx1, {
          type: 'bar',
          data: { labels, datasets: [{ data: values, backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
          }
        });
      }
    }

    const byProduct = {};
    cachedSales.forEach(v => {
      const name = v.description || 'Otro';
      byProduct[name] = (byProduct[name] || 0) + v.quantity;
    });

    const ctx2 = document.getElementById('productsChart')?.getContext('2d');
    if (ctx2) {
      if (productsChart) productsChart.destroy();
      const pLabels = Object.keys(byProduct);
      const pValues = Object.values(byProduct);
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      if (pLabels.length > 0) {
        productsChart = new Chart(ctx2, {
          type: 'doughnut',
          data: { labels: pLabels, datasets: [{ data: pValues, backgroundColor: colors.slice(0, pLabels.length), borderWidth: 0 }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 11 } } } }
          }
        });
      }
    }
  }

  // ==================== BÚSQUEDA ====================
  document.getElementById('globalSearch')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.content-section.active tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  // ==================== FILTRO FECHA VENTAS ====================
  window.filtrarVentasAdmin = function() {
    const filterDate = document.getElementById('filterDate')?.value;
    const tbody = document.getElementById('salesTable');
    if (!filterDate) { loadSalesTable(); return; }
    
    const filtered = cachedSales.filter(s => new Date(s.date).toISOString().split('T')[0] === filterDate);
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>Sin ventas en esta fecha</p></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(v => {
        const d = new Date(v.date);
        const sellerEmail = cachedProfiles[v.user_id] || 'N/A';
        const desc = (v.description || 'Bidón').replace(/'/g, "\\'");
        return `<tr>
          <td data-label="Fecha">${d.toLocaleDateString('es-ES')}</td>
          <td data-label="Producto"><span class="tag">💧 ${v.description||'Bidón'}</span></td>
          <td data-label="Cant">${v.quantity}</td>
          <td data-label="Precio">$${v.price.toFixed(2)}</td>
          <td data-label="Total" style="font-weight:700;color:#3b82f6;">$${v.total.toFixed(2)}</td>
          <td data-label="Vendedor">${sellerEmail.split('@')[0]}</td>
          <td data-label="">
            <button class="btn-icon edit" onclick="editarVentaAdmin('${v.id}',${v.quantity},${v.price},'${v.date}','${desc}')">✎</button>
            <button class="btn-icon delete" onclick="eliminarVentaAdmin('${v.id}')">✕</button>
          </td>
        </tr>`;
      }).join('');
    }
  };

  window.exportUsers = () => toast.info('Exportación en desarrollo', 'info', 3000);
  window.exportSales = () => toast.info('Exportación en desarrollo', 'info', 3000);

  // ==================== INICIAR ====================
  await loadAllData();
  navigateTo('users');
  setInterval(loadAllData, 60000);

  console.log('✅ Panel Admin listo - CRUD completo activado');
})();