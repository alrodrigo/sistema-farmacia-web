// ==================== CATEGORIAS.JS ====================

console.log('📦 Categorias.js cargado');

// Variables globales
let currentUser = null;
let categorias = [];
let editingCategoryId = null;

// Referencias Firebase (db y auth ya están declarados en firebase.js)
// const db = firebase.firestore(); // Ya declarado globalmente
// const auth = firebase.auth(); // Ya declarado globalmente

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, iniciando gestión de categorías...');
    
    // Verificar autenticación y rol
    await verificarAutenticacion();
    
    // Configurar eventos
    configurarEventos();
    
    // Cargar categorías
    await cargarCategorias();
    
    // Cargar estadísticas
    await cargarEstadisticas();
});

// ==================== AUTENTICACIÓN ====================
async function verificarAutenticacion() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Usuario autenticado:', user.email);
                
                // Obtener datos del usuario
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        ...userDoc.data()
                    };
                    
                    // Mostrar nombre y rol
                    const displayName = getUserDisplayName(currentUser);
                    document.getElementById('userName').textContent = displayName;
                    
                    const userRoleElement = document.getElementById('userRole');
                    if (userRoleElement) {
                        const role = currentUser.role || 'empleado';
                        const roleText = role === 'admin' ? 'Administrador' : 'Empleado';
                        userRoleElement.textContent = roleText;
                    }
                    
                    // Verificar si es admin
                    const role = currentUser.role || 'empleado';
                    if (role !== 'admin') {
                        alert('⚠️ Solo administradores pueden gestionar categorías');
                        window.location.href = 'dashboard.html';
                        return;
                    }
                    
                    resolve(true);
                } else {
                    console.error('❌ Usuario no encontrado en Firestore');
                    window.location.href = 'index.html';
                }
            } else {
                console.log('❌ No hay usuario autenticado');
                window.location.href = 'index.html';
            }
        });
    });
}

// ==================== CONFIGURAR EVENTOS ====================
function configurarEventos() {
    console.log('🔘 Configurando eventos...');
    
    // Botón nueva categoría
    document.getElementById('btnNuevaCategoria').addEventListener('click', abrirModalNueva);
    
    // Cerrar modal
    document.getElementById('btnCloseModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('modalCategoria').addEventListener('click', function(e) {
        if (e.target === this) {
            cerrarModal();
        }
    });
    
    // Formulario
    document.getElementById('formCategoria').addEventListener('submit', guardarCategoria);
    
    // Selector de color
    document.getElementById('colorCategoria').addEventListener('input', function(e) {
        document.getElementById('colorHex').textContent = e.target.value;
    });
    
    // Logout (opcional - el navbar ya no tiene este botón visible)
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        });
    }
    
    // Logout desde user menu (nuevo diseño)
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', () => {
            // Aquí podrías agregar un dropdown con la opción de logout
            // Por ahora, hacer click en el usuario cierra sesión
            if (confirm('¿Deseas cerrar sesión?')) {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        });
    }
    
    // Toggle sidebar
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

// ==================== CARGAR CATEGORÍAS ====================
async function cargarCategorias() {
    try {
        console.log('📦 Cargando categorías...');
        
        const snapshot = await db.collection('categorias')
            .orderBy('nombre', 'asc')
            .get();
        
        categorias = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Si no hay categorías, crear las predefinidas
        if (categorias.length === 0) {
            console.log('⚠️ No hay categorías, creando categorías predefinidas...');
            await crearCategoriasPredefinidas();
            // Recargar después de crear
            const newSnapshot = await db.collection('categorias').get();
            categorias = newSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        }
        
        console.log(`✅ ${categorias.length} categorías cargadas`);
        
        renderizarCategorias();
        
    } catch (error) {
        console.error('❌ Error al cargar categorías:', error);
        console.error('Detalles del error:', error.message);
        
        // Si el error es por falta de índice o colección vacía, intentar sin orderBy
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            console.log('⚠️ Intentando cargar sin ordenar...');
            try {
                const snapshot = await db.collection('categorias').get();
                categorias = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Si no hay categorías, crear las predefinidas
                if (categorias.length === 0) {
                    console.log('⚠️ No hay categorías, creando categorías predefinidas...');
                    await crearCategoriasPredefinidas();
                    const newSnapshot = await db.collection('categorias').get();
                    categorias = newSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                }
                
                // Ordenar manualmente en JavaScript
                categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                
                console.log(`✅ ${categorias.length} categorías cargadas (sin índice)`);
                renderizarCategorias();
                return;
            } catch (retryError) {
                console.error('❌ Error en reintento:', retryError);
            }
        }
        
        // Si la colección está vacía, mostrar estado vacío
        categorias = [];
        renderizarCategorias();
    }
}

