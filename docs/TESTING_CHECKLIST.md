# 🧪 CHECKLIST DE TESTING - Sistema Farmacia Web

**Fecha:** 2 de diciembre de 2025  
**Versión:** 1.0  
**Testeador:** Rodrigo  

---

## 📋 INSTRUCCIONES

Para cada sección:
1. Realizar las pruebas en orden
2. Marcar ✅ si funciona correctamente
3. Marcar ❌ si hay error y anotar el problema
4. Probar con **admin** y **empleado** cuando aplique

**Credenciales de prueba:**
- **Admin:** alrodrigo25@hotmail.com / server
- **Empleado:** vendedor@servisalud.com / server

---

## 1️⃣ AUTENTICACIÓN Y SEGURIDAD

### Login
- [ ] Login con credenciales correctas de admin
- [ ] Login con credenciales correctas de empleado
- [ ] Login con credenciales incorrectas (debe rechazar)
- [ ] Login con email inválido (debe mostrar error)
- [ ] Login con campos vacíos (debe mostrar error)
- [ ] Redirección a dashboard después de login exitoso
- [ ] Sesión persiste al recargar página
- [ ] Logout funciona correctamente

### Seguridad
- [ ] Usuario no autenticado es redirigido a login
- [ ] Todas las páginas protegidas requieren autenticación
- [ ] No hay errores en consola relacionados con Firebase

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 2️⃣ DASHBOARD

### Visualización
- [ ] Todas las tarjetas de estadísticas muestran datos
- [ ] Total de productos se calcula correctamente
- [ ] Valor del inventario se calcula correctamente
- [ ] Productos con stock bajo se cuenta correctamente
- [ ] Ventas del día se muestran
- [ ] Gráfico de ventas se carga
- [ ] Actividad reciente se muestra

### Funcionalidad
- [ ] Menú lateral se muestra correctamente
- [ ] Links de navegación funcionan
- [ ] Nombre de usuario se muestra en navbar
- [ ] Rol de usuario se muestra correctamente
- [ ] Notificaciones se muestran (si hay)

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 3️⃣ MÓDULO DE PRODUCTOS

### Visualización
- [ ] Lista de productos se carga correctamente
- [ ] Paginación funciona (anterior/siguiente)
- [ ] Tarjetas de información muestran datos correctos
- [ ] Filtros por categoría funcionan
- [ ] Filtros por proveedor funcionan
- [ ] Búsqueda por nombre funciona
- [ ] Productos con stock bajo se marcan en rojo

### Crear Producto
- [ ] Modal se abre correctamente
- [ ] Validación: Nombre vacío (debe rechazar)
- [ ] Validación: Nombre menor a 3 caracteres (debe rechazar)
- [ ] Validación: SKU vacío (debe rechazar)
- [ ] Validación: SKU duplicado (debe rechazar)
- [ ] Validación: Código de barras menor a 8 dígitos (debe rechazar)
- [ ] Validación: Código de barras duplicado (debe rechazar)
- [ ] Validación: Costo vacío (debe rechazar)
- [ ] Validación: Costo negativo (debe rechazar)
- [ ] Validación: Costo = 0 (debe rechazar)
- [ ] Validación: Precio vacío (debe rechazar)
- [ ] Validación: Precio negativo (debe rechazar)
- [ ] Validación: Precio menor o igual a costo (debe rechazar)
- [ ] Validación: Stock negativo (debe rechazar)
- [ ] Cálculo de margen de ganancia funciona
- [ ] Producto se crea correctamente con datos válidos
- [ ] Mensaje de éxito se muestra
- [ ] Lista se actualiza automáticamente

### Editar Producto
- [ ] Modal de edición se abre con datos correctos
- [ ] Campos se prellenan correctamente
- [ ] Validaciones funcionan igual que en crear
- [ ] Cambios se guardan correctamente
- [ ] Lista se actualiza después de editar

### Eliminar Producto
- [ ] Modal de confirmación se muestra
- [ ] Producto se elimina correctamente
- [ ] Lista se actualiza después de eliminar
- [ ] No se puede eliminar si hay un error

### Ver Detalles
- [ ] Modal de ver detalles muestra toda la información
- [ ] Fechas se muestran correctamente
- [ ] Información del proveedor se muestra

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 4️⃣ MÓDULO DE CATEGORÍAS

