/**
 * native-bridge.js - Funcionalidades nativas para AquaTrack DW
 */
(function() {

const isNativeApp = () => {
    return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
};

// ==================== PERMISOS ====================
async function checkAndRequestCameraPermission() {
    if (!isNativeApp()) return true;
    try {
        const { Camera } = await import('@capacitor/camera');
        const status = await Camera.checkPermissions();
        if (status.camera === 'granted') return true;
        const request = await Camera.requestPermissions();
        if (request.camera === 'granted') return true;
        toast.warning('Permiso denegado. Actívalo en Ajustes > Apps > AquaTrack > Permisos');
        return false;
    } catch (e) { return false; }
}

// ==================== BOTÓN RETROCEDER ====================
if (isNativeApp()) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
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
            if (confirm('¿Deseas salir de AquaTrack?')) window.Capacitor.Plugins.App.exitApp();
        } else {
            window.history.back();
        }
    });
}

// ==================== TOMAR FOTO ====================
async function takePhoto() {
    if (!isNativeApp()) return null;
    if (!(await checkAndRequestCameraPermission())) return null;
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
            quality: 90, allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            width: 800, height: 800, correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) { return null; }
}

// ==================== GALERÍA ====================
async function pickFromGallery() {
    if (!isNativeApp()) return null;
    if (!(await checkAndRequestCameraPermission())) return null;
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
            quality: 90, allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos,
            width: 800, height: 800, correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) { return null; }
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
    // Eliminar preview anterior
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
        // Insertar después del input
        const input = document.getElementById(inputId);
        if (input && input.parentNode) {
            input.parentNode.appendChild(preview);
        }
    };
    reader.readAsDataURL(file);
}

// ==================== PICK IMAGE (COMPLETO) ====================
async function pickImageForInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // SIEMPRE: si no es app nativa, abrir el input file
    if (!isNativeApp()) {
        input.click();
        return;
    }
    
    // APP NATIVA: mostrar menú cámara/galería
    const action = await new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
        ov.innerHTML = `<div style="background:white;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:400px;">
            <p style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">📷 Seleccionar imagen</p>
            <button id="_cam" style="width:100%;padding:14px;border:none;background:#f8fafc;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:8px;cursor:pointer;">📸 Tomar foto con cámara</button>
            <button id="_gal" style="width:100%;padding:14px;border:none;background:#f8fafc;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:12px;cursor:pointer;">🖼️ Elegir de galería</button>
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
    
    // Asignar archivo al input
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    
    // Mostrar preview
    showPreviewForInput(inputId, file);
    
    toast.success('📷 Imagen lista para subir');
}

// ==================== PREVIEW CUANDO SE SELECCIONA ARCHIVO MANUALMENTE ====================
function showFilePreview(input) {
    const file = input.files[0];
    if (!file) return;
    showPreviewForInput(input.id, file);
    if (typeof toast !== 'undefined') toast.success('📷 Imagen lista');
}

window.pickImageForInput = pickImageForInput;
window.showFilePreview = showFilePreview;

})();