// ==================== RENDERIZAR CATEGORÍAS ====================
function renderizarCategorias() {
    const grid = document.getElementById('categoriasGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (categorias.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    grid.innerHTML = categorias.map(cat => `
        <div class="categoria-card ${cat.activa ? '' : 'inactive'}" style="border-left-color: ${cat.color || '#6a5acd'}">
            <span class="categoria-badge ${cat.activa ? 'active' : 'inactive'}">
                ${cat.activa ? 'Activa' : 'Inactiva'}
            </span>
            
            <div class="categoria-icon" style="background: ${cat.color || '#6a5acd'}">
                <i class="fas ${cat.icono || 'fa-tag'}"></i>
            </div>
            
            <div class="categoria-info">
                <h3>${cat.nombre}</h3>
                <p>${cat.descripcion || 'Sin descripción'}</p>
            </div>
            
            <div class="categoria-stats">
                <div class="categoria-stat">
                    <i class="fas fa-boxes"></i>
                    <span><strong>${cat.productosCount || 0}</strong> productos</span>
                </div>
            </div>
            
            <div class="categoria-actions">
                <button class="btn-icon edit" onclick="editarCategoria('${cat.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="confirmarEliminar('${cat.id}', '${cat.nombre}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== ABRIR MODAL NUEVA ====================
function abrirModalNueva() {
    editingCategoryId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-tag"></i> Nueva Categoría';
    document.getElementById('formCategoria').reset();
    document.getElementById('categoriaId').value = '';
    document.getElementById('colorCategoria').value = '#6a5acd';
    document.getElementById('colorHex').textContent = '#6a5acd';
    document.getElementById('activaCategoria').checked = true;
    document.getElementById('modalCategoria').classList.add('active');
}

// ==================== EDITAR CATEGORÍA ====================
async function editarCategoria(id) {
    try {
        editingCategoryId = id;
        const categoria = categorias.find(c => c.id === id);
        
        if (!categoria) {
            alert('Categoría no encontrada');
            return;
        }
        
        // Llenar formulario
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Categoría';
        document.getElementById('categoriaId').value = id;
        document.getElementById('nombreCategoria').value = categoria.nombre;
        document.getElementById('descripcionCategoria').value = categoria.descripcion || '';
        document.getElementById('colorCategoria').value = categoria.color || '#6a5acd';
        document.getElementById('colorHex').textContent = categoria.color || '#6a5acd';
        document.getElementById('iconoCategoria').value = categoria.icono || 'fa-tag';
        document.getElementById('activaCategoria').checked = categoria.activa !== false;
        
        // Abrir modal
        document.getElementById('modalCategoria').classList.add('active');
        
    } catch (error) {
        console.error('Error al cargar categoría:', error);
        alert('Error al cargar la categoría');
    }
}

// ==================== GUARDAR CATEGORÍA ====================
async function guardarCategoria(e) {
    e.preventDefault();
    
    try {
        const nombre = document.getElementById('nombreCategoria').value.trim();
        const descripcion = document.getElementById('descripcionCategoria').value.trim();
        const color = document.getElementById('colorCategoria').value;
        const icono = document.getElementById('iconoCategoria').value;
        const activa = document.getElementById('activaCategoria').checked;
        
        if (!nombre) {
            alert('El nombre es obligatorio');
            return;
        }
        
        // Verificar si ya existe una categoría con ese nombre (excepto si es la misma que estamos editando)
        const existente = categorias.find(c => 
            c.nombre.toLowerCase() === nombre.toLowerCase() && 
            c.id !== editingCategoryId
        );
        
        if (existente) {
            alert('Ya existe una categoría con ese nombre');
            return;
        }
        
        const categoriaData = {
            nombre,
            descripcion,
            color,
            icono,
            activa,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editingCategoryId) {
            // Actualizar
            await db.collection('categorias').doc(editingCategoryId).update(categoriaData);
            console.log('✅ Categoría actualizada');
            alert('✅ Categoría actualizada correctamente');
        } else {
            // Crear nueva
            categoriaData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            categoriaData.productosCount = 0;
            
            await db.collection('categorias').add(categoriaData);
            console.log('✅ Categoría creada');
            alert('✅ Categoría creada correctamente');
        }
        
        cerrarModal();
        await cargarCategorias();
        await cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        alert('Error al guardar la categoría');
    }
}

// ==================== CONFIRMAR ELIMINAR ====================
function confirmarEliminar(id, nombre) {
    const confirmacion = confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?\n\nLos productos con esta categoría quedarán sin categoría asignada.`);
    
    if (confirmacion) {
        eliminarCategoria(id);
    }
}

// ==================== ELIMINAR CATEGORÍA ====================
async function eliminarCategoria(id) {
    try {
        // Eliminar categoría
        await db.collection('categorias').doc(id).delete();
        
        // Actualizar productos que tenían esta categoría
        const productosSnapshot = await db.collection('products')
            .where('categoriaId', '==', id)
            .get();
        
        const batch = db.batch();
        productosSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                categoriaId: null,
                categoria: null
            });
        });
        
        await batch.commit();
        
        console.log('✅ Categoría eliminada');
        alert('✅ Categoría eliminada correctamente');
        
        await cargarCategorias();
        await cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        alert('Error al eliminar la categoría');
    }
}

// ==================== CERRAR MODAL ====================
function cerrarModal() {
    document.getElementById('modalCategoria').classList.remove('active');
    document.getElementById('formCategoria').reset();
    editingCategoryId = null;
}

// ==================== CARGAR ESTADÍSTICAS ====================
async function cargarEstadisticas() {
    try {
        // Total de categorías
        const totalCategorias = categorias.length;
        document.getElementById('totalCategorias').textContent = totalCategorias;
        
        // Categorías activas
        const categoriasActivas = categorias.filter(c => c.activa !== false).length;
        document.getElementById('categoriasActivas').textContent = categoriasActivas;
        
        // Total de productos
        const productosSnapshot = await db.collection('products').get();
        const totalProductos = productosSnapshot.size;
        document.getElementById('totalProductos').textContent = totalProductos;
        
        // Actualizar contador de productos por categoría
        const productosPorCategoria = {};
        productosSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Usar 'category' porque así se guarda en productos.js
            const catId = data.category || data.categoriaId;
            if (catId) {
                productosPorCategoria[catId] = (productosPorCategoria[catId] || 0) + 1;
            }
        });
        
        // Actualizar contador en memoria PRIMERO (para mostrar inmediatamente)
        categorias.forEach(cat => {
            cat.productosCount = productosPorCategoria[cat.id] || 0;
        });
        
        // Re-renderizar categorías con los conteos actualizados
        renderizarCategorias();
        
        // Actualizar en Firestore en segundo plano
        const batch = db.batch();
        Object.keys(productosPorCategoria).forEach(catId => {
            const ref = db.collection('categorias').doc(catId);
            batch.update(ref, { productosCount: productosPorCategoria[catId] });
        });
        
        // También actualizar las categorías sin productos a 0
        categorias.forEach(cat => {
            if (!productosPorCategoria[cat.id]) {
                const ref = db.collection('categorias').doc(cat.id);
                batch.update(ref, { productosCount: 0 });
            }
        });
        
        await batch.commit();
        
        console.log('📊 Estadísticas actualizadas');
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ==================== CREAR CATEGORÍAS PREDEFINIDAS ====================
async function crearCategoriasPredefinidas() {
    const predefinidas = [
        { nombre: 'Medicamentos', descripcion: 'Medicamentos de venta libre y con receta', color: '#3b82f6', icono: 'fa-pills' },
        { nombre: 'Vitaminas y Suplementos', descripcion: 'Vitaminas, minerales y suplementos alimenticios', color: '#10b981', icono: 'fa-leaf' },
        { nombre: 'Cuidado Personal', descripcion: 'Productos de higiene y cuidado personal', color: '#8b5cf6', icono: 'fa-soap' },
        { nombre: 'Primeros Auxilios', descripcion: 'Vendas, curitas y material médico', color: '#ef4444', icono: 'fa-band-aid' },
        { nombre: 'Bebé y Maternidad', descripcion: 'Productos para bebés y madres', color: '#f59e0b', icono: 'fa-baby' },
        { nombre: 'Otros', descripcion: 'Otros productos de farmacia', color: '#6b7280', icono: 'fa-tag' }
    ];
    
    try {
        console.log('🚀 Creando categorías predefinidas...');
        
        for (const cat of predefinidas) {
            await db.collection('categorias').add({
                ...cat,
                activa: true,
                productosCount: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Categoría creada: ${cat.nombre}`);
        }
        
        console.log('✅ Todas las categorías predefinidas fueron creadas exitosamente');
        alert('✅ ¡6 categorías predefinidas creadas con éxito!');
        
        await cargarCategorias();
        await cargarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error al crear categorías predefinidas:', error);
        alert('Error al crear categorías predefinidas: ' + error.message);
    }
}

// Exponer función para uso desde consola
window.crearCategoriasPredefinidas = crearCategoriasPredefinidas;