### Visualización
- [ ] Lista de categorías se carga
- [ ] Contador de productos por categoría es correcto
- [ ] Iconos se muestran correctamente
- [ ] Colores se aplican correctamente

### Crear Categoría
- [ ] Modal se abre
- [ ] Validación: Nombre vacío (debe rechazar)
- [ ] Selector de iconos funciona
- [ ] Selector de colores funciona
- [ ] Categoría se crea correctamente
- [ ] Lista se actualiza

### Editar Categoría
- [ ] Modal se abre con datos correctos
- [ ] Cambios se guardan correctamente

### Eliminar Categoría
- [ ] Advertencia si tiene productos asociados
- [ ] Categoría se elimina correctamente

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 5️⃣ MÓDULO DE PROVEEDORES

### Visualización
- [ ] Lista de proveedores se carga
- [ ] Contador de productos por proveedor es correcto
- [ ] Estado activo/inactivo se muestra
- [ ] Filtros funcionan

### Crear Proveedor
- [ ] Modal se abre correctamente
- [ ] Validación: Nombre vacío (debe rechazar)
- [ ] Validación: Nombre menor a 2 caracteres (debe rechazar)
- [ ] Validación: Nombre duplicado (debe rechazar)
- [ ] Validación: Email inválido (debe rechazar)
- [ ] Validación: Teléfono corto (debe rechazar)
- [ ] Validación: URL inválida (debe rechazar)
- [ ] Proveedor se crea correctamente
- [ ] Campos opcionales aceptan valores vacíos

### Editar Proveedor
- [ ] Modal se abre con datos correctos
- [ ] Validaciones funcionan
- [ ] Cambios se guardan

### Eliminar Proveedor
- [ ] Advertencia si tiene productos asociados
- [ ] Proveedor se elimina correctamente
- [ ] Productos asociados quedan sin proveedor

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 6️⃣ MÓDULO DE VENTAS (POS)

### Visualización
- [ ] Número de venta se muestra
- [ ] Fecha y hora se muestran y actualizan
- [ ] Buscador de productos funciona
- [ ] Resultados de búsqueda se muestran
- [ ] Productos sin stock se marcan como "Sin Stock"
- [ ] Botón "Agregar" deshabilitado si no hay stock

### Agregar al Carrito
- [ ] Producto se agrega correctamente
- [ ] Validación: No se puede agregar sin stock
- [ ] Validación: No excede stock disponible
- [ ] Cantidad se puede aumentar con botón +
- [ ] Cantidad se puede disminuir con botón -
- [ ] Validación: No permite cantidad mayor a stock
- [ ] Producto se puede quitar del carrito
- [ ] Carrito se puede limpiar completamente

### Cálculo de Totales
- [ ] Subtotal se calcula correctamente
- [ ] Descuento porcentual funciona
- [ ] Descuento fijo funciona
- [ ] Validación: Descuento no puede ser negativo
- [ ] Validación: Descuento % no puede ser mayor a 100
- [ ] Total se calcula correctamente
- [ ] Total de items es correcto

### Métodos de Pago
- [ ] Selector de método de pago funciona
- [ ] Pago en efectivo muestra campo "Monto recibido"
- [ ] Cálculo de cambio funciona correctamente
- [ ] Validación: Monto recibido vacío (debe rechazar)
- [ ] Validación: Monto recibido insuficiente (debe rechazar)
- [ ] Tarjeta/Transferencia no requieren monto recibido

### Procesar Venta
- [ ] Validación: Carrito vacío (debe rechazar)
- [ ] Validación: Stock insuficiente (debe rechazar)
- [ ] Validación: Método de pago obligatorio (debe rechazar)
- [ ] Venta se procesa correctamente
- [ ] Stock se descuenta automáticamente
- [ ] Venta se guarda en Firestore
- [ ] Modal de éxito se muestra
- [ ] Carrito se limpia después de venta
- [ ] Número de venta se incrementa

### Imprimir Ticket
- [ ] Botón de imprimir funciona
- [ ] Vista previa se muestra correctamente
- [ ] Ticket tiene toda la información:
  - [ ] Logo de la farmacia
  - [ ] Información de la farmacia
  - [ ] Número de venta
  - [ ] Fecha y hora
  - [ ] Vendedor
  - [ ] Lista de productos
  - [ ] Subtotal, descuento, total
  - [ ] Método de pago
  - [ ] Monto recibido y cambio (si es efectivo)
  - [ ] Mensaje de agradecimiento
