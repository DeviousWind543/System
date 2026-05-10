/**
 * viewer.js - Panel Visualizador AquaTrack DW
 * Solo lectura · Resumen + Ventas + Cliente + Observaciones
 * Protegido por roleGuard
 */
(async function() {
  'use strict';

  const user = await verifyPanelAccess(['viewer']);
  if (!user) return;

  console.log('✅ Visualizador autenticado:', user.email);

  let userName = user.email?.split('@')[0] || 'Visualizador';
  let userEmail = user.email;
  let userInitial = (user.email?.[0] || 'V').toUpperCase();

  try {
    const { data: profileData } = await window.AquaTrack.db
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    if (profileData) {
      userName = profileData.full_name || userName;
      userEmail = profileData.email || userEmail;
      userInitial = (userName?.charAt(0) || 'V').toUpperCase();
    }
  } catch (e) {
    console.warn('No se pudo cargar perfil:', e.message);
  }

  document.getElementById('userRoleDisplay').textContent = 'Visualizador';
  document.getElementById('sidebarUserName').textContent = userName;
  document.getElementById('sidebarUserEmail').textContent = userEmail;
  document.getElementById('userAvatar').textContent = userInitial;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btnMenu = document.getElementById('btnMenu');
  let currentSection = 'overview';
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

  function navigateTo(section) {
    currentSection = section;
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add('active');
    
    document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.bottom-nav-item[data-section="${section}"]`)?.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');
    
    // Cerrar sidebar en móvil solo si está abierto, sin forzar toggle
    if (window.innerWidth < 1200 && sidebarOpen) {
      closeSidebar();
    }
    
    if (section === 'sales') loadSalesTable();
    if (section === 'inventory') loadInventory();
    if (section === 'overview') setTimeout(() => renderCharts(), 150);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.section);
    });
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      // Solo navega, no abre/cierra el sidebar
      navigateTo(item.dataset.section);
    });
  });

  let cachedSales = [];
  let cachedProfiles = {};

  async function loadAllData() {
    try {
      const { data: sales, error } = await window.AquaTrack.db
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .limit(500);

      if (error) throw error;
      cachedSales = sales || [];

      const userIds = [...new Set(cachedSales.map(s => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await window.AquaTrack.db
          .from('profiles').select('id, email').in('id', userIds);
        cachedProfiles = {};
        (profiles || []).forEach(p => { cachedProfiles[p.id] = p.email; });
      }

      updateStatsCards();
      document.getElementById('sidebarSaleCount').textContent = cachedSales.length;

      if (currentSection === 'sales') loadSalesTable();
    } catch (e) {
      console.error('Error:', e);
      toast.error('Error al cargar datos');
    }
  }

  function updateStatsCards() {
    document.getElementById('statTotalSales').textContent = cachedSales.length;
    
    const total = cachedSales.reduce((s, v) => s + (v.total || 0), 0);
    document.getElementById('statRevenue').textContent = '$' + total.toLocaleString('es-ES', { 
      minimumFractionDigits: 2, maximumFractionDigits: 2 
    });
    
    const today = new Date().toDateString();
    const todaySales = cachedSales.filter(s => new Date(s.date).toDateString() === today);
    document.getElementById('statToday').textContent = todaySales.length;
    
    const trendToday = document.getElementById('trendToday');
    if (trendToday) {
      trendToday.textContent = todaySales.length > 0 ? '↑ Hoy' : '→ Sin ventas';
      trendToday.className = todaySales.length > 0 ? 'stat-trend up' : 'stat-trend stable';
    }
    
    document.getElementById('statProducts').textContent = 
      [...new Set(cachedSales.map(s => s.description).filter(Boolean))].length;
  }

  function loadSalesTable() {
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;

    if (!cachedSales.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><span style="font-size:40px;display:block;margin-bottom:8px;">📋</span><p>No hay ventas registradas</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = cachedSales.slice(0, 200).map(v => {
      const d = new Date(v.date);
      const seller = (cachedProfiles[v.user_id] || 'N/A').split('@')[0];
      return `<tr>
        <td data-label="Fecha">${d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</td>
        <td data-label="Producto"><span class="tag">${v.description || 'Bidón'}</span></td>
        <td data-label="Cantidad">${v.quantity}</td>
        <td data-label="Precio">$${v.price.toFixed(2)}</td>
        <td data-label="Total" style="font-weight:700;color:#10b981;">$${v.total.toFixed(2)}</td>
        <td data-label="Cliente" style="font-size:12px;">${v.client || '—'}</td>
        <td data-label="Vendedor" style="font-size:12px;">${seller}</td>
        <td data-label="Obs." style="font-size:11px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(v.notes || '').replace(/"/g, '&quot;')}">${v.notes || '—'}</td>
      </tr>`;
    }).join('');
  }

  let overviewSalesChart = null;
  let overviewProductsChart = null;

  function renderCharts() {
    if (!cachedSales.length) return;

    const byDay = {};
    cachedSales.forEach(v => {
      const key = new Date(v.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
      byDay[key] = (byDay[key] || 0) + v.total;
    });

    const ctx1 = document.getElementById('overviewSalesChart')?.getContext('2d');
    if (ctx1) {
      if (overviewSalesChart) overviewSalesChart.destroy();
      const labels = Object.keys(byDay).slice(-14);
      const values = Object.values(byDay).slice(-14);
      if (labels.length > 0) {
        overviewSalesChart = new Chart(ctx1, {
          type: 'bar',
          data: { labels, datasets: [{ data: values, backgroundColor: '#10b981', borderRadius: 6, borderSkipped: false }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => '$' + v } },
              x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } }
            }
          }
        });
      }
    }

    const byProduct = {};
    cachedSales.forEach(v => {
      const name = v.description || 'Otro';
      byProduct[name] = (byProduct[name] || 0) + v.quantity;
    });

    const ctx2 = document.getElementById('overviewProductsChart')?.getContext('2d');
    if (ctx2) {
      if (overviewProductsChart) overviewProductsChart.destroy();
      const pLabels = Object.keys(byProduct);
      const pValues = Object.values(byProduct);
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      
      if (pLabels.length > 0) {
        overviewProductsChart = new Chart(ctx2, {
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

  // Buscador local en la sección ventas
  document.getElementById('salesSearch')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#section-sales tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  window.filtrarPorFecha = function() {
    const filterDate = document.getElementById('filterDate')?.value;
    const tbody = document.getElementById('salesTable');
    if (!filterDate) { loadSalesTable(); return; }
    
    const filtered = cachedSales.filter(s => 
      new Date(s.date).toISOString().split('T')[0] === filterDate
    );
    
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Sin ventas en esta fecha</p></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(v => {
        const d = new Date(v.date);
        const seller = (cachedProfiles[v.user_id] || 'N/A').split('@')[0];
        return `<tr>
          <td data-label="Fecha">${d.toLocaleDateString('es-ES')}</td>
          <td data-label="Producto"><span class="tag">${v.description || 'Bidón'}</span></td>
          <td data-label="Cantidad">${v.quantity}</td>
          <td data-label="Precio">$${v.price.toFixed(2)}</td>
          <td data-label="Total" style="font-weight:700;color:#10b981;">$${v.total.toFixed(2)}</td>
          <td data-label="Cliente" style="font-size:12px;">${v.client || '—'}</td>
          <td data-label="Vendedor">${seller}</td>
          <td data-label="Obs." style="font-size:11px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(v.notes || '').replace(/"/g, '&quot;')}">${v.notes || '—'}</td>
        </tr>`;
      }).join('');
    }
  };

  window.exportarVentas = () => toast.info('Exportación en desarrollo', 'info', 3000);

  await loadAllData();
  navigateTo('overview');
  setInterval(loadAllData, 60000);

  console.log('✅ Panel Visualizador listo');
})();