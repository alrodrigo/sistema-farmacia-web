# 📚 AYUDA Y APUNTES - Sistema de Farmacia

## 🎯 **PROPÓSITO DE ESTE ARCHIVO**
Aquí guardamos todas las explicaciones, conceptos y tips que vamos aprendiendo durante el desarrollo. **NO es código**, son apuntes para entender mejor el proyecto.

---

## 📖 **CONCEPTOS BÁSICOS APRENDIDOS**

### 🏗️ **¿Qué es un Monorepo?**
Un monorepo significa que TODO el proyecto está en UNA sola carpeta:
- Frontend = Lo que ve el usuario (HTML/CSS/JS)
- Backend = La lógica del negocio (Node.js/Express)
- Base de datos = Donde se guardan los datos (SQLite)

### 🔗 **¿Cómo se comunican Frontend y Backend?**
```
FRONTEND              API               BACKEND
   │                  │                   │
   │── "Dame productos"→│                  │
   │                  │──Consulta BD────→│
   │                  │←──Respuesta─────│
   │←─Lista productos──│                  │
```

### 🗄️ **Base de Datos - Relaciones Simples**
Imagina 3 cajones:
- **Cajón Productos:** ID, Nombre, Precio
- **Cajón Ventas:** ID, Fecha, Total
- **Cajón Detalles:** VentaID, ProductoID, Cantidad

La **relación** conecta los cajones: "En la venta #1 se vendieron 2 unidades del producto #1"

### 🤖 **¿Qué son los Triggers?**
Un trigger es como un "empleado invisible" que trabaja automáticamente:
- Cuando registras una venta → Automáticamente resta del inventario
- Cuando el stock es bajo → Automáticamente crea una alerta

---

## 🛠️ **STACK TECNOLÓGICO ELEGIDO**

### Frontend
- **HTML5** - Estructura de páginas
- **CSS3** - Diseño y estilos
- **JavaScript (ES6+)** - Interactividad
- **Chart.js** - Gráficos para reportes

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **SQLite** - Base de datos (archivo local)
- **JWT** - Tokens de autenticación
- **bcrypt** - Encriptación de contraseñas

### Herramientas
- **Nodemon** - Recarga automática en desarrollo
- **dotenv** - Variables de entorno
- **CORS** - Comunicación frontend-backend

---

## 📁 **ESTRUCTURA FINAL DEL PROYECTO**

```
sistema_farmacia_web/
├── 📚 AYUDA_Y_APUNTES.md        ← Este archivo (conceptos)
├── 📖 README.md                  ← Descripción del proyecto
├── 🚀 package.json               ← Configuración principal
├── 🔒 .env                       ← Variables secretas
├── 🚫 .gitignore                 ← Archivos a ignorar en Git
│
├── 📱 frontend/                  ← INTERFAZ DE USUARIO
│   ├── index.html               ← Página de login
│   ├── dashboard.html           ← Página principal
│   ├── productos.html           ← Gestión de productos
│   ├── ventas.html              ← Punto de venta
│   ├── reportes.html            ← Reportes y gráficos
│   └── assets/
│       ├── css/                 ← Estilos
│       ├── js/                  ← JavaScript del frontend
│       └── images/              ← Imágenes y logos
│
├── ⚙️ backend/                   ← LÓGICA DEL SERVIDOR
│   ├── src/
│   │   ├── app.js               ← Configuración principal
│   │   ├── server.js            ← Arranca el servidor
│   │   ├── routes/              ← Rutas de la API
│   │   ├── controllers/         ← Lógica de negocio
│   │   ├── models/              ← Definición de datos
│   │   └── middleware/          ← Filtros de seguridad
│   ├── database/                ← Base de datos
│   └── package.json             ← Dependencias del backend
│
└── 📚 docs/                      ← DOCUMENTACIÓN TÉCNICA
    ├── requirements.md          ← Qué debe hacer el sistema
    ├── database-design.md       ← Diseño de BD
    ├── development-plan.md      ← Plan paso a paso
    └── wireframes/              ← Diseños de pantallas
```

---

## 🎯 **PLAN DE DESARROLLO (Orden a seguir)**

### ✅ **FASE 1: Planificación** - COMPLETADA
- Análisis de requisitos
- Diseño de base de datos
- Wireframes y mockups
- Documentación técnica

### 🚀 **FASE 2: Backend Development** - EN PROCESO
**Día 1: Setup Inicial**
- [ ] Inicializar proyecto Node.js
- [ ] Configurar estructura de carpetas
- [ ] Instalar dependencias
- [ ] Configurar base de datos SQLite

**Día 2: Sistema de Autenticación**
- [ ] Login y registro de usuarios
- [ ] JWT tokens
- [ ] Middleware de seguridad

**Día 3-4: APIs del Negocio**
- [ ] CRUD de productos
- [ ] Sistema de ventas
- [ ] Reportes básicos

### 🎨 **FASE 3: Frontend Development**
- Interfaces de usuario
- Conexión con APIs
- Validaciones y UX

### 🚀 **FASE 4: Testing y Deploy**
- Pruebas
- Despliegue en Railway/Render

---

## 💡 **TIPS Y MEJORES PRÁCTICAS**

### 🔐 **Seguridad**
- Nunca guardar contraseñas en texto plano
- Usar JWT para autenticación
- Validar datos en frontend Y backend
- Variables sensibles en .env

### 📝 **Código Limpio**
- Nombres descriptivos para variables y funciones
- Comentarios solo cuando es necesario explicar "por qué"
- Separar lógica en archivos específicos
- Consistencia en el estilo de código

### 🗄️ **Base de Datos**
- Usar claves primarias siempre
- Definir relaciones correctamente
- Validar datos antes de insertar
- Hacer backups regulares

---

## 🔧 **COMANDOS ÚTILES**

### Backend
```bash
# Instalar dependencias
npm install

# Modo desarrollo (con recarga automática)
npm run dev

# Producción
npm start

# Ejecutar tests
npm test
```

### Frontend
```bash
# Servir archivos estáticos (si usamos servidor local)
python -m http.server 3000
# o
npx serve .
```

---

## 🚨 **ERRORES COMUNES Y SOLUCIONES**

### Error: "Cannot find module"
**Causa:** Dependencia no instalada
**Solución:** `npm install nombre-del-modulo`

### Error: "Port already in use"
**Causa:** Puerto ocupado por otro proceso
**Solución:** Cambiar puerto en .env o matar proceso

### Error: "CORS"
**Causa:** Frontend y backend en diferentes puertos
**Solución:** Configurar CORS en Express

---

## 📝 **NOTAS DURANTE EL DESARROLLO**

### Día 1 - [21/10/2025]
- Proyecto iniciado
- Estructura documentada
- Siguiente: Setup del backend

### Día 1 - [21/10/2025]
- ✅ Proyecto iniciado y limpio
- ✅ Decisión: Vanilla JS para cliente real (farmacia)
- ✅ Estrategia: Fundamentos sólidos + portfolio real
- 🎯 Siguiente: Setup del backend Node.js

### [Aquí iremos agregando notas conforme avancemos]

---

**📌 IMPORTANTE:** Este archivo se actualiza constantemente. Cada vez que aprendamos algo nuevo o resolvamos un problema, lo documentamos aquí.