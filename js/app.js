/**
 * app.js
 * Dashboard principal de AquaTrack DW
 * Panel de administración general (sin roles específicos)
 */

(async function() {
  'use strict';
  
  // ==================== AUTH CHECK ====================
  const user = await requireAuth();
  if (!user) return;
  
  console.log('✅ Dashboard cargado para:', user.email);
  
  // ==================== ADD SALE ====================
  window.addSale = async function() {
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('price');
    
    const quantity = parseInt(quantityInput.value);
    const price = parseFloat(priceInput.value);
    
    // Validación
    if (!quantity || !price || quantity <= 0 || price <= 0) {
      showToast('⚠️ Completa todos los campos con valores válidos', 'warning');
      return;
    }
    
    try {
      const total = quantity * price;
      
      const { data, error } = await window.AquaTrack.db
        .from('sales')
        .insert([{
          user_id: user.id,
          quantity: quantity,
          price: price,
          total: total,
          date: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      showToast('✅ Venta registrada correctamente', 'success');
      
      // Limpiar campos
      quantityInput.value = '';
      priceInput.value = '';
      
      // Recargar tabla
      await loadSales();
      
    } catch (error) {
      console.error('Error al registrar venta:', error);
      showToast('❌ Error al registrar la venta', 'error');
    }
  };
  
  // ==================== LOAD SALES ====================
  async function loadSales() {
    const tableBody = document.getElementById('salesTable');
    const chartCanvas = document.getElementById('salesChart');
    
    // Mostrar estado de carga
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;"><div class="loading-spinner"></div><p style="margin-top:10px;color:#666;">Cargando ventas...</p></td></tr>';
    
    try {
      const { data: sales, error } = await window.AquaTrack.db
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .limit(100); // Límite para rendimiento
      
      if (error) throw error;
      
      if (!sales || sales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#666;">📊 No hay ventas registradas aún</td></tr>';
        renderChart({}); // Limpiar gráfico
        return;
      }
      
      // Agrupar por día para el gráfico
      const salesByDay = {};
      
      // Renderizar tabla
      tableBody.innerHTML = sales.map(sale => {
        const saleDate = new Date(sale.date);
        const dayKey = saleDate.toLocaleDateString();
        
        salesByDay[dayKey] = (salesByDay[dayKey] || 0) + sale.total;
        
        return `
          <tr>
            <td>${saleDate.toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</td>
            <td>${sale.quantity}</td>
            <td>$${sale.price.toFixed(2)}</td>
            <td><strong>$${sale.total.toFixed(2)}</strong></td>
          </tr>
        `;
      }).join('');
      
      // Renderizar gráfico
      renderChart(salesByDay);
      
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#e53e3e;">❌ Error al cargar ventas: ${error.message}</td></tr>`;
    }
  }
  
  // ==================== RENDER CHART ====================
  let salesChart = null;
  
  function renderChart(data) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfico anterior
    if (salesChart) {
      salesChart.destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (labels.length === 0) {
      // Mostrar mensaje en canvas vacío
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos para mostrar', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }
    
    salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventas Diarias ($)',
          data: values,
          backgroundColor: values.map(() => {
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(0, 198, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 74, 173, 0.8)');
            return gradient;
          }),
          borderColor: 'rgba(0, 74, 173, 1)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { family: "'Segoe UI', sans-serif", size: 14 },
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` $${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // ==================== TOAST NOTIFICATION ====================
  function showToast(message, type = 'info') {
    // Remover toasts anteriores
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:20px;">${icons[type] || 'ℹ️'}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remover después del tiempo configurado
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, window.AquaTrack.config.TOAST_DURATION);
  }
  
  // ==================== INITIAL LOAD ====================
  console.log('🔄 Cargando datos iniciales...');
  await loadSales();
  
  // Recargar datos cada 30 segundos
  setInterval(loadSales, 30000);
  
  console.log('✅ Dashboard listo');
  
})();