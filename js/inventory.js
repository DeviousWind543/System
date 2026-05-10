/**
 * inventory.js - Sistema de Inventario AquaTrack DW v4.0
 * Reglas de negocio completas:
 * - Botella 500ml: descuenta 1 botella
 * - Paca botellas: 24 botellas + 1 funda + 24 etiquetas
 * - Bidón 20L: 1 bidón + 1 tapa + 1 sello tapa + 1 etiqueta
 * - Bidón 12L/5L/1L: solo descuenta el bidón
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getInvEmoji(cat) {
    const e = { botellas: '🧴', bidones: '🪣', maquinas: '⚙️', insumos: '📦', otros: '📋' };
    return e[cat] || '📋';
}

async function loadInventory() {
    try {
        const { data, error } = await window.AquaTrack.db
            .from('inventory')
            .select('*')
            .order('category');
        if (error) throw error;
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;
        if (!data || !data.length) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">📦 No hay items en inventario</div></td></tr>';
            updateInvStats([]); return;
        }
        updateInvStats(data);
        const cats = { botellas: 'Botellas', bidones: 'Bidones', maquinas: 'Máquinas', insumos: 'Insumos', otros: 'Otros' };
        const role = sessionStorage.getItem('userRole');
        const canEdit = (role === 'admin' || role === 'seller');

        tbody.innerHTML = data.map(item => {
            const sc = item.quantity <= 0 ? 'stock-empty' : item.quantity <= (item.min_quantity || 5) ? 'stock-low' : 'stock-good';
            const img = item.image_url
                ? `<img src="${item.image_url}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;cursor:pointer;border:2px solid #e2e8f0" onclick="previewImage('${item.image_url}', '${escapeHtml(item.name).replace(/'/g, "\\'")}')" onerror="this.style.display='none'">`
                : `<div style="width:44px;height:44px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">${getInvEmoji(item.category)}</div>`;
            const actions = canEdit ? `<td data-label="Acciones">
                <button class="btn-icon edit" onclick="editInventoryItem('${item.id}')"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
                <button class="btn-icon add" onclick="addInventoryStock('${item.id}')"><i data-lucide="plus" style="width:14px;height:14px"></i></button>
                <button class="btn-icon delete" onclick="deleteInventoryItem('${item.id}','${escapeHtml(item.name)}')"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
            </td>` : '';
            return `<tr>
                <td data-label="Foto">${img}</td>
                <td data-label="Item"><strong>${escapeHtml(item.name)}</strong></td>
                <td data-label="Cat"><span class="tag">${cats[item.category]||item.category}</span></td>
                <td data-label="Stock"><span class="stock-badge ${sc}">${item.quantity} ${item.unit||'un'}</span></td>
                <td data-label="Mín">${item.min_quantity||5}</td>
                <td data-label="Desc">${item.description||'—'}</td>
                ${actions}
            </tr>`;
        }).join('');
        if (typeof lucide !== 'undefined') setTimeout(() => lucide.createIcons(), 50);
    } catch (e) {
        console.error('Error inventory:', e);
        if (typeof toast !== 'undefined') toast.error('Error al cargar inventario');
    }
}

function updateInvStats(data) {
    document.getElementById('statTotalItems') && (document.getElementById('statTotalItems').textContent = data.length);
    document.getElementById('statLowStock') && (document.getElementById('statLowStock').textContent = data.filter(i => i.quantity <= (i.min_quantity || 5)).length);
    document.getElementById('sidebarInventoryCount') && (document.getElementById('sidebarInventoryCount').textContent = data.length);
}

async function addInventoryItem() {
    const name = document.getElementById('itemName')?.value.trim();
    const cat = document.getElementById('itemCategory')?.value;
    const qty = parseInt(document.getElementById('itemQuantity')?.value) || 0;
    const minQ = parseInt(document.getElementById('itemMinQuantity')?.value) || 5;
    const unit = document.getElementById('itemUnit')?.value.trim() || 'unidad';
    const desc = document.getElementById('itemDescription')?.value.trim();
    const file = document.getElementById('itemImage')?.files[0];
    if (!name) { toast.warning('Nombre requerido'); return; }
    if (!cat) { toast.warning('Categoría requerida'); return; }
    const loading = toast.loading('Guardando...');
    try {
        let imgUrl = null;
        if (file) {
            const ext = file.name.split('.').pop();
            const fn = `inv-${Date.now()}.${ext}`;
            const { error: upErr } = await window.AquaTrack.db.storage.from('inventory-images').upload(fn, file);
            if (upErr) throw upErr;
            const { data: urlData } = window.AquaTrack.db.storage.from('inventory-images').getPublicUrl(fn);
            imgUrl = urlData.publicUrl;
        }
        await window.AquaTrack.db.from('inventory').insert([{ name, category: cat, quantity: qty, min_quantity: minQ, unit, description: desc, image_url: imgUrl }]);
        loading.close(); toast.success('Item agregado');
        document.getElementById('itemName').value = '';
        document.getElementById('itemQuantity').value = '';
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemImage').value = '';
        document.getElementById('formAddItem').style.display = 'none';
        loadInventory();
        setTimeout(() => setupNativeImagePicker('itemImage'), 300);
    } catch (e) { loading.close(); toast.error('Error: ' + e.message); }
}

async function addInventoryStock(id) {
    const q = await modal.prompt('Cantidad a agregar:', '1', 'Agregar Stock');
    if (!q || isNaN(q) || parseInt(q) <= 0) return;
    try {
        const { data: item } = await window.AquaTrack.db.from('inventory').select('quantity').eq('id', id).single();
        const nq = (item?.quantity || 0) + parseInt(q);
        await window.AquaTrack.db.from('inventory').update({ quantity: nq, updated_at: new Date().toISOString() }).eq('id', id);
        toast.success('+'+q+' stock'); loadInventory();
    } catch (e) { toast.error('Error: ' + e.message); }
}

async function deleteInventoryItem(id, name) {
    modal.delete('¿Eliminar "'+name+'"?', async () => {
        try {
            const { data: item } = await window.AquaTrack.db.from('inventory').select('image_url').eq('id', id).single();
            if (item?.image_url) {
                await window.AquaTrack.db.storage.from('inventory-images').remove([item.image_url.split('/').pop()]);
            }
            await window.AquaTrack.db.from('inventory').delete().eq('id', id);
            toast.success('Item eliminado'); loadInventory();
        } catch (e) { toast.error('Error: ' + e.message); }
    });
}

async function editInventoryItem(id) {
    const { data: item } = await window.AquaTrack.db.from('inventory').select('*').eq('id', id).single();
    if (!item) return;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
    ov.innerHTML = `<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)">
        <h3 style="font-size:18px;font-weight:700;margin-bottom:16px">📦 Editar Item</h3>
        <div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:#475569">Nombre</label><input id="eName" value="${escapeHtml(item.name)}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div><label style="font-size:12px;font-weight:600;color:#475569">Categoría</label><select id="eCat" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px"><option value="botellas" ${item.category==='botellas'?'selected':''}>Botellas</option><option value="bidones" ${item.category==='bidones'?'selected':''}>Bidones</option><option value="maquinas" ${item.category==='maquinas'?'selected':''}>Máquinas</option><option value="insumos" ${item.category==='insumos'?'selected':''}>Insumos</option><option value="otros" ${item.category==='otros'?'selected':''}>Otros</option></select></div>
            <div><label style="font-size:12px;font-weight:600;color:#475569">Unidad</label><input id="eUnit" value="${item.unit||'unidad'}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div><label style="font-size:12px;font-weight:600;color:#475569">Cantidad</label><input type="number" id="eQty" value="${item.quantity}" min="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px"></div>
            <div><label style="font-size:12px;font-weight:600;color:#475569">Stock Mínimo</label><input type="number" id="eMin" value="${item.min_quantity||5}" min="0" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px"></div>
        </div>
        <div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:#475569">Descripción</label><textarea id="eDesc" rows="2" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;resize:vertical">${escapeHtml(item.description||'')}</textarea></div>
       <div style="margin-bottom:16px">
    <label style="font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;display:block;">📷 Nueva imagen</label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="file" id="eImg" accept="image/*" style="font-size:13px;flex:1;min-width:150px;">
        <button type="button" onclick="openCameraForInput('eImg')" style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;font-size:12px;display:flex;align-items:center;gap:6px;white-space:nowrap;">
            📸 Cámara
        </button>
        <button type="button" onclick="openGalleryForInput('eImg')" style="padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:600;cursor:pointer;font-family:inherit;font-size:12px;display:flex;align-items:center;gap:6px;white-space:nowrap;">
            🖼️ Galería
        </button>
    </div>
</div>
       <div data-img-container style="margin-bottom:10px;${item.image_url ? '' : 'display:none;'}display:flex;align-items:center;gap:10px;">
    ${item.image_url ? `
        <img src="${item.image_url}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #e2e8f0;cursor:pointer" onclick="previewImage('${item.image_url}','${escapeHtml(item.name)}')">
        <button type="button" onclick="removeImage('${item.id}')" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Eliminar foto
        </button>
    ` : ''}
</div>
        <div style="display:flex;gap:10px">
            <button id="eCancel" style="flex:1;padding:12px;border-radius:10px;border:1px solid #e2e8f0;background:#f1f5f9;color:#475569;font-weight:600;cursor:pointer">Cancelar</button>
            <button id="eSave" style="flex:1;padding:12px;border-radius:10px;border:none;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer">Guardar</button>
        </div>
    </div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const cl = () => { ov.remove(); document.body.style.overflow = ''; };
    ov.addEventListener('click', e => { if (e.target === ov) cl(); });
    document.getElementById('eCancel').onclick = cl;
    document.getElementById('eSave').onclick = async () => {
        const nName = document.getElementById('eName').value.trim();
        const nCat = document.getElementById('eCat').value;
        const nQty = parseInt(document.getElementById('eQty').value);
        const nMin = parseInt(document.getElementById('eMin').value);
        const nUnit = document.getElementById('eUnit').value.trim();
        const nDesc = document.getElementById('eDesc').value.trim();
        const nFile = document.getElementById('eImg')?.files[0];
        if (!nName) { toast.warning('Nombre requerido'); return; }
        const loading = toast.loading('Actualizando...');
        try {
                let imgUrl = document.querySelector('[data-img-container]')?.style.display === 'none' ? null : item.image_url;
                if (nFile) {
                if (item.image_url) await window.AquaTrack.db.storage.from('inventory-images').remove([item.image_url.split('/').pop()]);
                const ext = nFile.name.split('.').pop();
                const fn = 'inv-'+Date.now()+'.'+ext;
                await window.AquaTrack.db.storage.from('inventory-images').upload(fn, nFile);
                const { data: urlData } = window.AquaTrack.db.storage.from('inventory-images').getPublicUrl(fn);
                imgUrl = urlData.publicUrl;
            }
            await window.AquaTrack.db.from('inventory').update({
                name: nName, category: nCat, quantity: nQty, min_quantity: nMin,
                unit: nUnit, description: nDesc, image_url: imgUrl, updated_at: new Date().toISOString()
            }).eq('id', id);
            loading.close(); toast.success('Item actualizado'); cl(); loadInventory();
        } catch (e) { loading.close(); toast.error('Error: ' + e.message); }
    };
}

// ==================== FUNCIÓN AUXILIAR ====================
async function updateSingleItem(searchTerm, quantity) {
    console.log('🔍 Buscando:', searchTerm, '| Descontar:', quantity);
    const { data } = await window.AquaTrack.db.from('inventory').select('*').ilike('name', '%'+searchTerm+'%');
    if (data?.length) {
        const nq = Math.max(0, data[0].quantity - quantity);
        await window.AquaTrack.db.from('inventory').update({ quantity: nq, updated_at: new Date().toISOString() }).eq('id', data[0].id);
        console.log('✅ '+data[0].name+': '+data[0].quantity+' → '+nq+' (-'+quantity+')');
    } else {
        console.warn('❌ No encontrado:', searchTerm);
    }
}

// ==================== REGLAS DE NEGOCIO COMPLETAS ====================
async function discountFromInventory(productName, quantity) {
    console.log('🛒 Venta:', productName, 'x'+quantity);
    try {
        if (productName.includes('Pacas de botellas')) {
            // Paca = 24 botellas + 1 funda + 24 etiquetas
            console.log('📦 PACAS: 24 botellas + 1 funda + 24 etiquetas x'+quantity);
            await updateSingleItem('Botella 500ml', quantity * 24);
            await updateSingleItem('Funda', quantity);
            await updateSingleItem('Etiquetas de botella', quantity * 24);
        } else if (productName.includes('Botella 500ml')) {
            // Botella individual
            console.log('🧴 BOTELLA: 1 botella x'+quantity);
            await updateSingleItem('Botella 500ml', quantity);
        } else if (productName === 'Bidón 20L' || productName.includes('Bidón 20 Litros')) {
            // Bidón 20L = 1 bidón + 1 tapa + 1 sello tapa + 1 etiqueta
            console.log('🪣 BIDÓN 20L: 1 bidón + 1 tapa + 1 sello + 1 etiqueta x'+quantity);
            await updateSingleItem('Bidón 20L', quantity);
            await updateSingleItem('Tapas para bidón 20L', quantity);
            await updateSingleItem('Sellos para tapa', quantity);
            await updateSingleItem('Etiquetas de bidón 20L', quantity);
        } else if (productName.includes('Bidón')) {
            // Otros bidones (12L, 5L, 1L) - solo descuenta el bidón
            const size = productName.replace('Bidón ', '').replace(' Litros', '').replace(' Litro', '');
            console.log('🪣 BIDÓN '+size+': solo bidón x'+quantity);
            await updateSingleItem('Bidón '+size, quantity);
        } else {
            await updateSingleItem(productName, quantity);
        }
    } catch (e) { console.warn('Error desc:', e.message); }
}

async function returnToInventory(productName, quantity) {
    console.log('🔁 Retorno:', productName, 'x'+quantity);
    try {
        if (!productName.includes('Bidón')) {
            console.log('ℹ️ No retornable');
            return;
        }
        const size = productName.replace('Bidón ', '').replace(' Litros', '').replace(' Litro', '');
        const { data } = await window.AquaTrack.db.from('inventory').select('*').ilike('name', '%Bidón%'+size+'%');
        if (data?.length) {
            const nq = data[0].quantity + quantity;
            await window.AquaTrack.db.from('inventory').update({ quantity: nq, updated_at: new Date().toISOString() }).eq('id', data[0].id);
            console.log('✅ Retornado: +'+quantity+' de '+data[0].name+' (stock: '+nq+')');
        }
    } catch (e) { console.warn('Error ret:', e.message); }
}
// ==================== REVERTIR DESCUENTO (al eliminar venta) ====================
async function revertDiscountFromInventory(productName, quantity) {
    console.log('🔙 Revirtiendo:', productName, 'x'+quantity);
    try {
        if (productName.includes('Pacas de botellas')) {
            await updateSingleItemAdd('Botella 500ml', quantity * 24);
            await updateSingleItemAdd('Funda', quantity);
            await updateSingleItemAdd('Etiquetas de botella', quantity * 24);
        } else if (productName.includes('Botella 500ml')) {
            await updateSingleItemAdd('Botella 500ml', quantity);
        } else if (productName.includes('Bidón 20L') || productName.includes('Bidón 20 Litros')) {
            await updateSingleItemAdd('Bidón 20L', quantity);
            await updateSingleItemAdd('Tapas para bidón 20L', quantity);
            await updateSingleItemAdd('Sellos para tapa', quantity);
            await updateSingleItemAdd('Etiquetas de bidón 20L', quantity);
        } else if (productName.includes('Bidón')) {
            const size = productName.replace('Bidón ', '').replace(' Litros', '').replace(' Litro', '');
            await updateSingleItemAdd('Bidón '+size, quantity);
        } else {
            await updateSingleItemAdd(productName, quantity);
        }
    } catch (e) { console.warn('Error revert:', e.message); }
}

// ==================== FUNCIÓN AUXILIAR PARA SUMAR ====================
async function updateSingleItemAdd(searchTerm, quantity) {
    console.log('🔍 Sumando:', searchTerm, '| Cantidad:', quantity);
    const { data } = await window.AquaTrack.db.from('inventory').select('*').ilike('name', '%'+searchTerm+'%');
    if (data?.length) {
        const nq = data[0].quantity + quantity;
        await window.AquaTrack.db.from('inventory').update({ quantity: nq, updated_at: new Date().toISOString() }).eq('id', data[0].id);
        console.log('✅ '+data[0].name+': '+data[0].quantity+' → '+nq+' (+'+quantity+')');
    } else {
        console.warn('❌ No encontrado:', searchTerm);
    }
}

// ==================== CALCULAR DIFERENCIA AL EDITAR ====================
async function adjustInventoryOnEdit(oldProduct, oldQty, newProduct, newQty) {
    console.log('✏️ Ajuste por edición:');
    console.log('  Antes:', oldProduct, 'x'+oldQty);
    console.log('  Ahora:', newProduct, 'x'+newQty);

    // Si cambió el producto o la cantidad
    if (oldProduct === newProduct) {
        // Mismo producto, diferente cantidad
        const diff = newQty - oldQty;
        if (diff > 0) {
            // Aumentó la cantidad → descontar la diferencia
            console.log('📉 Aumentó en', diff, '→ descontando diferencia');
            await discountFromInventory(oldProduct, diff);
        } else if (diff < 0) {
            // Disminuyó la cantidad → devolver la diferencia
            console.log('📈 Disminuyó en', Math.abs(diff), '→ devolviendo diferencia');
            await revertDiscountFromInventory(oldProduct, Math.abs(diff));
        }
    } else {
        // Producto diferente → revertir todo lo anterior y descontar lo nuevo
        console.log('🔄 Producto diferente → revertir anterior y descontar nuevo');
        await revertDiscountFromInventory(oldProduct, oldQty);
        await discountFromInventory(newProduct, newQty);
    }
}

// ==================== VISOR DE IMAGEN ====================
function previewImage(url, itemName) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;cursor:pointer;';
    
    overlay.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;">
            <button style="position:absolute;top:-40px;right:0;background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" 
                    onmouseover="this.style.background='rgba(255,255,255,0.4)'" 
                    onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            <img src="${url}" alt="${escapeHtml(itemName)}" 
                 style="max-width:90vw;max-height:80vh;border-radius:16px;box-shadow:0 25px 80px rgba(0,0,0,0.5);object-fit:contain;"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f1f5f9%22 width=%22200%22 height=%22200%22 rx=%2216%22/><text x=%22100%22 y=%22110%22 text-anchor=%22middle%22 font-size=%2260%22>📷</text></svg>'">
            <p style="color:white;font-size:16px;font-weight:600;margin-top:16px;text-align:center;">${escapeHtml(itemName)}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Cerrar al hacer clic fuera de la imagen o en el botón X
    const closeBtn = overlay.querySelector('button');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.remove();
        document.body.style.overflow = '';
    });
    
    overlay.addEventListener('click', () => {
        overlay.remove();
        document.body.style.overflow = '';
    });
    
    // Cerrar con Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ==================== ELIMINAR IMAGEN DE ITEM (sin cerrar formulario) ====================
async function removeImage(itemId) {
    const confirmed = await modal.confirm('¿Eliminar la foto de este item?', 'Quitar imagen', 'warning');
    if (!confirmed) return;
    
    const loading = toast.loading('Eliminando imagen...');
    try {
        // Obtener la URL de la imagen actual
        const { data: item } = await window.AquaTrack.db
            .from('inventory')
            .select('image_url')
            .eq('id', itemId)
            .single();

        // Eliminar del storage
        if (item?.image_url) {
            const fileName = item.image_url.split('/').pop();
            await window.AquaTrack.db.storage
                .from('inventory-images')
                .remove([fileName]);
        }

        // Actualizar la BD
        await window.AquaTrack.db
            .from('inventory')
            .update({ image_url: null, updated_at: new Date().toISOString() })
            .eq('id', itemId);

        loading.close();
        toast.success('Imagen eliminada');
        
        // Buscar el contenedor de la imagen en el formulario abierto
        const imgContainer = document.querySelector('[data-img-container]');
        if (imgContainer) {
            // Ocultar el contenedor de la imagen actual
            imgContainer.style.display = 'none';
            // Limpiar el campo de archivo por si acaso
            const fileInput = document.getElementById('eImg');
            if (fileInput) fileInput.value = '';
        }
        
    } catch (e) {
        loading.close();
        toast.error('Error: ' + e.message);
    }
}
// ==================== ABRIR CÁMARA O GALERÍA (para inputs dinámicos) ====================
async function openCameraForInput(inputId) {
    const file = await takePhoto();
    if (file) {
        const input = document.getElementById(inputId);
        if (input) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            // Mostrar preview si existe
            const preview = document.getElementById(inputId + '_preview');
            if (preview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #10b981;"><span style="font-size:11px;color:#10b981;">✅ Lista</span>`;
                    preview.style.display = 'flex';
                };
                reader.readAsDataURL(file);
            }
        }
    }
}

async function openGalleryForInput(inputId) {
    const file = await pickFromGallery();
    if (file) {
        const input = document.getElementById(inputId);
        if (input) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            const preview = document.getElementById(inputId + '_preview');
            if (preview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;border:2px solid #10b981;"><span style="font-size:11px;color:#10b981;">✅ Lista</span>`;
                    preview.style.display = 'flex';
                };
                reader.readAsDataURL(file);
            }
        }
    }
}

window.openCameraForInput = openCameraForInput;
window.openGalleryForInput = openGalleryForInput;
window.removeImage = removeImage;
window.previewImage = previewImage;
window.revertDiscountFromInventory = revertDiscountFromInventory;
window.adjustInventoryOnEdit = adjustInventoryOnEdit;
window.loadInventory = loadInventory;
window.addInventoryItem = addInventoryItem;
window.addInventoryStock = addInventoryStock;
window.deleteInventoryItem = deleteInventoryItem;
window.editInventoryItem = editInventoryItem;
window.discountFromInventory = discountFromInventory;
window.returnToInventory = returnToInventory;