- [ ] Impresión sale en **1 sola página**
- [ ] Formato es legible

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 7️⃣ MÓDULO DE REPORTES

### Visualización
- [ ] Página de reportes se carga
- [ ] Selector de rango de fechas funciona
- [ ] Reporte de ventas se genera
- [ ] Reporte de productos se genera
- [ ] Reporte de inventario se genera
- [ ] Gráficos se muestran correctamente
- [ ] Datos son precisos

### Exportación
- [ ] Botón de exportar funciona (si está implementado)
- [ ] PDF se genera correctamente (si está implementado)

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 8️⃣ MÓDULO DE USUARIOS

### Visualización (Solo Admin)
- [ ] Lista de usuarios se carga
- [ ] Rol se muestra correctamente
- [ ] Estado activo/inactivo se muestra

### Editar Usuario (Solo Admin)
- [ ] Modal se abre con datos correctos
- [ ] Validación: Nombre vacío (debe rechazar)
- [ ] Validación: Nombre menor a 3 caracteres (debe rechazar)
- [ ] Validación: Nombre con números (debe rechazar)
- [ ] Validación: Email inválido (debe rechazar)
- [ ] Validación: Rol inválido (debe rechazar)
- [ ] Cambios se guardan correctamente

### Crear Usuario
- [ ] Modal muestra instrucciones (creación vía admin)
- [ ] Validaciones funcionan en formulario
- [ ] Validación: Contraseña menor a 6 caracteres (debe rechazar)
- [ ] Validación: Contraseña sin letra (debe rechazar)
- [ ] Validación: Contraseña sin número (debe rechazar)
- [ ] Validación: Contraseñas no coinciden (debe rechazar)

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 9️⃣ PERMISOS POR ROL

### Como ADMIN (alrodrigo25@hotmail.com)
- [ ] Puede acceder a Dashboard
- [ ] Puede acceder a Productos
- [ ] Puede acceder a Categorías
- [ ] Puede acceder a Proveedores
- [ ] Puede acceder a Ventas
- [ ] Puede acceder a Reportes
- [ ] Puede acceder a Usuarios
- [ ] Puede crear productos
- [ ] Puede editar productos
- [ ] Puede eliminar productos
- [ ] Puede crear usuarios
- [ ] Puede editar usuarios
- [ ] Puede eliminar usuarios

### Como EMPLEADO (vendedor@servisalud.com)
- [ ] Puede acceder a Dashboard
- [ ] Puede acceder a Productos
- [ ] Puede acceder a Categorías
- [ ] Puede acceder a Proveedores
- [ ] Puede acceder a Ventas
- [ ] Puede acceder a Reportes
- [ ] NO puede acceder a Usuarios (debe ocultar/deshabilitar)
- [ ] Puede crear productos
- [ ] Puede editar productos
- [ ] NO puede eliminar productos (o solo los propios)
- [ ] NO puede crear usuarios
- [ ] NO puede editar usuarios
- [ ] NO puede eliminar usuarios

**Problemas encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 🔟 ERRORES EN CONSOLA

### Chrome DevTools
- [ ] Abrir consola (F12)
- [ ] Navegar por todas las páginas
- [ ] Verificar que NO haya:
  - [ ] Errores de JavaScript (rojo)
  - [ ] Errores de Firebase
  - [ ] Errores 404 de archivos
  - [ ] Warnings críticos

### Network
- [ ] Todas las peticiones cargan correctamente
- [ ] No hay archivos faltantes (404)
- [ ] Firebase conecta correctamente

**Errores encontrados:**
```
[Anotar aquí cualquier error]
```

---

## 📊 RESUMEN DE TESTING

**Total de pruebas:** ~150  
**Pruebas exitosas:** ___  
**Pruebas fallidas:** ___  
**Tasa de éxito:** ___%  

### Errores Críticos (Bloquean funcionalidad)
1. 
2. 
3. 

### Errores Menores (No bloquean pero molestan)
1. 
2. 
3. 

### Mejoras Sugeridas
1. 
2. 
3. 

---

## ✅ APROBACIÓN FINAL

- [ ] Todos los módulos principales funcionan
- [ ] Validaciones funcionan correctamente
- [ ] No hay errores críticos
- [ ] Sistema listo para entrega

**Firma del testeador:** _______________  
**Fecha:** _______________

---

**Notas adicionales:**
```
[Espacio para comentarios finales]
```
