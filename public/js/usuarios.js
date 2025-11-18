// =====================================================
// ARCHIVO: usuarios.js
// PROPÓSITO: Lógica de la página de gestión de usuarios
// =====================================================

console.log('👥 Usuarios.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;
let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let modoEdicion = false;
let usuarioEditandoId = null;

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, iniciando página de usuarios...');
    
    // Verificar autenticación
    await verificarAutenticacion();
    
    // Configurar eventos
    configurarEventos();
    
    // Cargar usuarios
    await cargarUsuarios();
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
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
                        
                        // Verificar que sea admin
                        if (currentUser.role !== 'admin') {
                            alert('⚠️ No tienes permisos para acceder a esta página');
                            window.location.href = 'dashboard.html';
                            return;
                        }
                        
                        // Mostrar nombre del usuario
                        mostrarNombreUsuario();
                        
                        // Actualizar menú según rol
                        actualizarMenuPorRol();
                        
                        resolve();
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

// ===== 5. MOSTRAR NOMBRE DEL USUARIO =====
function mostrarNombreUsuario() {
    const userName = document.getElementById('userName');
    if (userName && currentUser) {
        const displayName = getUserDisplayName(currentUser);
        userName.textContent = displayName;
        console.log('👤 Usuario mostrado:', displayName);
    }
}

// ===== 6. ACTUALIZAR MENÚ POR ROL =====
function actualizarMenuPorRol() {
    const role = currentUser?.role;
    console.log('🔐 Actualizando menú para rol:', role);
    
    // Solo admin puede ver usuarios
    if (role !== 'admin') {
        window.location.href = 'dashboard.html';
    }
}

// ===== 7. CONFIGURAR EVENTOS =====
function configurarEventos() {
    console.log('🔘 Configurando eventos...');
    
    // Botón nuevo usuario
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', abrirModalNuevo);
    }
    
    // Cerrar modal usuario
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelar');
    
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer click fuera
    const modal = document.getElementById('usuarioModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });
    }
    
    // Formulario de usuario
    const usuarioForm = document.getElementById('usuarioForm');
    if (usuarioForm) {
        usuarioForm.addEventListener('submit', guardarUsuario);
    }
    
    // Cambiar de rol - mostrar permisos
    const inputRol = document.getElementById('inputRol');
    if (inputRol) {
        inputRol.addEventListener('change', mostrarPermisosRol);
    }
    
    // Toggle password visibility
    const btnTogglePassword = document.getElementById('btnTogglePassword');
    if (btnTogglePassword) {
        btnTogglePassword.addEventListener('click', togglePasswordVisibility);
    }
    
    // Modal de contraseña
    const btnCerrarPasswordModal = document.getElementById('btnCerrarPasswordModal');
    const btnCancelarPassword = document.getElementById('btnCancelarPassword');
    
    if (btnCerrarPasswordModal) btnCerrarPasswordModal.addEventListener('click', cerrarPasswordModal);
    if (btnCancelarPassword) btnCancelarPassword.addEventListener('click', cerrarPasswordModal);
    
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) cerrarPasswordModal();
        });
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', cambiarPassword);
    }
    
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltros);
    }
    
    // Filtro de rol
    const filterRol = document.getElementById('filterRol');
    if (filterRol) {
        filterRol.addEventListener('change', aplicarFiltros);
    }
    
    // Paginación
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual--;
                mostrarUsuarios();
            }
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPaginas = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
            if (paginaActual < totalPaginas) {
                paginaActual++;
                mostrarUsuarios();
            }
        });
    }
}

