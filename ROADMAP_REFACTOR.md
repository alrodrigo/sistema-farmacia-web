# 🗺️ Roadmap de Refactorización y Arquitectura

## 📌 Deuda Técnica y Mejoras Futuras
- [x] **Implementación de Route Guards (Middleware):** Centralizado en `public/js/middleware/auth.guard.js` con protección de rutas por roles (RBAC/PBAC), caché de sesión en memoria RAM (`sessionStorage`), pintado automático de Navbar/Sidebar y logout unificado.
- [x] **Componentización de la Interfaz (UI - Navbar y Sidebar):** Abstraído e inyectado limpiamente con `LayoutUI` (`public/js/ui/layout.ui.js`) orquestado por `AuthGuard.applyUnifiedUI()`, eliminando más de 500 líneas de código HTML repetido en todas las vistas de `public/pages/`, con detección de pestaña activa y cierre de sesión global.
- [x] **Gestión Centralizada de Alertas y Diálogos Asíncronos (Toast & ConfirmDialog):** Erradicación total de `alert()` y `confirm()` bloqueantes del navegador. Implementación de `Toast` (`public/js/utils/toast.js`) para avisos no intrusivos con animación y autodestrucción, y `ConfirmDialog` (`public/js/utils/confirm.js`) para modales de confirmación basados en Promesas (`async/await`) con diseño moderno y soporte para Escape.
- [ ] **Gestión Centralizada de SDKs:** Consolidar la carga de scripts de Firebase y librerías externas para no declararlos en cada vista individual.
- [ ] **Poder crear una categoria dentro del modal de categoria**
- [ ] **Estandarización del modelo de datos de Productos (Migración `categoriaId` -> `category`):** Ejecutar un script de migración único para asegurar que todos los documentos en la colección `products` utilicen exclusivamente el campo `category`, eliminando referencias legadas a `categoriaId`.
- [ ] **Optimización de Contadores de Categorías (Server-side Count o Enfoque Proactivo):** Reemplazar la sincronización pesada en memoria (`products.get()`) en `categoria.service.js`.
  - *Opción A (SDK Modular):* Migrar a Firebase Modular para habilitar `getCountFromServer()`.
  - *Opción B (Contadores Atómicos):* Incrementar o decrementar el contador en tiempo real con `FieldValue.increment()` desde `productos.js` al crear, editar o eliminar productos.

-[ ] **Buscador en categorias, en proveedores, filtros**
- [x] **Gestión Integral de Usuarios (CRUD en Modal sin perder sesión):** Implementada creación de usuarios con instancia secundaria de Firebase Auth en `UsuarioService.create()`, eliminación definitiva del archivo temporal `crear-usuarios.html`, reseteo seguro de contraseña vía email y validación de usuarios inactivos/eliminados en `AuthGuard`.
-[ ] **optimizar las consultas de los reportes**
