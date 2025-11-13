# 🔐 Sistema de Roles y Permisos

## Implementación Completada

### 📁 Archivos Creados

1. **`public/js/utils/roles.js`** (240 líneas)
   - Sistema completo de gestión de roles y permisos
   - Funciones de verificación de acceso
   - Control granular por módulo y acción

2. **`public/system-utils.html`** (280 líneas)
   - Página de utilidades del sistema
   - Actualización de rol de administrador
   - Verificación de permisos
   - Información y documentación de roles

3. **Actualizaciones en archivos existentes:**
   - `dashboard.html`: Agregado menú de utilidades + script de roles
   - `dashboard.js`: Función para ocultar menú según rol

---

## 🎯 Roles Definidos

### 👑 **ADMIN (Administrador)**
Acceso completo al sistema:
- ✅ Gestión de productos (crear, editar, eliminar)
- ✅ Gestión de ventas completa
- ✅ Acceso a reportes con exportación
- ✅ Gestión de usuarios (crear empleados)
- ✅ Gestión de categorías
- ✅ Configuración del sistema
- ✅ Acceso a utilidades

### 👤 **EMPLEADO**
Acceso limitado:
- ✅ Realizar ventas
- ✅ Ver reportes (sin exportar)
- ❌ **SIN acceso a:**
  - Productos
  - Usuarios
  - Categorías
  - Configuración
  - Utilidades

---

## 🔧 Funciones Principales en `roles.js`

### Verificación de Roles
```javascript
getCurrentUserRole()    // Retorna 'admin' o 'empleado'
isAdmin()              // Retorna true si es admin
isEmpleado()           // Retorna true si es empleado
```

### Verificación de Permisos
```javascript
hasPermission('productos', 'view')   // Verificar si puede ver productos
hasPermission('ventas', 'create')    // Verificar si puede crear ventas
hasPermission('reportes', 'export')  // Verificar si puede exportar
```

### Protección de Páginas
```javascript
// Solo admins pueden acceder
await protectPageByRole(['admin'], 'dashboard.html');

// Admins y empleados pueden acceder
await protectPageByRole(['admin', 'empleado'], 'dashboard.html');
```

### Control de UI
```javascript
// Ocultar elementos si no tiene permiso
hideIfNoPermission('productos', 'create', '#btnNuevoProducto');

// Deshabilitar elementos si no tiene permiso
disableIfNoPermission('ventas', 'delete', '.btn-eliminar');

// Actualizar menú lateral según rol
updateSidebarByPermissions();
```

---

## 📊 Estructura de Permisos

```javascript
const PERMISSIONS = {
    admin: {
        productos:   { view: true, create: true, edit: true, delete: true },
        ventas:      { view: true, create: true, edit: true, delete: true },
        reportes:    { view: true, export: true },
        usuarios:    { view: true, create: true, edit: true, delete: true },
        categorias:  { view: true, create: true, edit: true, delete: true },
        configuracion: { view: true, edit: true }
    },
    empleado: {
        productos:   { view: false, create: false, edit: false, delete: false },
        ventas:      { view: true, create: true, edit: false, delete: false },
        reportes:    { view: true, export: false },
        usuarios:    { view: false, create: false, edit: false, delete: false },
        categorias:  { view: false, create: false, edit: false, delete: false },
        configuracion: { view: false, edit: false }
    }
};
```

---

## 🚀 Cómo Usar

### Paso 1: Actualizar Rol del Admin Actual

1. Inicia sesión con `admin@farmacia.com`
2. Ve a: **http://localhost:5003/system-utils.html**
3. Haz clic en **"Actualizar Rol de Admin"**
4. Espera el mensaje de éxito
5. **Cierra sesión y vuelve a iniciar sesión**

### Paso 2: Verificar que Funcionó

1. En la misma página de utilidades, haz clic en **"Verificar Permisos"**
2. Deberías ver:
   - **Rol:** ADMINISTRADOR
   - **Permisos:** ✅ en todos los módulos

### Paso 3: Proteger Páginas (Próximo Paso)

Agregar al inicio de cada página:

```javascript
// En productos.html - Solo admin
document.addEventListener('DOMContentLoaded', async function() {
    const { role } = await protectPageByRole(['admin'], 'dashboard.html');
    
    // Resto del código...
});
```

```javascript
// En ventas.html - Admin y empleado
document.addEventListener('DOMContentLoaded', async function() {
    const { role } = await protectPageByRole(['admin', 'empleado'], 'dashboard.html');
    
    // Si es empleado, ocultar botón eliminar
    if (role === 'empleado') {
        hideIfNoPermission('ventas', 'delete', '.btn-eliminar');
    }
    
    // Resto del código...
});
```

---

## 📝 Estructura en Firestore

### Collection: `users`

```json
{
  "uid": "abc123...",
  "email": "admin@farmacia.com",
  "name": "Administrador",
  "role": "admin",           // 👈 Campo nuevo
  "created_at": timestamp,
  "updated_at": timestamp
}
```

**Valores válidos para `role`:**
- `"admin"` - Administrador (acceso completo)
- `"empleado"` - Empleado (acceso limitado)

---

## ✅ Estado Actual

### Completado:
- ✅ Sistema de roles implementado
- ✅ Funciones de verificación creadas
- ✅ Página de utilidades funcional
- ✅ Menú del dashboard se oculta según rol
- ✅ Documentación completa

### Pendiente:
- ⏳ Actualizar rol de admin en Firestore (usar system-utils.html)
- ⏳ Proteger cada página con `protectPageByRole()`
- ⏳ Ocultar/deshabilitar botones según permisos
- ⏳ Crear página de gestión de usuarios
- ⏳ Implementar sistema de categorías

---

## 🎓 Próximos Pasos

1. **Actualizar rol de admin** usando system-utils.html
2. **Probar el sistema** con el usuario admin
3. **Crear página de usuarios** para que admin pueda crear empleados
4. **Proteger todas las páginas** con verificación de roles
5. **Implementar categorías** para productos

---

## 🐛 Troubleshooting

### El menú no se oculta para empleados
- Verifica que el usuario tenga el campo `role` en Firestore
- Cierra sesión y vuelve a iniciar sesión
- Abre la consola (F12) y busca: "🔐 Actualizando menú para rol:"

### No puedo acceder a system-utils.html
- Verifica que el servidor esté corriendo: `http://localhost:5003`
- Asegúrate de estar autenticado
- Revisa la consola del navegador para errores

### El rol no se actualiza
- Usa la página system-utils.html
- Verifica que el email sea correcto: `admin@farmacia.com`
- Revisa Firestore en Firebase Console para confirmar el cambio

---

## 📚 Referencias

- **roles.js**: `/public/js/utils/roles.js`
- **system-utils.html**: `/public/system-utils.html`
- **dashboard.js**: `/public/js/dashboard.js`
- **Firebase Users Collection**: `users`

---

**Última actualización:** 13 de noviembre de 2025
