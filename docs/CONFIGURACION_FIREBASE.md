# 🔥 Configuración de Firebase Authentication

## 📋 Pasos para Configurar el Sistema

### **1. Habilitar Authentication en Firebase Console**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `sistema-farmacia-web`
3. En el menú lateral, haz clic en **Authentication**
4. Haz clic en la pestaña **Sign-in method**
5. Habilita **Email/Password**:
   - Haz clic en "Email/Password"
   - Activa el switch "Enable"
   - Guarda los cambios

---

### **2. Crear Usuario Administrador**

#### **Opción A: Desde Firebase Console (Recomendado)**

1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user**
3. Completa los datos:
   ```
   Email: admin@farmacia.com
   Password: (mínimo 6 caracteres)
   ```
4. Haz clic en **Add user**

#### **Opción B: Desde el Código**

Puedes crear un archivo temporal para registrar usuarios:

```html
<!-- docs/tools/crear-usuario.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Crear Usuario - Sistema Farmacia</title>
</head>
<body>
    <h1>Crear Usuario Administrador</h1>
    <form id="registerForm">
        <input type="email" id="email" placeholder="Email" required><br>
        <input type="password" id="password" placeholder="Password (min 6 caracteres)" required><br>
        <input type="text" id="firstName" placeholder="Nombre" required><br>
        <input type="text" id="lastName" placeholder="Apellido" required><br>
        <button type="submit">Crear Usuario</button>
    </form>
    <div id="message"></div>

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
    <script src="../../public/js/config/firebase.js"></script>

    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            
            try {
                // Crear usuario en Authentication
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Guardar datos adicionales en Firestore
                await firebase.firestore().collection('users').doc(user.uid).set({
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    role: 'admin',
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                document.getElementById('message').innerHTML = 
                    `<p style="color: green;">✅ Usuario creado exitosamente!</p>
                     <p>Email: ${email}</p>
                     <p>Ahora puedes iniciar sesión en el sistema.</p>`;
                
                // Cerrar sesión automáticamente
                await firebase.auth().signOut();
                
            } catch (error) {
                document.getElementById('message').innerHTML = 
                    `<p style="color: red;">❌ Error: ${error.message}</p>`;
            }
        });
    </script>
</body>
</html>
```

---

### **3. Crear Documento de Usuario en Firestore**

Después de crear el usuario en Authentication, necesitas crear su documento en Firestore:

1. Ve a **Firestore Database** en Firebase Console
2. Si no existe, crea la colección **users**
3. Crea un documento con el **UID del usuario** que creaste
4. Agrega estos campos:

```json
{
  "first_name": "Admin",
  "last_name": "Sistema",
  "email": "admin@farmacia.com",
  "role": "admin",
  "created_at": [timestamp actual]
}
```

**⚠️ Importante:** El ID del documento DEBE ser el mismo UID del usuario en Authentication.

---

### **4. Agregar Productos de Prueba a Firestore**

#### **Opción A: Manualmente desde Firebase Console**

1. Ve a **Firestore Database**
2. Crea la colección **products**
3. Agrega documentos con esta estructura:

```json
{
  "name": "Paracetamol 500mg",
  "sku": "PAR-500",
  "barcode": "7501234567890",
  "price": 12.50,
  "current_stock": 150,
  "min_stock": 20,
  "description": "Analgésico y antipirético",
  "category": "Analgésicos",
  "created_at": [timestamp],
  "updated_at": [timestamp]
}
```

#### **Opción B: Usar Script de Carga Masiva**

Puedes usar el archivo `docs/tools/agregar-productos-prueba.html` que ya tienes en el proyecto.

---

### **5. Configurar Reglas de Seguridad de Firestore**

En Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla para usuarios autenticados
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regla para productos
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Regla para ventas
    match /sales/{saleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

---

### **6. Verificar la Configuración**

1. **Cierra el servidor Firebase** (Ctrl+C en la terminal donde está corriendo)
2. **Reinicia el servidor**:
   ```bash
   npx firebase serve --only hosting
   ```
3. **Abre el navegador** en `http://localhost:5000`
4. **Deberías ver** la página de login (`index.html`)
5. **Inicia sesión** con las credenciales que configuraste

---

### **7. Solución de Problemas**

#### **Error: "No hay usuario autenticado"**
- Verifica que el email y password sean correctos
- Verifica que Authentication esté habilitado en Firebase Console
- Revisa la consola del navegador (F12) para ver errores específicos

#### **Error: "Documento de usuario no encontrado"**
- Verifica que existe un documento en Firestore → users → [UID del usuario]
- El UID del documento debe coincidir con el UID en Authentication

#### **Error: "Permission denied"**
- Verifica las reglas de seguridad de Firestore
- Asegúrate de que el usuario está autenticado

#### **Los productos no cargan**
- Verifica que existan documentos en la colección `products`
- Revisa la consola del navegador para ver errores de Firebase
- Verifica las reglas de seguridad

---

### **8. Modo Desarrollo vs Producción**

**Modo Desarrollo** (`MODO_DESARROLLO = true`):
- ✅ No requiere Firebase Authentication
- ✅ Usa productos de prueba pre-cargados
- ✅ Usuario simulado
- ✅ Ideal para desarrollo rápido
- ❌ No guarda datos reales

**Modo Producción** (`MODO_DESARROLLO = false`):
- ✅ Usa Firebase Authentication real
- ✅ Guarda datos en Firestore
- ✅ Control de inventario real
- ✅ Sistema completo funcional
- ❌ Requiere configuración previa

Para cambiar entre modos, edita `public/js/ventas.js`:

```javascript
// Línea 19
const MODO_DESARROLLO = false;  // true para desarrollo, false para producción
```

---

### **9. Checklist de Configuración**

- [ ] Authentication habilitado en Firebase Console
- [ ] Usuario admin creado en Authentication
- [ ] Documento de usuario creado en Firestore (collection: users)
- [ ] Productos agregados a Firestore (collection: products)
- [ ] Reglas de seguridad configuradas
- [ ] `MODO_DESARROLLO = false` en ventas.js
- [ ] Servidor reiniciado
- [ ] Login funcional
- [ ] Dashboard accesible
- [ ] Productos visibles en página de Productos
- [ ] Sistema de ventas funcional

---

### **10. Contacto y Soporte**

Si tienes problemas con la configuración:
1. Revisa la consola del navegador (F12)
2. Revisa los logs de Firebase Console
3. Verifica que todos los servicios estén habilitados
4. Compara tu configuración con esta guía

**¡Éxito! 🎉** Una vez completados todos los pasos, tu sistema estará completamente funcional.
