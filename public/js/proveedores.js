// ==================== PROVEEDORES.JS ====================

console.log('🚛 Proveedores.js cargado');

// ===== REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let proveedores = [];
let proveedoresFiltrados = [];
let proveedorEditandoId = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, iniciando gestión de proveedores...');
    
    await verificarAutenticacion();
    configurarEventos();
    await cargarProveedores();
    await cargarEstadisticas();
});

// ==================== AUTENTICACIÓN ====================
async function verificarAutenticacion() {
    console.log('🔐 Verificando autenticación...');
    
    return new Promise((resolve) => {
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Usuario autenticado:', user.email);
                
                try {
                    const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        currentUser = {
                            uid: user.uid,
                            email: user.email,
                            ...userDoc.data()
                        };
                        
                        mostrarNombreUsuario();
                        
                        // Solo admin puede gestionar proveedores
                        const role = currentUser.role || 'empleado';
                        if (role !== 'admin') {
                            alert('⚠️ Solo administradores pueden gestionar proveedores');
                            window.location.href = 'dashboard.html';
                            return;
                        }
                        
                        resolve(true);
                    } else {
                        console.error('❌ Usuario no encontrado en Firestore');
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error('❌ Error al obtener datos del usuario:', error);
                    window.location.href = 'index.html';
                }
            } else {
                console.log('❌ No hay usuario autenticado');
                window.location.href = 'index.html';
            }
        });
    });
}

function mostrarNombreUsuario() {
    const userName = document.getElementById('userName');
    if (userName && currentUser) {
        const displayName = currentUser.first_name || currentUser.email.split('@')[0];
        userName.textContent = displayName;
    }
}

function logout() {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
        firebaseAuth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
}