// ===== 8. CARGAR USUARIOS =====
async function cargarUsuarios() {
    console.log('👥 Cargando usuarios desde Firestore...');
    
    try {
        const snapshot = await firebaseDB.collection('users').get();
        
        todosLosUsuarios = [];
        snapshot.forEach(doc => {
            todosLosUsuarios.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordenar por nombre
        todosLosUsuarios.sort((a, b) => {
            const nameA = (a.name || a.email).toLowerCase();
            const nameB = (b.name || b.email).toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Inicialmente, usuarios filtrados = todos los usuarios
        usuariosFiltrados = [...todosLosUsuarios];
        
        console.log(`✅ ${todosLosUsuarios.length} usuarios cargados`);
        
        // Mostrar en la tabla
        mostrarUsuarios();
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error al cargar usuarios:', error);
        alert('Error al cargar usuarios. Por favor, recarga la página.');
    }
}

// ===== 9. MOSTRAR USUARIOS EN LA TABLA =====
function mostrarUsuarios() {
    const tbody = document.getElementById('usuariosTableBody');
    
    if (!tbody) return;
    
    // Calcular usuarios de la página actual
    const inicio = (paginaActual - 1) * usuariosPorPagina;
    const fin = inicio + usuariosPorPagina;
    const usuariosActuales = usuariosFiltrados.slice(inicio, fin);
    
    // Si no hay usuarios
    if (usuariosActuales.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <h3>No se encontraron usuarios</h3>
                        <p>Intenta ajustar los filtros o crea un nuevo usuario</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generar filas de la tabla
    tbody.innerHTML = usuariosActuales.map(usuario => {
        const fechaRegistro = usuario.created_at ? 
            formatDate(usuario.created_at.toDate()) : 'N/A';
        
        const ultimoAcceso = usuario.last_login ? 
            formatDate(usuario.last_login.toDate()) : 'Nunca';
        
        const isCurrentUser = usuario.id === currentUser.uid;
        const deleteDisabled = isCurrentUser ? 'disabled' : '';
        
        return `
        <tr data-id="${usuario.id}">
            <td>
                <div class="user-name">
                    <i class="fas fa-user-circle"></i>
                    ${usuario.name || 'Sin nombre'}
                    ${isCurrentUser ? '<span class="badge-estado activo">(Tú)</span>' : ''}
                </div>
            </td>
            <td>
                <div class="user-email">${usuario.email}</div>
            </td>
            <td>
                <span class="badge-rol ${usuario.role}">
                    <i class="fas fa-${usuario.role === 'admin' ? 'user-shield' : 'user-tag'}"></i>
                    ${usuario.role === 'admin' ? 'Administrador' : 'Empleado'}
                </span>
            </td>
            <td>${fechaRegistro}</td>
            <td>${ultimoAcceso}</td>
            <td>
                <span class="badge-estado activo">
                    <i class="fas fa-circle"></i>
                    Activo
                </span>
            </td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editarUsuario('${usuario.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-password" onclick="abrirModalPassword('${usuario.id}')" title="Cambiar contraseña">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="eliminarUsuario('${usuario.id}', '${usuario.name || usuario.email}')" title="Eliminar" ${deleteDisabled}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    // Actualizar paginación
    actualizarPaginacion();
    
    console.log(`📋 Mostrando ${usuariosActuales.length} usuarios (página ${paginaActual})`);
}

// ===== 10. ACTUALIZAR ESTADÍSTICAS =====
function actualizarEstadisticas() {
    document.getElementById('totalUsuarios').textContent = todosLosUsuarios.length;
    
    const admins = todosLosUsuarios.filter(u => u.role === 'admin').length;
    document.getElementById('totalAdmins').textContent = admins;
    
    const empleados = todosLosUsuarios.filter(u => u.role === 'empleado').length;
    document.getElementById('totalEmpleados').textContent = empleados;
    
    // Activostoday - usuarios con last_login hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const activosHoy = todosLosUsuarios.filter(u => {
        if (!u.last_login) return false;
        const loginDate = u.last_login.toDate();
        loginDate.setHours(0, 0, 0, 0);
        return loginDate.getTime() === hoy.getTime();
    }).length;
    document.getElementById('activosHoy').textContent = activosHoy;
}

// ===== 11. APLICAR FILTROS =====
function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterRol = document.getElementById('filterRol').value;
    
    usuariosFiltrados = todosLosUsuarios.filter(usuario => {
        // Filtro de búsqueda
        const coincideBusqueda = !searchTerm || 
            (usuario.name && usuario.name.toLowerCase().includes(searchTerm)) ||
            usuario.email.toLowerCase().includes(searchTerm);
        
        // Filtro de rol
        const coincideRol = !filterRol || usuario.role === filterRol;
        
        return coincideBusqueda && coincideRol;
    });
    
    // Reiniciar a página 1
    paginaActual = 1;
    mostrarUsuarios();
}

// ===== 12. ACTUALIZAR PAGINACIÓN =====
function actualizarPaginacion() {
    const totalPaginas = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
    
    document.getElementById('paginationInfo').textContent = 
        `Página ${paginaActual} de ${totalPaginas || 1}`;
    
    document.getElementById('btnPrevPage').disabled = paginaActual === 1;
    document.getElementById('btnNextPage').disabled = paginaActual === totalPaginas || totalPaginas === 0;
}

// ===== 13. ABRIR MODAL NUEVO =====
function abrirModalNuevo() {
    console.log('📝 Abriendo modal para nuevo usuario');
    
    modoEdicion = false;
    usuarioEditandoId = null;
    
    // Cambiar título
    document.getElementById('modalTitleText').innerHTML = 
        '<i class="fas fa-user-plus"></i> Nuevo Usuario';
    document.getElementById('btnGuardarText').textContent = 'Crear Usuario';
    
    // Limpiar formulario
    document.getElementById('usuarioForm').reset();
    limpiarErrores();
    
    // Mostrar sección de password
    document.getElementById('seccionPassword').style.display = 'block';
    document.getElementById('inputPassword').required = true;
    document.getElementById('inputConfirmPassword').required = true;
    
    // Limpiar info de rol
    document.getElementById('infoRol').innerHTML = `
        <i class="fas fa-info-circle"></i>
        <div>
            <strong>Selecciona un rol para ver los permisos</strong>
        </div>
    `;
    
    // Mostrar modal
    document.getElementById('usuarioModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== 14. EDITAR USUARIO =====
async function editarUsuario(id) {
    console.log('✏️ Editando usuario:', id);
    
    const usuario = todosLosUsuarios.find(u => u.id === id);
    if (!usuario) {
        alert('Usuario no encontrado');
        return;
    }
    
    modoEdicion = true;
    usuarioEditandoId = id;
    
    // Cambiar título
    document.getElementById('modalTitleText').innerHTML = 
        '<i class="fas fa-user-edit"></i> Editar Usuario';
    document.getElementById('btnGuardarText').textContent = 'Actualizar Usuario';
    
    // Ocultar sección de password
    document.getElementById('seccionPassword').style.display = 'none';
    document.getElementById('inputPassword').required = false;
    document.getElementById('inputConfirmPassword').required = false;
    
    // Llenar formulario
    document.getElementById('inputNombre').value = usuario.name || '';
    document.getElementById('inputEmail').value = usuario.email || '';
    document.getElementById('inputRol').value = usuario.role || '';
    
    // Mostrar permisos del rol
    mostrarPermisosRol();
    
    limpiarErrores();
    
    // Mostrar modal
    document.getElementById('usuarioModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== 15. CERRAR MODAL =====
function cerrarModal() {
    console.log('❌ Cerrando modal');
    document.getElementById('usuarioModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ===== 16. GUARDAR USUARIO =====
async function guardarUsuario(event) {
    event.preventDefault();
    console.log('💾 Intentando guardar usuario...');
    
    // Validar formulario
    if (!validarFormulario()) {
        console.log('❌ Formulario inválido');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardar');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const nombre = document.getElementById('inputNombre').value.trim();
        const email = document.getElementById('inputEmail').value.trim().toLowerCase();
        const rol = document.getElementById('inputRol').value;
        
        if (modoEdicion) {
            // Actualizar usuario existente en Firestore
            await firebaseDB.collection('users').doc(usuarioEditandoId).update({
                name: nombre,
                role: rol,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Usuario actualizado:', usuarioEditandoId);
            alert('✅ Usuario actualizado correctamente');
            
        } else {
            // Crear nuevo usuario
            const password = document.getElementById('inputPassword').value;
            
            // Nota: No podemos crear usuarios desde el cliente debido a restricciones de Firebase
            // Necesitamos usar Firebase Admin SDK o Cloud Functions
            
            alert(`⚠️ CREAR USUARIO MANUALMENTE\n\nPara crear este usuario:\n\n1. Ve a Firebase Console → Authentication\n2. Click en "Add user"\n3. Email: ${email}\n4. Password: ${password}\n5. Copia el UID generado\n\nLuego ejecuta en la consola del navegador:\n\nawait firebaseDB.collection('users').doc('UID_COPIADO').set({\n  email: '${email}',\n  name: '${nombre}',\n  role: '${rol}',\n  created_at: firebase.firestore.FieldValue.serverTimestamp(),\n  updated_at: firebase.firestore.FieldValue.serverTimestamp()\n});\n\n✅ Para futuras implementaciones, crear una Cloud Function.`);
            
            console.log('💡 Datos del usuario a crear:', { email, nombre, rol, password });
        }
        
        // Cerrar modal y recargar usuarios
        cerrarModal();
        await cargarUsuarios();
        
    } catch (error) {
        console.error('❌ Error al guardar usuario:', error);
        
        let errorMessage = 'Error al guardar el usuario.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este correo ya está registrado';
            document.getElementById('errorEmail').textContent = errorMessage;
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Correo electrónico inválido';
            document.getElementById('errorEmail').textContent = errorMessage;
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña es muy débil';
            document.getElementById('errorPassword').textContent = errorMessage;
        }
        
        alert('❌ ' + errorMessage);
        
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
    }
}

// ===== 17. VALIDAR FORMULARIO =====
function validarFormulario() {
    limpiarErrores();
    let esValido = true;
    
    // Validar nombre
    const nombre = document.getElementById('inputNombre').value.trim();
    if (!nombre) {
        document.getElementById('errorNombre').textContent = 'El nombre es requerido';
        esValido = false;
    }
    
    // Validar email
    const email = document.getElementById('inputEmail').value.trim();
    if (!email) {
        document.getElementById('errorEmail').textContent = 'El email es requerido';
        esValido = false;
    } else if (!validarEmail(email)) {
        document.getElementById('errorEmail').textContent = 'Email inválido';
        esValido = false;
    }
    
    // Validar password (solo si es nuevo usuario)
    if (!modoEdicion) {
        const password = document.getElementById('inputPassword').value;
        const confirmPassword = document.getElementById('inputConfirmPassword').value;
        
        if (!password) {
            document.getElementById('errorPassword').textContent = 'La contraseña es requerida';
            esValido = false;
        } else if (password.length < 6) {
            document.getElementById('errorPassword').textContent = 'Mínimo 6 caracteres';
            esValido = false;
        }
        
        if (password !== confirmPassword) {
            document.getElementById('errorConfirmPassword').textContent = 'Las contraseñas no coinciden';
            esValido = false;
        }
    }
    
    // Validar rol
    const rol = document.getElementById('inputRol').value;
    if (!rol) {
        document.getElementById('errorRol').textContent = 'Debes seleccionar un rol';
        esValido = false;
    }
    
    return esValido;
}

// ===== 18. VALIDAR EMAIL =====
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ===== 19. LIMPIAR ERRORES =====
function limpiarErrores() {
    const errorSpans = document.querySelectorAll('.error-message');
    errorSpans.forEach(span => span.textContent = '');
}

// ===== 20. MOSTRAR PERMISOS DEL ROL =====
function mostrarPermisosRol() {
    const rol = document.getElementById('inputRol').value;
    const infoRol = document.getElementById('infoRol');
    
    if (rol === 'admin') {
        infoRol.innerHTML = `
            <i class="fas fa-user-shield"></i>
            <div>
                <strong>Permisos de Administrador</strong>
                <p>Acceso completo al sistema:</p>
                <ul>
                    <li>Gestionar productos y categorías</li>
                    <li>Realizar y consultar ventas</li>
                    <li>Ver reportes y exportar datos</li>
                    <li>Administrar usuarios del sistema</li>
                </ul>
            </div>
        `;
    } else if (rol === 'empleado') {
        infoRol.innerHTML = `
            <i class="fas fa-user-tag"></i>
            <div>
                <strong>Permisos de Empleado</strong>
                <p>Acceso limitado al sistema:</p>
                <ul>
                    <li>Realizar ventas</li>
                    <li>Consultar productos</li>
                    <li>Ver reportes de ventas</li>
                    <li>No puede modificar productos ni usuarios</li>
                </ul>
            </div>
        `;
        infoRol.classList.remove('warning');
    } else {
        infoRol.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Selecciona un rol para ver los permisos</strong>
            </div>
        `;
    }
}

// ===== 21. TOGGLE PASSWORD VISIBILITY =====
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('inputPassword');
    const btnToggle = document.getElementById('btnTogglePassword');
    const icon = btnToggle.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== 22. ABRIR MODAL CAMBIAR CONTRASEÑA =====
function abrirModalPassword(id) {
    console.log('🔑 Abriendo modal de contraseña para usuario:', id);
    
    usuarioEditandoId = id;
    
    // Limpiar formulario
    document.getElementById('passwordForm').reset();
    limpiarErroresPassword();
    
    // Mostrar modal
    document.getElementById('passwordModal').classList.add('active');
}

// ===== 23. CERRAR MODAL PASSWORD =====
function cerrarPasswordModal() {
    console.log('❌ Cerrando modal de contraseña');
    document.getElementById('passwordModal').classList.remove('active');
    usuarioEditandoId = null;
}

// ===== 24. CAMBIAR CONTRASEÑA =====
async function cambiarPassword(event) {
    event.preventDefault();
    console.log('🔑 Cambiando contraseña...');
    
    const newPassword = document.getElementById('inputNewPassword').value;
    const confirmPassword = document.getElementById('inputConfirmNewPassword').value;
    
    // Limpiar errores
    limpiarErroresPassword();
    
    // Validar
    if (newPassword.length < 6) {
        document.getElementById('errorNewPassword').textContent = 'Mínimo 6 caracteres';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        document.getElementById('errorConfirmNewPassword').textContent = 'Las contraseñas no coinciden';
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardarPassword');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
    
    try {
        // Nota: En Firebase Admin SDK se puede cambiar la contraseña
        // Desde el cliente necesitamos una Cloud Function
        // Por ahora solo actualizamos en Firestore como referencia
        
        await firebaseDB.collection('users').doc(usuarioEditandoId).update({
            password_updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Referencia de contraseña actualizada');
        alert('⚠️ Nota: Para cambiar la contraseña se requiere implementar una Cloud Function.\nPor ahora, pide al usuario que use "Olvidé mi contraseña" en el login.');
        
        cerrarPasswordModal();
        
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        alert('Error al cambiar la contraseña');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
    }
}

// ===== 25. LIMPIAR ERRORES PASSWORD =====
function limpiarErroresPassword() {
    document.getElementById('errorNewPassword').textContent = '';
    document.getElementById('errorConfirmNewPassword').textContent = '';
}

// ===== 26. ELIMINAR USUARIO =====
async function eliminarUsuario(id, nombre) {
    console.log('🗑️ Intentando eliminar usuario:', id, nombre);
    
    // No permitir eliminar al usuario actual
    if (id === currentUser.uid) {
        alert('⚠️ No puedes eliminar tu propia cuenta');
        return;
    }
    
    const confirmar = confirm(`¿Estás seguro de eliminar al usuario:\n\n"${nombre}"?\n\n⚠️ Esta acción no se puede deshacer.`);
    
    if (!confirmar) {
        return;
    }
    
    try {
        // Eliminar de Firestore
        await firebaseDB.collection('users').doc(id).delete();
        console.log('✅ Usuario eliminado de Firestore:', id);
        
        alert(`✅ Usuario "${nombre}" eliminado correctamente.\n\n⚠️ Nota: La cuenta de Authentication debe eliminarse manualmente desde la consola de Firebase.`);
        
        // Recargar usuarios
        await cargarUsuarios();
        
    } catch (error) {
        console.error('❌ Error al eliminar usuario:', error);
        alert('❌ Error al eliminar el usuario. Verifica tus permisos.');
    }
}

// ===== 27. FORMAT DATE =====
function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('es-ES', options);
}

console.log('✅ Usuarios.js completamente cargado');
