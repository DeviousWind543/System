/**
 * native-bridge.js - Funcionalidades nativas para AquaTrack DW
 * Con verificación de permisos de cámara (Android 13+)
 */
(function() {

const isNativeApp = () => {
    return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
};

// ==================== VERIFICAR PERMISOS DE CÁMARA ====================
async function checkAndRequestCameraPermission() {
    if (!isNativeApp()) return true;
    
    try {
        const { Camera } = await import('@capacitor/camera');
        const status = await Camera.checkPermissions();
        
        console.log('📷 Estado de permisos:', status.camera);
        
        if (status.camera === 'granted') {
            return true;
        }
        
        // Solicitar permisos
        const request = await Camera.requestPermissions();
        console.log('📷 Permiso solicitado:', request.camera);
        
        if (request.camera === 'granted') {
            return true;
        }
        
        if (request.camera === 'denied') {
            toast.warning('Permiso de cámara denegado. Actívalo en Ajustes > Aplicaciones > AquaTrack > Permisos');
        }
        
        return false;
    } catch (error) {
        console.error('Error verificando permisos:', error);
        return false;
    }
}

// ==================== BOTÓN RETROCEDER ====================
if (isNativeApp()) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
        const imgOverlay = document.querySelector('[style*="z-index:99999"]');
        const editOverlay = document.querySelector('[style*="z-index:9999"]');
        const modalOverlay = document.querySelector('.modal-overlay-aw');
        
        if (imgOverlay) { imgOverlay.remove(); document.body.style.overflow = ''; return; }
        if (editOverlay) { editOverlay.remove(); document.body.style.overflow = ''; return; }
        if (modalOverlay) { modalOverlay.remove(); document.body.style.overflow = ''; return; }
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('visible');
            document.body.style.overflow = '';
            return;
        }
        
        if (!canGoBack) {
            if (confirm('¿Deseas salir de AquaTrack?')) {
                window.Capacitor.Plugins.App.exitApp();
            }
        } else {
            window.history.back();
        }
    });
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

// ==================== TOMAR FOTO CON CÁMARA ====================
async function takePhoto() {
    if (!isNativeApp()) {
        console.log('📷 No es app nativa, usando input file');
        return null;
    }
    
    // Verificar permisos primero
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) return null;
    
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
    if (!isNativeApp()) {
        console.log('🖼️ No es app nativa, usando input file');
        return null;
    }
    
    // Verificar permisos primero
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) return null;
    
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

// ==================== FUNCIONES PARA BOTONES DEL FORMULARIO ====================
async function openCameraForInput(inputId) {
    if (!isNativeApp()) {
        // En navegador, abrir el input file
        document.getElementById(inputId)?.click();
        return;
    }
    
    const file = await takePhoto();
    if (file) {
        const input = document.getElementById(inputId);
        if (input) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            showPreview(inputId, file);
        }
    }
}

async function openGalleryForInput(inputId) {
    if (!isNativeApp()) {
        document.getElementById(inputId)?.click();
        return;
    }
    
    const file = await pickFromGallery();
    if (file) {
        const input = document.getElementById(inputId);
        if (input) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            showPreview(inputId, file);
        }
    }
}

function showPreview(inputId, file) {
    const preview = document.getElementById(inputId + '_preview');
    if (preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #10b981;"><span style="font-size:11px;color:#10b981;font-weight:600;">✅ Imagen lista</span>`;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================
window.isNativeApp = isNativeApp;
window.takePhoto = takePhoto;
window.pickFromGallery = pickFromGallery;
window.openCameraForInput = openCameraForInput;
window.openGalleryForInput = openGalleryForInput;
window.checkAndRequestCameraPermission = checkAndRequestCameraPermission;

})();