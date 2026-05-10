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

// ==================== PICK IMAGE (SIMPLIFICADO) ====================
async function pickImageForInput(inputId) {
    // En navegador, abrir input file directamente
    if (!isNativeApp()) {
        const input = document.getElementById(inputId);
        if (input) input.click();
        return;
    }
    
    // En app nativa: menú cámara/galería
    const action = await new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
        ov.innerHTML = `<div style="background:white;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:400px;">
            <p style="text-align:center;font-weight:700;font-size:16px;margin-bottom:16px;">📷 Seleccionar imagen</p>
            <button id="_cam" style="width:100%;padding:14px;border:none;background:#f8fafc;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:8px;cursor:pointer;">📸 Tomar foto</button>
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
    
    // Poner el archivo en el input
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    
    // Mostrar preview DEBAJO del botón que llamó esta función
    const button = document.querySelector(`[onclick*="pickImageForInput('${inputId}')"]`);
    
    // Eliminar preview anterior si existe
    const oldPreview = document.getElementById('preview_' + inputId);
    if (oldPreview) oldPreview.remove();
    
    // Crear nuevo preview
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
        if (button && button.parentNode) {
            button.parentNode.appendChild(preview);
        }
    };
    reader.readAsDataURL(file);
    
    toast.success('📷 Imagen lista');
}
// ==================== PREVIEW DE ARCHIVO SELECCIONADO ====================
function showFilePreview(input) {
    const file = input.files[0];
    if (!file) return;
    
    const previewId = input.id + '_preview';
    let preview = document.getElementById(previewId);
    
    // Si no existe el div preview, crearlo después del input
    if (!preview) {
        preview = document.createElement('div');
        preview.id = previewId;
        preview.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px;padding:10px;background:#f0fdf4;border-radius:10px;border:1px solid #86efac;';
        input.parentNode.appendChild(preview);
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `
            <img src="${e.target.result}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;border:2px solid #10b981;">
            <div style="flex:1;">
                <div style="font-size:12px;color:#065f46;font-weight:600;">✅ Imagen seleccionada</div>
                <div style="font-size:10px;color:#64748b;">${(file.size/1024).toFixed(1)} KB - ${file.name}</div>
            </div>
            <button onclick="this.parentElement.style.display='none';document.getElementById('${input.id}').value='';" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;">×</button>
        `;
        preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
    
    if (typeof toast !== 'undefined') toast.success('📷 Imagen lista');
}

window.showFilePreview = showFilePreview;
window.pickImageForInput = pickImageForInput;

})();