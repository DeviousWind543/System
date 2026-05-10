/**
 * seller.js - Panel Vendedor AquaTrack DW
 * Stats automáticas + Gráficos + CRUD + Cliente + Observaciones
 * Protegido por roleGuard
 */
(async function() {
  'use strict';

  const user = await verifyPanelAccess(['seller']);
  if (!user) return;

  console.log('✅ Vendedor autenticado:', user.email);

  let userName = user.email?.split('@')[0] || 'Vendedor';
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

  function getFechaLocal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  document.getElementById('userRoleDisplay').textContent = 'Vendedor';
  document.getElementById('sidebarUserName').textContent = userName;
  document.getElementById('sidebarUserEmail').textContent = userEmail;
  document.getElementById('userAvatar').textContent = userInitial;
  
  const fechaInput = document.getElementById('fechaVenta');
  if (fechaInput) fechaInput.value = getFechaLocal();

  if (typeof lucide !== 'undefined') lucide.createIcons();

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btnMenu = document.getElementById('btnMenu');
  let currentSection = 'sell';
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
    const sidebarLink = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (sidebarLink) sidebarLink.classList.add('active');
    
    document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
    const bottomLink = document.querySelector(`.bottom-nav-item[data-section="${section}"]`);
    if (bottomLink) bottomLink.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) sectionEl.classList.add('active');
    
    // Cerrar sidebar en móvil solo si está abierto, sin forzar toggle
    if (window.innerWidth < 1200 && sidebarOpen) {
      closeSidebar();
    }
    
    if (section === 'sales') loadSalesTable();
    if (section === 'inventory') loadInventory();
    if (section === 'analytics') setTimeout(() => renderCharts(), 150);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.section);
    });
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      // Solo navega, no togglea el sidebar
      navigateTo(item.dataset.section);
    });
  });

  let cachedSales = [];

  async function loadAllData() {
    try {
      const { data: sales, error } = await window.AquaTrack.db
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(500);

      if (error) throw error;
      cachedSales = sales || [];
      updateStatsCards();
      document.getElementById('sidebarSaleCount').textContent = cachedSales.length;
      if (currentSection === 'sales') loadSalesTable();
      if (currentSection === 'analytics') setTimeout(() => renderCharts(), 150);
    } catch (e) {
      console.error('Error loadAllData:', e);
      toast.error('Error al cargar datos');
    }
  }

  function updateStatsCards() {
    const elTotal = document.getElementById('statTotalSales');
    if (elTotal) elTotal.textContent = cachedSales.length;

    const totalRevenue = cachedSales.reduce((s, v) => s + (v.total || 0), 0);
    const elRevenue = document.getElementById('statRevenue');
    if (elRevenue) {
      elRevenue.textContent = '$' + totalRevenue.toLocaleString('es-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    }

    const today = new Date().toDateString();
    const todaySales = cachedSales.filter(s => new Date(s.date).toDateString() === today);
    const elToday = document.getElementById('statToday');
    if (elToday) elToday.textContent = todaySales.length;
    
    const trendToday = document.getElementById('trendToday');
    if (trendToday) {
      trendToday.textContent = todaySales.length > 0 ? '↑ Hoy' : '→ Sin ventas hoy';
      trendToday.className = todaySales.length > 0 ? 'stat-trend up' : 'stat-trend stable';
    }

    const uniqueProducts = [...new Set(cachedSales.map(s => s.description).filter(Boolean))];
    const elProducts = document.getElementById('statProducts');
    if (elProducts) elProducts.textContent = uniqueProducts.length;
  }

window.agregarVenta = async function() {
    const tamano = document.getElementById('tamanoBidon');
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const precio = parseFloat(document.getElementById('precio').value);
    const fecha = document.getElementById('fechaVenta').value;
    const cliente = document.getElementById('cliente').value.trim();
    const observaciones = document.getElementById('observaciones').value.trim();

    if (!tamano.value) { toast.warning('Selecciona un producto'); tamano.focus(); return; }
    if (!cantidad || cantidad < 1) { toast.warning('Ingresa una cantidad válida'); document.getElementById('cantidad').focus(); return; }
    if (!precio || precio <= 0) { toast.warning('Ingresa un precio válido'); document.getElementById('precio').focus(); return; }

    const loading = toast.loading('Registrando venta...');
    
    try {
      const total = cantidad * precio;
      const fechaISO = fecha ? new Date(fecha + 'T12:00:00').toISOString() : new Date().toISOString();
      const descripcion = tamano.options[tamano.selectedIndex].text;

      const { error } = await window.AquaTrack.db.from('sales').insert([{
        user_id: user.id,
        quantity: cantidad,
        price: precio,
        total: total,
        date: fechaISO,
        description: descripcion,
        client: cliente || null,
        notes: observaciones || null
      }]);

      if (error) throw error;

      loading.close();
      toast.success(`${cantidad} ${descripcion} registrado(s)`);

      // Descontar del inventario (SIEMPRE)
      await discountFromInventory(descripcion, cantidad);

      // Verificar retorno de bidones 20L
      const checkRetorno = document.getElementById('checkRetorno');
      if (checkRetorno && checkRetorno.checked && tamano.value === 'Bidón 20L') {
        await returnToInventory(descripcion, cantidad);
        checkRetorno.checked = false;
      }

      tamano.value = '';
      document.getElementById('cantidad').value = '';
      document.getElementById('precio').value = '';
      document.getElementById('cliente').value = '';
      document.getElementById('observaciones').value = '';
      document.getElementById('fechaVenta').value = getFechaLocal();
      document.getElementById('divCheckRetorno').style.display = 'none';

      await loadAllData();
    } catch (e) {
      loading.close();
      toast.error('Error: ' + e.message);
    }
  };

window.editarVenta = function(id, qty, price, date, desc, cliente, observaciones) {
    const descStr = desc || '';
    const clienteStr = cliente || '';
    const obsStr = observaciones || '';
    const fechaFormateada = date ? new Date(date).toISOString().split('T')[0] : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(15,23,42,0.5);
      backdrop-filter:blur(4px);display:flex;align-items:center;
      justify-content:center;z-index:9999;padding:16px;
    `;

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px;">
          <i data-lucide="pencil" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"></i>Editar Venta
        </h3>
        
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Producto</label>
          <select id="editTamano" style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;background:#f8fafc;">
            <option value="Bidón 20L" ${descStr.includes('20L')?'selected':''}>Bidón 20 Litros</option>
            <option value="Bidón 12L" ${descStr.includes('12L')?'selected':''}>Bidón 12 Litros</option>
            <option value="Bidón 5L" ${descStr.includes('5L')?'selected':''}>Bidón 5 Litros</option>
            <option value="Bidón 1L" ${descStr.includes('1L')?'selected':''}>Bidón 1 Litro</option>
            <option value="Botella 500ml" ${descStr.includes('500ml') && !descStr.includes('Pacas')?'selected':''}>Botella 500 ml</option>
            <option value="Pacas de botellas 500ml" ${descStr.includes('Pacas')?'selected':''}>Pacas de botellas 500ml (24 unid.)</option>
          </select>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Cantidad</label>
            <input type="number" id="editCantidad" value="${qty}" min="1" style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Precio ($)</label>
            <input type="number" id="editPrecio" value="${price}" min="0.01" step="0.01" style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
          </div>
        </div>
        
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Cliente</label>
          <input type="text" id="editCliente" value="${clienteStr.replace(/'/g, "&#39;")}" placeholder="Nombre del cliente" style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
        </div>
        
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Fecha</label>
          <input type="date" id="editFecha" value="${fechaFormateada}" style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;">
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Observaciones</label>
          <textarea id="editObservaciones" rows="2" placeholder="Notas adicionales..." style="width:100%;padding:10px 13px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;resize:vertical;background:#f8fafc;">${obsStr.replace(/'/g, "&#39;")}</textarea>
        </div>
        
        <div style="display:flex;gap:10px;">
          <button id="cancelEdit" style="flex:1;padding:12px;border-radius:10px;border:1px solid #e2e8f0;background:#f1f5f9;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button id="saveEdit" style="flex:1;padding:12px;border-radius:10px;border:none;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-family:inherit;">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);

    const cerrar = () => { overlay.remove(); document.body.style.overflow = ''; };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
    document.getElementById('cancelEdit').addEventListener('click', cerrar);

      document.getElementById('saveEdit').addEventListener('click', async () => {
      const nTamano = document.getElementById('editTamano').value;
      const nCant = parseInt(document.getElementById('editCantidad').value);
      const nPrecio = parseFloat(document.getElementById('editPrecio').value);
      const nFecha = document.getElementById('editFecha').value;
      const nCliente = document.getElementById('editCliente').value.trim();
      const nObs = document.getElementById('editObservaciones').value.trim();

      if (!nCant || nCant < 1) { toast.warning('Cantidad inválida'); return; }
      if (!nPrecio || nPrecio <= 0) { toast.warning('Precio inválido'); return; }

      const loading = toast.loading('Actualizando...');
      
      try {
        // Ajustar inventario según cambios
        await adjustInventoryOnEdit(descStr, qty, nTamano, nCant);

        const { error } = await window.AquaTrack.db.from('sales').update({
          quantity: nCant, 
          price: nPrecio, 
          total: nCant * nPrecio,
          date: nFecha ? new Date(nFecha + 'T12:00:00').toISOString() : new Date().toISOString(),
          description: nTamano,
          client: nCliente || null,
          notes: nObs || null
        }).eq('id', id);

        if (error) throw error;

        loading.close();
        toast.success('Venta actualizada - Inventario ajustado');
        cerrar();
        await loadAllData();
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
      }
    });
  };

window.eliminarVenta = function(id) {
    // Buscar la venta en caché para obtener sus datos
    const venta = cachedSales.find(s => s.id === id);
    
    modal.delete('¿Estás seguro de eliminar esta venta? Los items regresarán al inventario.', async () => {
      const loading = toast.loading('Eliminando...');
      try {
        // Revertir el descuento del inventario ANTES de eliminar
        if (venta) {
          await revertDiscountFromInventory(venta.description, venta.quantity);
        }
        
        const { error } = await window.AquaTrack.db.from('sales').delete().eq('id', id);
        if (error) throw error;
        
        cachedSales = cachedSales.filter(s => s.id !== id);
        
        loading.close();
        toast.success('Venta eliminada - Items devueltos al inventario');
        updateStatsCards();
        loadSalesTable();
      } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
      }
    });
  };

  function loadSalesTable() {
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;

    if (!cachedSales.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><span style="font-size:40px;display:block;margin-bottom:8px;">📋</span><p>No hay ventas registradas aún</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = cachedSales.slice(0, 200).map(v => {
      const d = new Date(v.date);
      const desc = (v.description || 'Bidón').replace(/'/g, "\\'");
      const cliente = (v.client || '').replace(/'/g, "\\'");
      const obs = (v.notes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `<tr>
        <td data-label="Fecha">${d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</td>
        <td data-label="Producto"><span class="tag">${v.description || 'Bidón'}</span></td>
        <td data-label="Cant">${v.quantity}</td>
        <td data-label="Precio">$${v.price.toFixed(2)}</td>
        <td data-label="Total" style="font-weight:700;color:#3b82f6;">$${v.total.toFixed(2)}</td>
        <td data-label="Cliente" style="font-size:12px;">${v.client || '—'}</td>
        <td data-label="Obs." style="font-size:11px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${obs}">${v.notes || '—'}</td>
        <td data-label="">
          <button class="btn-icon edit" onclick="editarVenta('${v.id}',${v.quantity},${v.price},'${v.date}','${desc}','${cliente}','${obs}')" title="Editar">
            <i data-lucide="pencil" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn-icon delete" onclick="eliminarVenta('${v.id}')" title="Eliminar">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
    
    if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);
  }

  let salesChart = null;
  let productsChart = null;

  function renderCharts() {
    const sales = cachedSales;
    
    const ctx1 = document.getElementById('salesChart');
    if (ctx1) {
      if (salesChart) salesChart.destroy();
      if (sales.length === 0) return;

      const byDay = {};
      sales.forEach(v => {
        const key = new Date(v.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
        byDay[key] = (byDay[key] || 0) + v.total;
      });

      const labels = Object.keys(byDay).slice(-14);
      const values = Object.values(byDay).slice(-14);

      salesChart = new Chart(ctx1, {
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

    const ctx2 = document.getElementById('productsChart');
    if (ctx2) {
      if (productsChart) productsChart.destroy();
      if (sales.length === 0) return;

      const byProduct = {};
      sales.forEach(v => {
        const name = v.description || 'Otro';
        byProduct[name] = (byProduct[name] || 0) + v.quantity;
      });

      const pLabels = Object.keys(byProduct);
      const pValues = Object.values(byProduct);
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    
    const filtered = cachedSales.filter(s => new Date(s.date).toISOString().split('T')[0] === filterDate);
    
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Sin ventas en esta fecha</p></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(v => {
        const d = new Date(v.date);
        const desc = (v.description || 'Bidón').replace(/'/g, "\\'");
        const cliente = (v.client || '').replace(/'/g, "\\'");
        const obs = (v.notes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<tr>
          <td data-label="Fecha">${d.toLocaleDateString('es-ES')}</td>
          <td data-label="Producto"><span class="tag">${v.description||'Bidón'}</span></td>
          <td data-label="Cant">${v.quantity}</td>
          <td data-label="Precio">$${v.price.toFixed(2)}</td>
          <td data-label="Total" style="font-weight:700;color:#3b82f6;">$${v.total.toFixed(2)}</td>
          <td data-label="Cliente" style="font-size:12px;">${v.client || '—'}</td>
          <td data-label="Obs." style="font-size:11px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${obs}">${v.notes || '—'}</td>
          <td data-label="">
            <button class="btn-icon edit" onclick="editarVenta('${v.id}',${v.quantity},${v.price},'${v.date}','${desc}','${cliente}','${obs}')" title="Editar">
              <i data-lucide="pencil" style="width:14px;height:14px;"></i>
            </button>
            <button class="btn-icon delete" onclick="eliminarVenta('${v.id}')" title="Eliminar">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </td>
        </tr>`;
      }).join('');
      
      if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);
    }
  };

  window.exportarVentas = () => toast.info('Exportación en desarrollo', 'info', 3000);
  window.actualizarGraficos = () => renderCharts();

  window.addSale = window.agregarVenta;
  window.editSale = window.editarVenta;
  window.deleteSale = window.eliminarVenta;

  await loadAllData();
  navigateTo('sell');
  setInterval(loadAllData, 60000);

  console.log('✅ Panel Vendedor listo');
})();