// ==================== EVENTOS ====================
function configurarEventos() {
    console.log('🔘 Configurando eventos...');
    
    // Búsqueda
    document.getElementById('searchInput').addEventListener('input', filtrarProveedores);
    
    // Filtros
    document.getElementById('filtroEstado').addEventListener('change', filtrarProveedores);
    document.getElementById('filtroPais').addEventListener('change', filtrarProveedores);
    
    // Toggle menú móvil
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
        
        // Cerrar sidebar al hacer click fuera (solo en móviles)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnToggle = menuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

// ==================== CARGAR PROVEEDORES ====================
async function cargarProveedores() {
    console.log('📦 Cargando proveedores...');
    
    try {
        const snapshot = await firebaseDB.collection('proveedores')
            .orderBy('nombre', 'asc')
            .get();
        
        proveedores = [];
        snapshot.forEach(doc => {
            proveedores.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${proveedores.length} proveedores cargados`);
        
        proveedoresFiltrados = [...proveedores];
        renderizarProveedores();
        cargarFiltros();
        
    } catch (error) {
        console.error('❌ Error al cargar proveedores:', error);
        alert('Error al cargar proveedores');
    }
}

// ==================== RENDERIZAR PROVEEDORES ====================
function renderizarProveedores() {
    const grid = document.getElementById('proveedoresGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (proveedoresFiltrados.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = proveedoresFiltrados.map(prov => `
        <div class="proveedor-card ${prov.activo === false ? 'inactive' : ''}">
            <span class="proveedor-badge ${prov.activo === false ? 'inactive' : 'active'}">
                ${prov.activo === false ? 'Inactivo' : 'Activo'}
            </span>
            
            <div class="proveedor-header">
                <div class="proveedor-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="proveedor-info">
                    <h3>${prov.nombre}</h3>
                    ${prov.pais ? `<div class="pais"><i class="fas fa-globe"></i> ${prov.pais}</div>` : ''}
                </div>
            </div>
            
            ${prov.telefono || prov.email || prov.direccion || prov.sitioWeb ? `
                <div class="proveedor-details">
                    ${prov.telefono ? `
                        <div class="proveedor-detail">
                            <i class="fas fa-phone"></i>
                            <span>${prov.telefono}</span>
                        </div>
                    ` : ''}
                    ${prov.email ? `
                        <div class="proveedor-detail">
                            <i class="fas fa-envelope"></i>
                            <a href="mailto:${prov.email}">${prov.email}</a>
                        </div>
                    ` : ''}
                    ${prov.direccion ? `
                        <div class="proveedor-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${prov.direccion}</span>
                        </div>
                    ` : ''}
                    ${prov.sitioWeb ? `
                        <div class="proveedor-detail">
                            <i class="fas fa-link"></i>
                            <a href="${prov.sitioWeb}" target="_blank">Sitio web</a>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="proveedor-stats">
                <div class="proveedor-stat">
                    <strong>${prov.productosCount || 0}</strong>
                    <span>Productos</span>
                </div>
            </div>
            
            <div class="proveedor-actions">
                <button class="btn-edit" onclick="editarProveedor('${prov.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="confirmarEliminar('${prov.id}', '${prov.nombre}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== FILTRAR PROVEEDORES ====================
function filtrarProveedores() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const estadoFiltro = document.getElementById('filtroEstado').value;
    const paisFiltro = document.getElementById('filtroPais').value;
    
    proveedoresFiltrados = proveedores.filter(prov => {
        // Filtro de búsqueda
        const matchSearch = prov.nombre.toLowerCase().includes(searchTerm) ||
                           (prov.pais && prov.pais.toLowerCase().includes(searchTerm)) ||
                           (prov.email && prov.email.toLowerCase().includes(searchTerm));
        
        // Filtro de estado
        const matchEstado = estadoFiltro === 'todos' ||
                           (estadoFiltro === 'activo' && prov.activo !== false) ||
                           (estadoFiltro === 'inactivo' && prov.activo === false);
        
        // Filtro de país
        const matchPais = paisFiltro === 'todos' || prov.pais === paisFiltro;
        
        return matchSearch && matchEstado && matchPais;
    });
    
    renderizarProveedores();
}

// ==================== CARGAR FILTROS ====================
function cargarFiltros() {
    // Obtener países únicos
    const paises = [...new Set(proveedores.map(p => p.pais).filter(p => p))];
    
    const selectPais = document.getElementById('filtroPais');
    selectPais.innerHTML = '<option value="todos">Todos los países</option>';
    
    paises.sort().forEach(pais => {
        selectPais.innerHTML += `<option value="${pais}">${pais}</option>`;
    });
}

// ==================== ESTADÍSTICAS ====================
async function cargarEstadisticas() {
    try {
        // Total proveedores
        const totalProveedores = proveedores.length;
        document.getElementById('totalProveedores').textContent = totalProveedores;
        
        // Proveedores activos
        const proveedoresActivos = proveedores.filter(p => p.activo !== false).length;
        document.getElementById('proveedoresActivos').textContent = proveedoresActivos;
        
        // Países únicos
        const paisesUnicos = [...new Set(proveedores.map(p => p.pais).filter(p => p))].length;
        document.getElementById('paisesUnicos').textContent = paisesUnicos;
        
        // Productos asociados
        const productosSnapshot = await firebaseDB.collection('products').get();
        let totalProductos = 0;
        
        productosSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.supplier) {
                totalProductos++;
            }
        });
        
        document.getElementById('productosAsociados').textContent = totalProductos;
        
        // Actualizar contador de productos por proveedor
        const productosPorProveedor = {};
        productosSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const supplierId = data.supplier;
            if (supplierId) {
                productosPorProveedor[supplierId] = (productosPorProveedor[supplierId] || 0) + 1;
            }
        });
        
        // Actualizar en memoria
        proveedores.forEach(prov => {
            prov.productosCount = productosPorProveedor[prov.id] || 0;
        });
        
        renderizarProveedores();
        
        console.log('📊 Estadísticas actualizadas');
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ==================== MODAL ====================
function abrirModalNuevo() {
    proveedorEditandoId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-truck"></i> Nuevo Proveedor';
    document.getElementById('formProveedor').reset();
    document.getElementById('proveedorId').value = '';
    document.getElementById('inputActivo').checked = true;
    document.getElementById('modalProveedor').classList.add('show');
}

function editarProveedor(id) {
    const proveedor = proveedores.find(p => p.id === id);
    if (!proveedor) return;
    
    proveedorEditandoId = id;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Proveedor';
    document.getElementById('proveedorId').value = id;
    document.getElementById('inputNombre').value = proveedor.nombre || '';
    document.getElementById('inputPais').value = proveedor.pais || '';
    document.getElementById('inputTelefono').value = proveedor.telefono || '';
    document.getElementById('inputEmail').value = proveedor.email || '';
    document.getElementById('inputDireccion').value = proveedor.direccion || '';
    document.getElementById('inputSitioWeb').value = proveedor.sitioWeb || '';
    document.getElementById('inputNotas').value = proveedor.notas || '';
    document.getElementById('inputActivo').checked = proveedor.activo !== false;
    
    document.getElementById('modalProveedor').classList.add('show');
}

function cerrarModal() {
    document.getElementById('modalProveedor').classList.remove('show');
    document.getElementById('formProveedor').reset();
    proveedorEditandoId = null;
}

// ==================== GUARDAR PROVEEDOR ====================
async function guardarProveedor(event) {
    event.preventDefault();
    
    const btnGuardar = document.getElementById('btnGuardar');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const proveedorData = {
            nombre: document.getElementById('inputNombre').value.trim(),
            pais: document.getElementById('inputPais').value.trim() || null,
            telefono: document.getElementById('inputTelefono').value.trim() || null,
            email: document.getElementById('inputEmail').value.trim() || null,
            direccion: document.getElementById('inputDireccion').value.trim() || null,
            sitioWeb: document.getElementById('inputSitioWeb').value.trim() || null,
            notas: document.getElementById('inputNotas').value.trim() || null,
            activo: document.getElementById('inputActivo').checked,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: currentUser.uid
        };
        
        if (proveedorEditandoId) {
            // Actualizar proveedor existente
            await firebaseDB.collection('proveedores').doc(proveedorEditandoId).update(proveedorData);
            console.log('✅ Proveedor actualizado');
            alert('✅ Proveedor actualizado correctamente');
        } else {
            // Crear nuevo proveedor
            proveedorData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            proveedorData.created_by = currentUser.uid;
            proveedorData.productosCount = 0;
            
            await firebaseDB.collection('proveedores').add(proveedorData);
            console.log('✅ Proveedor creado');
            alert('✅ Proveedor creado correctamente');
        }
        
        cerrarModal();
        await cargarProveedores();
        await cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al guardar proveedor:', error);
        alert('Error al guardar el proveedor');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
    }
}

// ==================== ELIMINAR PROVEEDOR ====================
function confirmarEliminar(id, nombre) {
    const proveedor = proveedores.find(p => p.id === id);
    const productosCount = proveedor?.productosCount || 0;
    
    let mensaje = `¿Estás seguro de eliminar el proveedor "${nombre}"?`;
    if (productosCount > 0) {
        mensaje += `\n\n⚠️ Este proveedor tiene ${productosCount} producto(s) asociado(s).\nLos productos quedarán sin proveedor asignado.`;
    }
    
    if (confirm(mensaje)) {
        eliminarProveedor(id);
    }
}

async function eliminarProveedor(id) {
    try {
        // Eliminar proveedor
        await firebaseDB.collection('proveedores').doc(id).delete();
        
        // Actualizar productos que tenían este proveedor
        const productosSnapshot = await firebaseDB.collection('products')
            .where('supplier', '==', id)
            .get();
        
        const batch = firebaseDB.batch();
        productosSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                supplier: null
            });
        });
        
        await batch.commit();
        
        console.log('✅ Proveedor eliminado');
        alert('✅ Proveedor eliminado correctamente');
        
        await cargarProveedores();
        await cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        alert('Error al eliminar el proveedor');
    }
}

console.log('✅ Proveedores.js completamente cargado');
