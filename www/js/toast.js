/**
 * =============================================
 *  AQUATRACK DW - SISTEMA DE TOAST PREMIUM
 *  Autónomo · Profesional · Sin dependencias
 * =============================================
 * 
 * Uso:
 *   showToast('Mensaje', 'success')
 *   showToast('Error', 'error')
 *   showToast('Atención', 'warning')
 *   showToast('Info', 'info')
 * 
 * Atajos:
 *   toast.success('Mensaje')
 *   toast.error('Mensaje')
 *   toast.warning('Mensaje')
 *   toast.info('Mensaje')
 *   toast.loading('Cargando...')  → Devuelve instancia para cerrar manualmente
 *   toast.dismissAll()            → Cierra todos los toasts
 */

(function() {
  'use strict';

  // ==================== CONFIGURACIÓN ====================
  const CONFIG = {
    maxToasts: 5,           // Máximo de toasts visibles simultáneamente
    defaultDuration: 4000,   // Duración por defecto en ms
    gap: 10,                 // Espacio entre toasts
    position: 'bottom-right' // bottom-right, bottom-left, top-right, top-left, bottom-center, top-center
  };

  // ==================== TIPOS DE TOAST ====================
  const TYPES = {
    success: {
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#10b981"/>
              <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      bg: '#f0fdf4',
      border: '#10b981',
      text: '#065f46',
      title: '¡Completado!'
    },
    error: {
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#ef4444"/>
              <path d="M7 7l6 6M13 7l-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      bg: '#fef2f2',
      border: '#ef4444',
      text: '#991b1b',
      title: 'Error'
    },
    warning: {
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#f59e0b"/>
              <path d="M10 6v5M10 13.5v.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      bg: '#fffbeb',
      border: '#f59e0b',
      text: '#92400e',
      title: 'Atención'
    },
    info: {
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#3b82f6"/>
              <path d="M10 9v5M10 6v.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
      bg: '#eff6ff',
      border: '#3b82f6',
      text: '#1e40af',
      title: 'Información'
    },
    loading: {
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" stroke="#3b82f6" stroke-opacity="0.25" stroke-width="2"/>
              <path d="M10 2a8 8 0 017.5 5" stroke="#3b82f6" stroke-width="2" stroke-linecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>`,
      bg: '#eff6ff',
      border: '#3b82f6',
      text: '#1e40af',
      title: 'Procesando...'
    }
  };

  // ==================== CREAR CONTENEDOR ====================
  const container = document.createElement('div');
  container.id = 'toastContainer';

  // Posiciones disponibles
  const positions = {
    'bottom-right':  { bottom: '20px', right: '16px',  alignItems: 'flex-end' },
    'bottom-left':   { bottom: '20px', left: '16px',   alignItems: 'flex-start' },
    'top-right':     { top: '20px',    right: '16px',  alignItems: 'flex-end' },
    'top-left':      { top: '20px',    left: '16px',   alignItems: 'flex-start' },
    'bottom-center': { bottom: '20px', left: '50%',    transform: 'translateX(-50%)', alignItems: 'center' },
    'top-center':    { top: '20px',    left: '50%',    transform: 'translateX(-50%)', alignItems: 'center' }
  };

  const pos = positions[CONFIG.position] || positions['bottom-right'];

  // Estilos del contenedor (inline, sin dependencia de CSS externo)
  container.style.position = 'fixed';
  container.style.zIndex = '99999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = CONFIG.gap + 'px';
  container.style.pointerEvents = 'none';
  container.style.maxWidth = '420px';
  container.style.width = 'calc(100% - 32px)';
  container.style.bottom = pos.bottom || 'auto';
  container.style.top = pos.top || 'auto';
  container.style.right = pos.right || 'auto';
  container.style.left = pos.left || 'auto';
  container.style.transform = pos.transform || 'none';
  container.style.alignItems = pos.alignItems || 'flex-end';

  document.body.appendChild(container);

  // ==================== CLASE TOAST ====================
  class Toast {
    constructor(message, type = 'info', duration = CONFIG.defaultDuration) {
      this.message = message;
      this.type = type;
      this.duration = duration;
      this.element = null;
      this.progressBar = null;
      this.timeout = null;
      this.remainingTime = duration;
      this.startTime = null;
      this.paused = false;

      this._create();
      this._show();
    }

    // Crear elemento DOM
    _create() {
      const config = TYPES[this.type] || TYPES.info;

      this.element = document.createElement('div');

      // Estilos inline
      this.element.style.cssText = `
        pointer-events: all;
        background: ${config.bg};
        border: 1px solid ${config.border}30;
        border-left: 4px solid ${config.border};
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 13px;
        color: ${config.text};
        opacity: 0;
        transform: translateX(40px);
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
        max-width: 100%;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      `;

      // HTML interno
      this.element.innerHTML = `
        <span style="flex-shrink:0;line-height:1;margin-top:1px;">
          ${config.icon}
        </span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:11px;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.8px;opacity:0.8;">
            ${config.title}
          </div>
          <div style="font-size:13px;line-height:1.5;word-wrap:break-word;">
            ${this._escapeHtml(this.message)}
          </div>
        </div>
        <button 
          class="toast-close-btn"
          style="
            flex-shrink:0;
            width:26px;
            height:26px;
            border:none;
            background:rgba(0,0,0,0.05);
            border-radius:8px;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:16px;
            color:#666;
            transition:all 0.2s ease;
            padding:0;
            line-height:1;
            font-family:inherit;
          "
          onmouseover="this.style.background='rgba(0,0,0,0.12)';this.style.color='#333';"
          onmouseout="this.style.background='rgba(0,0,0,0.05)';this.style.color='#666';"
        >×</button>
        
        <!-- Barra de progreso -->
        <div style="
          position:absolute;
          bottom:0;
          left:4px;
          right:0;
          height:3px;
          background:rgba(0,0,0,0.03);
          border-radius:0 0 12px 0;
          overflow:hidden;
        ">
          <div class="toast-progress" style="
            height:100%;
            width:100%;
            background:${config.border};
            border-radius:0 0 12px 0;
            transition:width 0.1s linear;
          "></div>
        </div>
      `;

      this.progressBar = this.element.querySelector('.toast-progress');

      // Evento cerrar botón
      const closeBtn = this.element.querySelector('.toast-close-btn');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      // Pausar al hover
      this.element.addEventListener('mouseenter', () => this._pause());
      this.element.addEventListener('mouseleave', () => this._resume());

      // Click en el toast lo cierra (opcional)
      // this.element.addEventListener('click', () => this.close());
    }

    // Mostrar toast
    _show() {
      // Limitar cantidad de toasts
      const allToasts = container.querySelectorAll(':scope > div');
      while (allToasts.length >= CONFIG.maxToasts) {
        const first = allToasts[0];
        first.style.opacity = '0';
        first.style.transform = 'translateX(40px)';
        setTimeout(() => {
          if (first.parentNode) first.remove();
        }, 350);
      }

      container.appendChild(this.element);

      // Animación de entrada
      requestAnimationFrame(() => {
        this.element.style.opacity = '1';
        this.element.style.transform = 'translateX(0)';
      });

      // Si no es loading, iniciar temporizador
      if (this.type !== 'loading') {
        this._startTimer();
      } else {
        // Ocultar barra de progreso para loading
        if (this.progressBar) {
          this.progressBar.parentElement.style.display = 'none';
        }
      }
    }

    // Iniciar temporizador de cierre
    _startTimer() {
      this.startTime = Date.now();
      this.remainingTime = this.duration;

      if (this.progressBar) {
        this.progressBar.style.transition = `width ${this.duration}ms linear`;
        this.progressBar.style.width = '0%';
      }

      this.timeout = setTimeout(() => this.close(), this.duration);
    }

    // Pausar temporizador (hover)
    _pause() {
      if (this.paused || this.type === 'loading') return;
      this.paused = true;

      const elapsed = Date.now() - this.startTime;
      this.remainingTime -= elapsed;

      clearTimeout(this.timeout);

      // Congelar barra
      if (this.progressBar) {
        const currentWidth = parseFloat(getComputedStyle(this.progressBar).width);
        const parentWidth = parseFloat(getComputedStyle(this.progressBar.parentElement).width);
        const percentage = (currentWidth / parentWidth) * 100;

        this.progressBar.style.transition = 'none';
        this.progressBar.style.width = percentage + '%';
      }
    }

    // Reanudar temporizador
    _resume() {
      if (!this.paused || this.type === 'loading') return;
      this.paused = false;

      if (this.progressBar) {
        this.progressBar.style.transition = `width ${this.remainingTime}ms linear`;
        this.progressBar.style.width = '0%';
      }

      this.startTime = Date.now();
      this.timeout = setTimeout(() => this.close(), this.remainingTime);
    }

    // Cerrar toast
    close() {
      if (!this.element || this.element.classList.contains('toast-removing')) return;

      clearTimeout(this.timeout);
      this.element.classList.add('toast-removing');

      this.element.style.opacity = '0';
      this.element.style.transform = 'translateX(40px)';
      this.element.style.pointerEvents = 'none';

      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.remove();
        }
      }, 350);
    }

    // Escapar HTML para prevenir XSS
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // ==================== API PÚBLICA ====================

  /**
   * Muestra un toast
   * @param {string} message - Texto del mensaje
   * @param {string} type - success | error | warning | info | loading
   * @param {number} [duration] - Duración en ms (default: 4000)
   * @returns {Toast} Instancia del toast
   * 
   * @example
   * showToast('Venta registrada', 'success')
   * showToast('Error al guardar', 'error', 5000)
   * const t = showToast('Cargando...', 'loading')
   * t.close() // Cerrar manualmente
   */
  window.showToast = function(message, type = 'info', duration) {
    const dur = duration || CONFIG.defaultDuration;
    return new Toast(message, type, dur);
  };

  // ==================== ATALOS DE CONVENIENCIA ====================

  window.toast = {
    /**
     * Toast de éxito
     * @example toast.success('Venta registrada')
     */
    success: (msg, dur) => window.showToast(msg, 'success', dur),

    /**
     * Toast de error
     * @example toast.error('No se pudo guardar')
     */
    error: (msg, dur) => window.showToast(msg, 'error', dur),

    /**
     * Toast de advertencia
     * @example toast.warning('Campos incompletos')
     */
    warning: (msg, dur) => window.showToast(msg, 'warning', dur),

    /**
     * Toast informativo
     * @example toast.info('Cargando datos...')
     */
    info: (msg, dur) => window.showToast(msg, 'info', dur),

    /**
     * Toast de carga (no se cierra automáticamente)
     * @example
     * const loading = toast.loading('Procesando...')
     * // Después de completar:
     * loading.close()
     * toast.success('¡Listo!')
     */
    loading: (msg) => window.showToast(msg, 'loading', 0),

    /**
     * Cierra todos los toasts inmediatamente
     * @example toast.dismissAll()
     */
    dismissAll: () => {
      const all = container.querySelectorAll(':scope > div');
      all.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(40px)';
        el.style.pointerEvents = 'none';
        setTimeout(() => {
          if (el.parentNode) el.remove();
        }, 350);
      });
    }
  };

  // Exponer en namespace global
  window.AquaTrack = window.AquaTrack || {};
  window.AquaTrack.showToast = window.showToast;
  window.AquaTrack.toast = window.toast;

  console.log('✅ Sistema de toasts AquaTrack inicializado');

})();