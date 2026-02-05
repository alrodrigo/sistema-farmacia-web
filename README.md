# 💊 Sistema de Gestión de Farmacia ServiSalud

## 📋 Descripción
Sistema web moderno y completo para la gestión integral de farmacia, incluyendo inventario, ventas, categorías, usuarios y reportes. Desarrollado con tecnologías web estándar y Firebase como backend.

## ✨ Características Principales
- 🔐 **Autenticación segura** - Login con Firebase Authentication
- 📦 **Gestión de inventario** - Control completo de productos y stock
- 💰 **Punto de venta (POS)** - Sistema de ventas rápido e intuitivo
- 🏷️ **Categorías** - Organización visual con colores e iconos
- 👥 **Gestión de usuarios** - Control de acceso por roles
- 📊 **Dashboard en tiempo real** - Estadísticas y alertas
- 📈 **Reportes** - Análisis de ventas e inventario
- 🎨 **Diseño moderno** - Interfaz ServiSalud con tema personalizado

## 🚀 Estado del Proyecto
**Estado:** ✅ En producción (funcional)  
**Versión:** 3.16  
**Última actualización:** Febrero 2026

### 🆕 Novedades v3.16
- ✅ **Separación de perfiles por vendedor** - Cada vendedor solo ve sus propias ventas
- ✅ **Dashboard personalizado por rol** - Admins ven todo, vendedores solo sus datos
- ✅ **Reportes independientes** - Filtrado automático de ventas por usuario
- ✅ **Reseteo automático de método de pago** - Vuelve a efectivo después de cada venta
- ✅ **Optimización de consultas** - Mejor rendimiento sin necesidad de índices compuestos

### Módulos Completados ✅
- [x] Sistema de autenticación
- [x] Dashboard principal (con separación por rol)
- [x] Gestión de productos
- [x] Gestión de categorías
- [x] Sistema de ventas (POS)
- [x] Gestión de usuarios
- [x] Sistema de diseño ServiSalud

### En Desarrollo 🔄
- [ ] Reportes avanzados
- [ ] Gestión de proveedores
- [ ] Sistema de compras

## 🛠️ Stack Tecnológico

### Frontend
- **Vanilla JavaScript (ES6+)** - Sin frameworks
- **HTML5** - Estructura semántica
- **CSS3** - Custom Properties, Grid, Flexbox
- **Font Awesome 6.4** - Iconografía
- **Chart.js** - Gráficos interactivos

### Backend (BaaS)
- **Firebase Authentication** - Autenticación de usuarios
- **Cloud Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Hosting** - Hosting con SSL automático
- **Firestore Security Rules** - Control de acceso

### Herramientas
- **Firebase CLI** - Gestión del proyecto
- **Git** - Control de versiones
- **Python HTTP Server** - Desarrollo local

## 📁 Estructura del Proyecto

```
sistema_farmacia_web/
├── public/                 # Aplicación web
│   ├── index.html         # Login
│   ├── dashboard.html     # Dashboard principal
│   ├── productos.html     # Gestión de productos
│   ├── categorias.html    # Gestión de categorías
│   ├── ventas.html        # Punto de venta (POS)
│   ├── usuarios.html      # Gestión de usuarios
│   ├── reportes.html      # Reportes y análisis
│   ├── css/
│   │   ├── theme.css      # Variables globales ServiSalud
│   │   ├── components.css # Componentes reutilizables
│   │   ├── layout.css     # Navbar y Sidebar
│   │   └── [página].css   # Estilos específicos
│   ├── js/
│   │   ├── config/
│   │   │   └── firebase.js    # Configuración Firebase
│   │   ├── services/
│   │   │   └── auth.js        # Servicio de autenticación
│   │   ├── utils/
│   │   │   ├── helpers.js     # Funciones auxiliares
│   │   │   └── roles.js       # Control de permisos
│   │   └── [página].js        # Lógica específica
│   └── img/
│       ├── logo-servisalud.png
│       └── logo-servisalud.svg
├── docs/
│   ├── ESTADO_ACTUAL_DEL_PROYECTO.md  # Documentación completa
│   └── GUIA_PERSONALIZACION_TEMAS.md  # Personalización
├── scripts/
│   └── crear-usuario-admin.js # Script para crear usuarios
├── firestore.rules        # Reglas de seguridad
├── firestore.indexes.json # Índices de Firestore
├── firebase.json          # Configuración Firebase
└── package.json           # Scripts NPM
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js (v14 o superior)
- Firebase CLI
- Git

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/alrodrigo/sistema-farmacia-web.git
cd sistema-farmacia-web
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Firebase** (ya configurado)
```bash
# El proyecto ya está conectado a Firebase
# Ver firebase.json y .firebaserc
```

4. **Desarrollo local**
```bash
# Opción 1: Python HTTP Server
python3 -m http.server 5003

# Opción 2: Firebase Emulators
npm run emulators

# Luego abrir: http://localhost:5003
```

5. **Despliegue a producción**
```bash
npm run deploy
# o
firebase deploy
```

## 👤 Usuario de Prueba

**Email:** admin@servisalud.com  
**Contraseña:** admin123

## 📊 Base de Datos

### Colecciones Firestore
- `users` - Usuarios del sistema
- `categorias` - Categorías de productos
- `products` - Inventario de productos
- `sales` - Registro de ventas
- `sale_items` - Detalles de cada venta
- `inventory_movements` - Movimientos de stock

## 🔒 Seguridad

- Autenticación con Firebase Authentication
- Firestore Security Rules implementadas
- Control de acceso por roles (admin/employee)
- Validación de datos en cliente y servidor

## 📱 Responsive Design

- ✅ Desktop (1920px+)
- ✅ Laptop (1366px)
- ✅ Tablet (768px)
- ✅ Mobile (320px+)

## 🎨 Sistema de Diseño

**Paleta de Colores ServiSalud:**
- Primary: `#0D3C61` (Azul corporativo)
- Secondary: `#7CB342` (Verde salud)
- Accent: `#8BC34A` (Verde claro)

Ver `docs/GUIA_PERSONALIZACION_TEMAS.md` para más detalles.

## 📖 Documentación

- **Estado del Proyecto:** [docs/ESTADO_ACTUAL_DEL_PROYECTO.md](docs/ESTADO_ACTUAL_DEL_PROYECTO.md)
- **Personalización:** [docs/GUIA_PERSONALIZACION_TEMAS.md](docs/GUIA_PERSONALIZACION_TEMAS.md)
- **Reglas Firestore:** [firestore.rules](firestore.rules)

## 👥 Roles de Usuario

### 👨‍💼 Administrador
- Gestión completa de productos y categorías
- Gestión de usuarios del sistema
- Acceso a todos los reportes
- Configuración del sistema

### 👩‍💊 Empleado
- Registro de ventas (POS)
- Consulta de inventario
- Reportes básicos
- Gestión de productos

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva característica'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

**Desarrollador:** Rodrigo  
**Email:** alrodrigo25@hotmail.com  
**Repositorio:** [github.com/alrodrigo/sistema-farmacia-web](https://github.com/alrodrigo/sistema-farmacia-web)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

