/**
 * native-bridge.js - Funcionalidades nativas para AquaTrack DW
 * Usa Capacitor global sin imports dinámicos
 */
(function() {

const isNativeApp = () => {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
};

// Esperar a que Capacitor esté listo
async function waitForCapacitor() {
    return new Promise((resolve) => {
        if (typeof Capacitor !== 'undefined' && Capacitor.Plugins) {
            resolve();
            return;
        }
        document.addEventListener('deviceready', resolve, { once: true });
        document.addEventListener('DOMContentLoaded', () => {
            // Timeout de seguridad
            setTimeout(resolve, 1000);
        }, { once: true });
    });
}

// ==================== PERMISOS ====================
async function checkAndRequestCameraPermission() {
    if (!isNativeApp()) return true;
    try {
        const Camera = Capacitor.Plugins.Camera;
        if (!Camera) {
            console.error('Plugin Camera no disponible');
            return false;
        }
        const status = await Camera.checkPermissions();
        console.log('📷 Estado permiso:', status.camera);
        if (status.camera === 'granted') return true;
        const request = await Camera.requestPermissions();
        console.log('📷 Solicitado:', request.camera);
        return request.camera === 'granted';
    } catch (e) {
        console.error('Error permisos:', e);
        return false;
    }
}

// ==================== BOTÓN RETROCEDER ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (!isNativeApp()) return;
    await waitForCapacitor();
    try {
        Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
            const overlays = document.querySelectorAll('[style*="z-index:9999"], [style*="z-index:99999"], .modal-overlay-aw');
            if (overlays.length > 0) {
                overlays[overlays.length-1].remove();
                document.body.style.overflow = '';
                return;
            }
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                document.getElementById('sidebarOverlay')?.classList.remove('visible');
                document.body.style.overflow = '';
                return;
            }
            if (!canGoBack) {
                if (confirm('¿Deseas salir de AquaTrack?')) Capacitor.Plugins.App.exitApp();
            } else {
                window.history.back();
            }
        });
    } catch (e) {
        console.log('backButton no disponible:', e.message);
    }
});

// ==================== TOMAR FOTO ====================
async function takePhoto() {
    if (!isNativeApp()) return null;
    const Camera = Capacitor.Plugins.Camera;
    if (!Camera) {
        console.error('❌ Camera plugin no encontrado');
        alert('Cámara no disponible. Verifica los permisos.');
        return null;
    }
    
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) {
        alert('Permiso de cámara denegado');
        return null;
    }
    
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: 'base64',
            source: 'CAMERA',
            width: 800,
            height: 800,
            correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) {
        console.error('Error cámara:', e);
        return null;
    }
}

// ==================== GALERÍA ====================
async function pickFromGallery() {
    if (!isNativeApp()) return null;
    const Camera = Capacitor.Plugins.Camera;
    if (!Camera) return null;
    
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) return null;
    
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: 'base64',
            source: 'PHOTOS',
            width: 800,
            height: 800,
            correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) {
        console.error('Error galería:', e);
        return null;
    }
}

function base64ToFile(base64String, format) {
    const chars = atob(base64String);
    const bytes = new Array(chars.length);
    for (let i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(bytes)], { type: `image/${format}` });
    return new File([blob], `photo-${Date.now()}.${format}`, { type: `image/${format}` });
}

// ==================== MOSTRAR PREVIEW ====================
function showPreviewForInput(inputId, file) {
    const oldPreview = document.getElementById('preview_' + inputId);
    if (oldPreview) oldPreview.remove();

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.createElement('div');
        preview.id = 'preview_' + inputId;
        preview.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px;background:#f0fdf4;border-radius:10px;border:1px solid #86efac;';
        preview.innerHTML = `
            <img src="${e.target.result}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;border:2px solid #10b981;">
            <div style="flex:1;">
                <div style="font-size:12px;color:#065f46;font-weight:600;">✅ Imagen seleccionada</div>
                <div style="font-size:10px;color:#64748b;">${(file.size/1024).toFixed(1)} KB</div>
            </div>
            <button onclick="this.parentElement.remove();document.getElementById('${inputId}').value='';" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;flex-shrink:0;">×</button>
        `;
        const input = document.getElementById(inputId);
        if (input && input.parentNode) {
            input.parentNode.appendChild(preview);
        }
    };
    reader.readAsDataURL(file);
}

// ==================== PICK IMAGE ====================
async function pickImageForInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // NO ES APP NATIVA: abrir input file
    if (!isNativeApp()) {
        input.click();
        return;
    }
    
    // APP NATIVA: menú cámara/galería
    const action = await new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
        ov.innerHTML = `<div style="background:white;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:400px;">
            <p style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">📷 Seleccionar imagen</p>
            <button id="_cam" style="width:100%;padding:14px;border:none;background:#f8fafc;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:8px;cursor:pointer;">📸 Cámara</button>
            <button id="_gal" style="width:100%;padding:14px;border:none;background:#f8fafc;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:12px;cursor:pointer;">🖼️ Galería</button>
            <button id="_can" style="width:100%;padding:14px;border:none;background:white;border-radius:12px;font-size:15px;font-weight:600;color:#ef4444;cursor:pointer;">Cancelar</button>
        </div>`;
        document.body.appendChild(ov);
        ov.querySelector('#_cam').onclick = () => { ov.remove(); resolve('camera'); };
        ov.querySelector('#_gal').onclick = () => { ov.remove(); resolve('gallery'); };
        ov.querySelector('#_can').onclick = () => { ov.remove(); resolve('cancel'); };
        ov.addEventListener('click', (e) => { if (e.target === ov) { ov.remove(); resolve('cancel'); } });
    });
    
    if (action === 'cancel') return;
    
    const file = action === 'camera' ? await takePhoto() : await pickFromGallery();
    if (!file) return;
    
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    
    showPreviewForInput(inputId, file);
    
    if (typeof toast !== 'undefined') toast.success('📷 Imagen lista para subir');
}

function showFilePreview(input) {
    const file = input.files[0];
    if (!file) return;
    showPreviewForInput(input.id, file);
    if (typeof toast !== 'undefined') toast.success('📷 Imagen lista');
}

window.pickImageForInput = pickImageForInput;
window.showFilePreview = showFilePreview;

})();