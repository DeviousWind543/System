/**
 * native-bridge.js - Funcionalidades nativas para AquaTrack DW
 * Cámara, galería, botón retroceder
 */
(function() {

const isNativeApp = () => {
    return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
};

// ==================== MANEJAR BOTÓN RETROCEDER ====================
if (isNativeApp()) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
        // Cerrar modales o overlays si están abiertos
        const modalOverlay = document.querySelector('.modal-overlay-aw');
        const imgOverlay = document.querySelector('[style*="z-index:99999"]');
        const editOverlay = document.querySelector('[style*="z-index:9999"]');
        
        if (imgOverlay) {
            imgOverlay.remove();
            document.body.style.overflow = '';
            return;
        }
        if (editOverlay) {
            editOverlay.remove();
            document.body.style.overflow = '';
            return;
        }
        if (modalOverlay) {
            modalOverlay.remove();
            document.body.style.overflow = '';
            return;
        }
        
        // Cerrar sidebar si está abierto
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('visible');
            document.body.style.overflow = '';
            return;
        }
        
        // Si no hay nada que cerrar, preguntar antes de salir
        if (!canGoBack) {
            if (confirm('¿Deseas salir de AquaTrack?')) {
                window.Capacitor.Plugins.App.exitApp();
            }
        } else {
            window.history.back();
        }
    });
}

// ==================== TOMAR FOTO CON CÁMARA ====================
async function takePhoto() {
    if (!isNativeApp()) return null;
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            width: 800,
            height: 800,
            correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) {
        if (e.message !== 'User cancelled photos app') {
            console.error('Error cámara:', e);
            toast.error('Error al acceder a la cámara');
        }
        return null;
    }
}

// ==================== ELEGIR DE GALERÍA ====================
async function pickFromGallery() {
    if (!isNativeApp()) return null;
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: true,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos,
            width: 800,
            height: 800,
            correctOrientation: true
        });
        return base64ToFile(image.base64String, image.format);
    } catch (e) {
        if (e.message !== 'User cancelled photos app') {
            console.error('Error galería:', e);
            toast.error('Error al acceder a la galería');
        }
        return null;
    }
}

// ==================== CONVERTIR BASE64 A FILE ====================
function base64ToFile(base64String, format) {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${format}` });
    return new File([blob], `photo-${Date.now()}.${format}`, { type: `image/${format}` });
}

// ==================== CONFIGURAR BOTONES DE CÁMARA/GALERÍA ====================
function setupNativeImagePicker(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return;
    if (!isNativeApp()) return;

    // Ocultar input file nativo
    fileInput.style.display = 'none';
    
    // Crear botones personalizados
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
    btnContainer.innerHTML = `
        <button type="button" id="${inputId}_camera" style="flex:1;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            📸 Cámara
        </button>
        <button type="button" id="${inputId}_gallery" style="flex:1;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            🖼️ Galería
        </button>
    `;
    
    fileInput.parentNode.insertBefore(btnContainer, fileInput.nextSibling);
    
    document.getElementById(`${inputId}_camera`).addEventListener('click', async () => {
        const file = await takePhoto();
        if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            // Mostrar preview
            showFilePreview(inputId, file);
        }
    });
    
    document.getElementById(`${inputId}_gallery`).addEventListener('click', async () => {
        const file = await pickFromGallery();
        if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            showFilePreview(inputId, file);
        }
    });
}

// ==================== MOSTRAR PREVIEW DEL ARCHIVO SELECCIONADO ====================
function showFilePreview(inputId, file) {
    const previewContainer = document.getElementById(`${inputId}_preview`);
    if (!previewContainer) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.innerHTML = `
            <img src="${e.target.result}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #10b981;">
            <span style="font-size:11px;color:#10b981;font-weight:600;">✅ Imagen lista</span>
        `;
        previewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

// Exponer funciones
window.isNativeApp = isNativeApp;
window.setupNativeImagePicker = setupNativeImagePicker;
window.takePhoto = takePhoto;
window.pickFromGallery = pickFromGallery;

})();