# 🔒 Configurar Reglas de Seguridad de Firestore

## 📋 Problema Común

Si ves este error en la consola del navegador:
```
FirebaseError: Missing or insufficient permissions.
```

Significa que las **reglas de seguridad de Firestore** no permiten el acceso a las colecciones.

---

## ✅ Solución: Actualizar Reglas en Firebase Console

### **Paso 1: Acceder a Firebase Console**

1. Ve a: **https://console.firebase.google.com**
2. Selecciona tu proyecto
3. En el menú lateral, busca **"Firestore Database"**
4. Click en la pestaña **"Reglas"**

### **Paso 2: Copiar las Reglas Actualizadas**

Reemplaza todo el contenido con estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar autenticación
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Función para verificar si el usuario es admin
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Función para verificar si el usuario es empleado o admin
    function isEmployee() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'employee'];
    }
    
    // USUARIOS - Solo admin puede crear/modificar
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isAdmin();
      allow update, delete: if isAdmin() || request.auth.uid == userId;
    }
    
    // CATEGORÍAS (inglés) - Admin crea, todos leen
    match /categories/{categoryId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // CATEGORÍAS (español) - Admin crea, todos leen
    match /categorias/{categoryId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // PROVEEDORES/LABORATORIOS - Admin crea, todos leen
    match /suppliers/{supplierId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // PRODUCTOS - Admin gestiona, empleados leen
    match /products/{productId} {
      allow read: if isSignedIn();
      allow create, update: if isEmployee();
      allow delete: if isAdmin();
    }
    
    // VENTAS - Empleados pueden crear y leer
    match /sales/{saleId} {
      allow read: if isSignedIn();
      allow create: if isEmployee();
      allow update, delete: if isAdmin();
    }
    
    // ITEMS DE VENTA - Relacionados con ventas
    match /sale_items/{itemId} {
      allow read: if isSignedIn();
      allow create: if isEmployee();
      allow update, delete: if isAdmin();
    }
    
    // MOVIMIENTOS DE INVENTARIO - Solo lectura para empleados
    match /inventory_movements/{movementId} {
      allow read: if isSignedIn();
      allow create: if isEmployee();
      allow update, delete: if isAdmin();
    }
  }
}
```

### **Paso 3: Publicar las Reglas**

1. Haz click en el botón **"Publicar"** (arriba a la derecha)
2. Confirma la acción
3. Espera unos segundos a que se apliquen

---

## 🧪 Verificar que Funciona

1. Recarga tu página: **http://localhost:5003/categorias.html**
2. Abre la consola del navegador (F12)
3. Deberías ver:
   ```
   ✅ 0 categorías cargadas (sin índice)
   ```
   O si ya creaste categorías:
   ```
   ✅ 6 categorías cargadas
   ```

---

## 🚨 Reglas para Desarrollo vs Producción

### **Para Desarrollo (SOLO para testing rápido)**

Si quieres permitir todo temporalmente mientras desarrollas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **ADVERTENCIA**: Estas reglas permiten a cualquier usuario autenticado leer/escribir TODO. **SOLO úsalas en desarrollo.**

### **Para Producción (Recomendado)**

Usa las reglas completas mostradas arriba, que verifican roles y permisos específicos.

---

## 🔧 Desplegar con Firebase CLI (Opcional)

Si tienes Firebase CLI instalado, puedes desplegar las reglas desde la terminal:

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Login en Firebase
firebase login

# 3. Inicializar proyecto (solo la primera vez)
firebase init firestore

# 4. Desplegar reglas
firebase deploy --only firestore:rules
```

---

## 📚 Explicación de las Reglas

| Colección | Admin | Empleado | Sin Rol |
|-----------|-------|----------|---------|
| `users` | ✅ Leer, Crear, Editar, Borrar | ✅ Leer (solo su doc) | ❌ |
| `categorias` | ✅ Leer, Crear, Editar, Borrar | ✅ Leer | ❌ |
| `products` | ✅ Leer, Crear, Editar, Borrar | ✅ Leer, Crear, Editar | ❌ |
| `sales` | ✅ Leer, Crear, Editar, Borrar | ✅ Leer, Crear | ❌ |

---

## 🆘 Solución de Problemas

### Error: "get() operation does not exist"

Si ves errores al verificar roles, asegúrate de que:
1. El usuario tiene un documento en la colección `users`
2. El documento tiene el campo `role` con valor `'admin'` o `'employee'`

Para arreglarlo, usa `system-utils.html` → "Actualizar Rol de Admin"

### Error: "Missing index"

Si ves errores de índice faltante:
1. Firebase te mostrará un link en la consola
2. Haz click en el link
3. Firebase creará el índice automáticamente
4. Espera 1-2 minutos
5. Recarga la página

---

## 📝 Notas Importantes

- Las reglas se aplican **inmediatamente** después de publicar
- No necesitas reiniciar el servidor
- Solo necesitas recargar la página del navegador
- Las reglas se evalúan **antes** de cada operación de lectura/escritura
- Los errores de reglas aparecen en la consola del navegador como `FirebaseError`

---

**Última actualización**: 14 de noviembre de 2025
