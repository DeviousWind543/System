/**
 * =============================================
 *  AQUATRACK DW - SISTEMA DE MODALES PREMIUM
 *  Reemplaza alert(), confirm(), prompt()
 *  Autónomo · Profesional · Sin dependencias
 * =============================================
 * 
 * Uso:
 *   modal.alert('Mensaje')
 *   modal.confirm('¿Estás seguro?', () => { ... })
 *   modal.prompt('Nuevo valor:', valorActual, (nuevoValor) => { ... })
 *   modal.custom({ title, content, buttons, onClose })
 */

(function() {
  'use strict';

  // ==================== ESTILOS INLINE ====================
  const styles = `
    .modal-overlay-aw {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      padding: 16px;
      animation: modalFadeIn 0.2s ease;
      font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    
    .modal-dialog-aw {
      background: #ffffff;
      border-radius: 20px;
      padding: 28px 24px 20px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.1);
      animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid #e2e8f0;
    }
    
    .modal-icon-aw {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px;
    }
    
    .modal-icon-aw.warning { background: #fef3c7; color: #f59e0b; }
    .modal-icon-aw.danger { background: #fee2e2; color: #ef4444; }
    .modal-icon-aw.success { background: #d1fae5; color: #10b981; }
    .modal-icon-aw.info { background: #dbeafe; color: #3b82f6; }
    
    .modal-title-aw {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: -0.3px;
    }
    
    .modal-message-aw {
      font-size: 14px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .modal-input-aw {
      width: 100%;
      padding: 12px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
      margin-bottom: 20px;
      background: #f8fafc;
    }
    
    .modal-input-aw:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
      background: #fff;
    }
    
    .modal-buttons-aw {
      display: flex;
      gap: 10px;
    }
    
    .modal-btn-aw {
      flex: 1;
      padding: 12px 16px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      border: none;
      text-align: center;
      letter-spacing: 0.2px;
    }
    
    .modal-btn-aw:active {
      transform: scale(0.97);
    }
    
    .modal-btn-cancel-aw {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    
    .modal-btn-cancel-aw:hover {
      background: #e2e8f0;
    }
    
    .modal-btn-primary-aw {
      background: #3b82f6;
      color: white;
      box-shadow: 0 4px 12px rgba(59,130,246,0.3);
    }
    
    .modal-btn-primary-aw:hover {
      background: #2563eb;
    }
    
    .modal-btn-danger-aw {
      background: #ef4444;
      color: white;
      box-shadow: 0 4px 12px rgba(239,68,68,0.3);
    }
    
    .modal-btn-danger-aw:hover {
      background: #dc2626;
    }
    
    .modal-btn-success-aw {
      background: #10b981;
      color: white;
      box-shadow: 0 4px 12px rgba(16,185,129,0.3);
    }
    
    .modal-btn-success-aw:hover {
      background: #059669;
    }
    
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes modalSlideIn {
      from { opacity: 0; transform: scale(0.92) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    @keyframes modalSlideOut {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.92) translateY(10px); }
    }
  `;

  // Inyectar estilos
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // ==================== FUNCIONES DEL MODAL ====================

  /**
   * Crea y muestra un modal
   */
  function createModal({ title, message, icon, type, input, buttons, onClose }) {
    // Eliminar modal anterior si existe
    const existing = document.querySelector('.modal-overlay-aw');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay-aw';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog-aw';

    let html = '';
    
    // Icono
    if (icon || type) {
      const iconType = type || 'info';
      const icons = {
        warning: '⚠️',
        danger: '🗑️',
        success: '✅',
        info: 'ℹ️'
      };
      html += `<div class="modal-icon-aw ${iconType}">${icon || icons[iconType]}</div>`;
    }

    // Título
    if (title) {
      html += `<div class="modal-title-aw">${title}</div>`;
    }

    // Mensaje
    if (message) {
      html += `<div class="modal-message-aw">${message}</div>`;
    }

    // Input (para prompt)
    if (input) {
      html += `<input type="${input.type || 'text'}" class="modal-input-aw" id="modalInputAw" 
                value="${input.value || ''}" placeholder="${input.placeholder || ''}" 
                ${input.autofocus ? 'autofocus' : ''}>`;
    }

    // Botones
    if (buttons && buttons.length > 0) {
      html += '<div class="modal-buttons-aw">';
      buttons.forEach(btn => {
        const btnClass = btn.class || 'modal-btn-cancel-aw';
        html += `<button class="modal-btn-aw ${btnClass}" data-action="${btn.action || ''}">${btn.text}</button>`;
      });
      html += '</div>';
    }

    dialog.innerHTML = html;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeModal(null);
      }
    });

    // Eventos de botones
    const btnElements = dialog.querySelectorAll('.modal-btn-aw');
    btnElements.forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.getAttribute('data-action');
        let value = null;

        if (input) {
          value = document.getElementById('modalInputAw')?.value;
        }

        closeModal({ action, value });
      });
    });

    // Enter en input
    if (input) {
      const inputEl = document.getElementById('modalInputAw');
      if (inputEl) {
        setTimeout(() => inputEl.focus(), 100);
        inputEl.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            closeModal({ action: 'confirm', value: inputEl.value });
          }
        });
      }
    }

    // Escape para cerrar
    function handleEscape(e) {
      if (e.key === 'Escape') {
        closeModal(null);
      }
    }
    document.addEventListener('keydown', handleEscape);

    function closeModal(result) {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';

      // Animación de salida
      dialog.style.animation = 'modalSlideOut 0.2s ease forwards';
      overlay.style.animation = 'modalFadeIn 0.2s ease reverse forwards';

      setTimeout(() => {
        overlay.remove();
        if (onClose) onClose(result);
      }, 200);
    }

    return { overlay, close: closeModal };
  }

  // ==================== API PÚBLICA ====================

  window.modal = {
    /**
     * Modal de alerta (reemplaza alert())
     * @example modal.alert('Venta registrada correctamente')
     * @example modal.alert('Error', 'error')
     */
    alert: function(message, type = 'success') {
      const titles = {
        success: '¡Completado!',
        error: 'Error',
        warning: 'Atención',
        info: 'Información'
      };

      const buttonClass = {
        success: 'modal-btn-success-aw',
        error: 'modal-btn-danger-aw',
        warning: 'modal-btn-primary-aw',
        info: 'modal-btn-primary-aw'
      };

      return new Promise((resolve) => {
        createModal({
          title: titles[type] || 'Aviso',
          message: message,
          type: type,
          buttons: [
            { text: 'Aceptar', class: buttonClass[type] || 'modal-btn-primary-aw', action: 'ok' }
          ],
          onClose: (result) => resolve(result)
        });
      });
    },

    /**
     * Modal de confirmación (reemplaza confirm())
     * @example modal.confirm('¿Eliminar esta venta?', () => { ... })
     * @example const result = await modal.confirm('¿Continuar?')
     */
    confirm: function(message, title = 'Confirmar', type = 'warning') {
      return new Promise((resolve) => {
        createModal({
          title: title,
          message: message,
          type: type,
          buttons: [
            { text: 'Cancelar', class: 'modal-btn-cancel-aw', action: 'cancel' },
            { text: 'Confirmar', class: type === 'danger' ? 'modal-btn-danger-aw' : 'modal-btn-primary-aw', action: 'confirm' }
          ],
          onClose: (result) => {
            resolve(result && result.action === 'confirm');
          }
        });
      });
    },

    /**
     * Modal para eliminar (estilo peligro)
     * @example modal.delete('¿Eliminar esta venta?', async () => { ... })
     */
    delete: function(message, onConfirm) {
      createModal({
        title: 'Eliminar',
        message: message || '¿Estás seguro de eliminar? Esta acción no se puede deshacer.',
        type: 'danger',
        icon: '🗑️',
        buttons: [
          { text: 'Cancelar', class: 'modal-btn-cancel-aw', action: 'cancel' },
          { text: 'Eliminar', class: 'modal-btn-danger-aw', action: 'confirm' }
        ],
        onClose: (result) => {
          if (result && result.action === 'confirm' && onConfirm) {
            onConfirm();
          }
        }
      });
    },

    /**
     * Modal con input (reemplaza prompt())
     * @example modal.prompt('Nueva cantidad:', valorActual, (nuevoValor) => { ... })
     * @example const valor = await modal.prompt('Ingresa el precio:')
     */
    prompt: function(message, defaultValue = '', title = 'Editar') {
      return new Promise((resolve) => {
        createModal({
          title: title,
          message: message,
          input: {
            type: 'text',
            value: defaultValue,
            placeholder: 'Escribe aquí...',
            autofocus: true
          },
          buttons: [
            { text: 'Cancelar', class: 'modal-btn-cancel-aw', action: 'cancel' },
            { text: 'Guardar', class: 'modal-btn-primary-aw', action: 'confirm' }
          ],
          onClose: (result) => {
            if (result && result.action === 'confirm') {
              resolve(result.value);
            } else {
              resolve(null);
            }
          }
        });
      });
    },

    /**
     * Modal personalizado
     * @example modal.custom({ title: 'Hola', message: 'Mensaje', buttons: [...] })
     */
    custom: function(options) {
      return new Promise((resolve) => {
        createModal({
          ...options,
          onClose: (result) => {
            if (options.onClose) options.onClose(result);
            resolve(result);
          }
        });
      });
    },

    /**
     * Cierra cualquier modal abierto
     */
    close: function() {
      const existing = document.querySelector('.modal-overlay-aw');
      if (existing) {
        existing.style.animation = 'modalFadeIn 0.15s ease reverse forwards';
        const dialog = existing.querySelector('.modal-dialog-aw');
        if (dialog) dialog.style.animation = 'modalSlideOut 0.15s ease forwards';
        setTimeout(() => existing.remove(), 150);
        document.body.style.overflow = '';
      }
    }
  };

  // Exponer globalmente
  window.AquaTrack = window.AquaTrack || {};
  window.AquaTrack.modal = window.modal;

  console.log('✅ Sistema de modales AquaTrack inicializado');

})();