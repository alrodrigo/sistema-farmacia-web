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

### Backend (BaaS - Backend as a Service)
- **Firebase Authentication** - Sistema de login seguro
- **Cloud Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Hosting** - Hosting gratuito con SSL automático
- **Firebase Storage** - Almacenamiento de imágenes (opcional)

### Herramientas
- **Firebase CLI** - Herramientas de línea de comandos
- **Live Server** - Servidor de desarrollo local

---

## 📁 **ESTRUCTURA FINAL DEL PROYECTO**

sistema_farmacia_web/
├── public/               ← Todo el frontend aquí
│   ├── css/
│   ├── js/
│   │   ├── config/      ← Firebase config
│   │   ├── services/    ← CRUD y lógica
│   │   ├── components/  ← Componentes UI
│   │   └── utils/       ← Helpers
│   └── images/
├── firebase.json         ← Config Firebase
├── firestore.rules       ← Seguridad
├── firestore.indexes.json
└── docs/                 ← Documentación
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
- ✅ Git y GitHub configurados (repo: alrodrigo/sistema-farmacia-web)
- ✅ .gitignore creado para proteger archivos sensibles
- ✅ Ramas profesionales configuradas (main/develop/feature/*)
- 🎯 Siguiente: Inicializar proyecto Node.js

### Día 7 - [28/10/2025]
- ✅ Análisis profundo: Node.js vs Firebase
- ✅ Requisito adicional: Categorización por laboratorio (ya contemplado)
- � DECISIÓN ESTRATÉGICA: Migrar a Firebase
  - Razón: Garantizar entrega en 1 mes
  - Tiempo: Node.js (26-36 días) vs Firebase (16-21 días)
  - Costo: $0 para farmacia pequeña (límites Firebase suficientes)
  - Plan: Firebase ahora, Node.js después (portfolio diverso)
- 🚀 Reconfigurando proyecto para Firebase
- notas sobre github:
🔄 Cambiar entre ramas:
 git checkout main              # Ir a main
 git checkout develop           # Ir a develop  
 git checkout feature/setup-backend  # Ir a feature
 Descartar cambios (SALVAVIDAS):
 # Descartar cambios de un archivo específico
git checkout -- archivo.js

# Descartar TODOS los cambios no committeados
git reset --hard HEAD

# Descartar último commit (pero mantener archivos)
git reset --soft HEAD~1

# Descartar último commit Y archivos
git reset --hard HEAD~1
🆘 EMERGENCIA - Volver a estado seguro:
git checkout main    # Ir a versión estable
git pull origin main # Asegurar última versión
### [Aquí iremos agregando notas conforme avancemos]

---

**📌 IMPORTANTE:** Este archivo se actualiza constantemente. Cada vez que aprendamos algo nuevo o resolvamos un problema, lo documentamos aquí.