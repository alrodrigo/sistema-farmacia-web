# 🗺️ Roadmap de Refactorización y Arquitectura

## 📌 Deuda Técnica y Mejoras Futuras
- [ ] **Implementación de Route Guards (Middleware):** Centralizar la lógica de `auth.onAuthStateChanged` en un archivo `services/auth.guard.js` para proteger rutas globalmente sin violar el principio DRY.
- [ ] **Componentización de la Interfaz (UI):** Abstraer elementos HTML repetitivos (Navbar, Sidebar, Modales base) para inyectarlos dinámicamente y limpiar los archivos `.html`.
- [ ] **Gestión Centralizada de SDKs:** Consolidar la carga de scripts de Firebase y librerías externas para no declararlos en cada vista individual.
- [ ] **Mejorar los modales de exito o avisos en general**
- [ ] **Poder crear una categoria dentro del modal de categoria**
- [ ] **Estandarización del modelo de datos de Productos (Migración `categoriaId` -> `category`):** Ejecutar un script de migración único para asegurar que todos los documentos en la colección `products` utilicen exclusivamente el campo `category`, eliminando referencias legadas a `categoriaId`.
- [ ] **Optimización de Contadores de Categorías (Server-side Count o Enfoque Proactivo):** Reemplazar la sincronización pesada en memoria (`products.get()`) en `categoria.service.js`.
  - *Opción A (SDK Modular):* Migrar a Firebase Modular para habilitar `getCountFromServer()`.
  - *Opción B (Contadores Atómicos):* Incrementar o decrementar el contador en tiempo real con `FieldValue.increment()` desde `productos.js` al crear, editar o eliminar productos.

-[ ] **Buscador en categorias, en proveedores, filtros**

