# 🏗️ Arquitectura del Sistema - Farmacia Web

## 📐 Arquitectura General

### 🎯 Patrón Arquitectónico: MVC (Model-View-Controller)
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    VIEW     │  │    VIEW     │  │    VIEW     │     │
│  │  (HTML/CSS) │  │  (HTML/CSS) │  │  (HTML/CSS) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                 │                 │          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           CONTROLLER (JavaScript)              │   │
│  │  • Event Handlers    • API Communication       │   │
│  │  • DOM Manipulation  • State Management        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                    HTTP/JSON API
                            │
┌─────────────────────────────────────────────────────────┐
│                   SERVER SIDE                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │               CONTROLLER                        │   │
│  │  • Express Routes    • Request Validation       │   │
│  │  • Authentication    • Error Handling           │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 MODEL                           │   │
│  │  • Business Logic    • Database Queries         │   │
│  │  • Data Validation   • Relationships            │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │               DATABASE                          │   │
│  │  • SQLite/PostgreSQL • Indexes & Triggers       │   │
│  │  • Tables & Relations • Stored Procedures       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Componentes del Sistema

### 🌐 Frontend (Client-Side)

#### 📁 Estructura de Archivos
```
frontend/
├── assets/
│   ├── css/
│   │   ├── main.css           # Estilos principales
│   │   ├── components.css     # Componentes reutilizables
│   │   ├── responsive.css     # Media queries
│   │   └── themes.css         # Temas de color
│   ├── js/
│   │   ├── app.js            # Configuración principal
│   │   ├── api.js            # Cliente API REST
│   │   ├── auth.js           # Gestión de autenticación
│   │   ├── utils.js          # Funciones utilitarias
│   │   └── components/
│   │       ├── dashboard.js   # Dashboard principal
│   │       ├── products.js    # Gestión de productos
│   │       ├── sales.js       # Punto de venta
│   │       ├── inventory.js   # Control de inventario
│   │       └── reports.js     # Reportes y gráficos
│   └── images/
│       ├── logo.png          # Logo de la farmacia
│       ├── icons/            # Iconos del sistema
│       └── placeholders/     # Imágenes de ejemplo
├── pages/
│   ├── index.html           # Página de login
│   ├── dashboard.html       # Panel principal
│   ├── products.html        # Gestión de productos
│   ├── sales.html           # Punto de venta
│   ├── inventory.html       # Control de inventario
│   ├── reports.html         # Reportes
│   └── users.html           # Gestión de usuarios
└── components/
    ├── navbar.html          # Barra de navegación
    ├── sidebar.html         # Menú lateral
    ├── modals.html          # Ventanas modales
    └── forms.html           # Formularios reutilizables
```

#### 🧩 Componentes JavaScript

##### 🔐 Sistema de Autenticación
```javascript
// auth.js - Gestión de autenticación
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user_data') || '{}');
    }
    
    async login(username, password) {
        // Llamada a API de login
        // Almacenar token JWT
        // Redirigir a dashboard
    }
    
    logout() {
        // Limpiar localStorage
        // Redirigir a login
    }
    
    isAuthenticated() {
        // Verificar token válido
    }
    
    hasPermission(permission) {
        // Verificar permisos por rol
    }
}
```

##### 🌐 Cliente API
```javascript
// api.js - Cliente para comunicación con backend
class APIClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.auth = new AuthManager();
    }
    
    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.auth.token}`
        };
        
        const config = {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        };
        
        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        return await this.handleResponse(response);
    }
    
    // Métodos específicos para cada entidad
    async getProducts(filters = {}) { /* ... */ }
    async createProduct(productData) { /* ... */ }
    async updateProduct(id, productData) { /* ... */ }
    async deleteProduct(id) { /* ... */ }
    
    async getSales(filters = {}) { /* ... */ }
    async createSale(saleData) { /* ... */ }
    
    async getReports(type, filters) { /* ... */ }
}
```

### ⚙️ Backend (Server-Side)

#### 📁 Estructura de Archivos
```
backend/
├── src/
│   ├── app.js               # Configuración principal Express
│   ├── server.js            # Punto de entrada del servidor
│   ├── config/
│   │   ├── database.js      # Configuración de BD
│   │   ├── auth.js          # Configuración JWT
│   │   └── constants.js     # Constantes del sistema
│   ├── controllers/
│   │   ├── authController.js    # Autenticación
│   │   ├── productController.js # Productos
│   │   ├── saleController.js    # Ventas
│   │   ├── userController.js    # Usuarios
│   │   ├── reportController.js  # Reportes
│   │   └── inventoryController.js # Inventario
│   ├── models/
│   │   ├── User.js          # Modelo de usuarios
│   │   ├── Product.js       # Modelo de productos
│   │   ├── Sale.js          # Modelo de ventas
│   │   ├── Category.js      # Modelo de categorías
│   │   └── Supplier.js      # Modelo de proveedores
│   ├── routes/
│   │   ├── index.js         # Rutas principales
│   │   ├── auth.js          # Rutas de autenticación
│   │   ├── products.js      # Rutas de productos
│   │   ├── sales.js         # Rutas de ventas
│   │   ├── users.js         # Rutas de usuarios
│   │   └── reports.js       # Rutas de reportes
│   ├── middleware/
│   │   ├── auth.js          # Verificación de tokens
│   │   ├── validation.js    # Validación de datos
│   │   ├── permissions.js   # Control de permisos
│   │   └── errorHandler.js  # Manejo de errores
│   ├── services/
│   │   ├── authService.js   # Lógica de autenticación
│   │   ├── productService.js # Lógica de productos
│   │   ├── saleService.js   # Lógica de ventas
│   │   ├── reportService.js # Generación de reportes
│   │   └── pdfService.js    # Generación de PDFs
│   └── utils/
│       ├── logger.js        # Sistema de logs
│       ├── validators.js    # Validaciones personalizadas
│       ├── helpers.js       # Funciones auxiliares
│       └── constants.js     # Constantes de la aplicación
├── database/
│   ├── migrations/          # Scripts de migración
│   ├── seeds/              # Datos de prueba
│   └── schema.sql          # Esquema de base de datos
├── uploads/                # Archivos subidos
├── logs/                   # Archivos de log
└── tests/                  # Pruebas unitarias
```

#### 🔌 API REST Endpoints

##### 🔐 Autenticación
```
POST   /api/v1/auth/login      # Iniciar sesión
POST   /api/v1/auth/logout     # Cerrar sesión
POST   /api/v1/auth/refresh    # Renovar token
GET    /api/v1/auth/profile    # Perfil del usuario
PUT    /api/v1/auth/profile    # Actualizar perfil
```

##### 💊 Productos
```
GET    /api/v1/products               # Listar productos
GET    /api/v1/products/:id           # Obtener producto
POST   /api/v1/products               # Crear producto
PUT    /api/v1/products/:id           # Actualizar producto
DELETE /api/v1/products/:id           # Eliminar producto
GET    /api/v1/products/search/:term  # Buscar productos
GET    /api/v1/products/low-stock     # Productos con stock bajo
```

##### 🛒 Ventas
```
GET    /api/v1/sales                  # Listar ventas
GET    /api/v1/sales/:id              # Obtener venta
POST   /api/v1/sales                  # Crear venta
PUT    /api/v1/sales/:id/cancel       # Cancelar venta
GET    /api/v1/sales/:id/receipt      # Generar comprobante PDF
GET    /api/v1/sales/daily-summary    # Resumen del día
```

##### 📦 Inventario
```
GET    /api/v1/inventory              # Estado del inventario
POST   /api/v1/inventory/adjustment   # Ajuste de stock
GET    /api/v1/inventory/movements    # Movimientos de inventario
GET    /api/v1/inventory/alerts       # Alertas de inventario
```

##### 📊 Reportes
```
GET    /api/v1/reports/sales/:period      # Reporte de ventas
GET    /api/v1/reports/products/:period   # Reporte de productos
GET    /api/v1/reports/inventory          # Reporte de inventario
GET    /api/v1/reports/financial/:period  # Reporte financiero
POST   /api/v1/reports/custom            # Reporte personalizado
```

##### 👥 Usuarios (Solo Admin)
```
GET    /api/v1/users          # Listar usuarios
GET    /api/v1/users/:id      # Obtener usuario
POST   /api/v1/users          # Crear usuario
PUT    /api/v1/users/:id      # Actualizar usuario
DELETE /api/v1/users/:id      # Eliminar usuario
```

## 🔄 Flujo de Datos

### 📊 Flujo de Venta
```
1. Usuario busca producto en frontend
   ↓
2. Frontend hace GET /api/v1/products/search/:term
   ↓
3. Backend consulta base de datos
   ↓
4. Retorna productos encontrados
   ↓
5. Usuario añade productos al carrito (frontend)
   ↓
6. Usuario confirma venta
   ↓
7. Frontend hace POST /api/v1/sales con datos de venta
   ↓
8. Backend valida datos y permisos
   ↓
9. Backend crea registro de venta
   ↓
10. Backend actualiza stock de productos
    ↓
11. Backend registra movimientos de inventario
    ↓
12. Backend retorna confirmación con ID de venta
    ↓
13. Frontend muestra confirmación y opción de imprimir
    ↓
14. Si imprime: GET /api/v1/sales/:id/receipt (PDF)
```

### 🔐 Flujo de Autenticación
```
1. Usuario ingresa credenciales
   ↓
2. Frontend hace POST /api/v1/auth/login
   ↓
3. Backend valida credenciales contra BD
   ↓
4. Backend genera token JWT
   ↓
5. Frontend almacena token en localStorage
   ↓
6. Frontend incluye token en todas las requests
   ↓
7. Middleware de backend valida token en cada request
   ↓
8. Si token válido: procesa request
   Si token inválido: retorna 401 Unauthorized
```

## 🔒 Seguridad

### 🛡️ Medidas de Seguridad Implementadas

#### Frontend
- **Validación de entrada** en todos los formularios
- **Sanitización** de datos antes de enviar al backend
- **Almacenamiento seguro** de tokens en localStorage
- **Timeout automático** de sesión por inactividad
- **HTTPS only** en producción

#### Backend
- **Autenticación JWT** con expiración
- **Encriptación bcrypt** para contraseñas
- **Validación de entrada** con express-validator
- **Rate limiting** para prevenir ataques de fuerza bruta
- **CORS configurado** específicamente
- **Headers de seguridad** con helmet.js
- **Logs de auditoría** para todas las operaciones críticas

#### Base de Datos
- **Prepared statements** para prevenir SQL injection
- **Roles y permisos** granulares
- **Backup automático** diario
- **Encriptación** de datos sensibles

## 📊 Monitoreo y Logs

### 📈 Métricas a Monitorear
- **Tiempo de respuesta** de la API
- **Número de usuarios** conectados simultáneamente
- **Operaciones por minuto** (ventas, consultas)
- **Errores 4xx/5xx** y su frecuencia
- **Uso de memoria** y CPU del servidor
- **Tamaño de base de datos** y crecimiento

### 📝 Sistema de Logs
```javascript
// logger.js - Configuración de logging
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'farmacia-api' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ]
});
```

## 🚀 Escalabilidad

### 📈 Estrategias de Escalamiento

#### Horizontal (Más servidores)
- **Load balancer** para distribuir carga
- **Múltiples instancias** de la aplicación
- **Base de datos replicada** para lectura
- **CDN** para archivos estáticos

#### Vertical (Más recursos)
- **Upgrade de servidor** (RAM, CPU)
- **SSD** para base de datos
- **Optimización de consultas** SQL
- **Cache de aplicación** con Redis

### 🔧 Optimizaciones Futuras
- **API caching** con Redis
- **Compresión gzip** para responses
- **Minificación** de CSS/JS
- **Lazy loading** en frontend
- **Database indexing** optimizado
- **Connection pooling** para BD

---

*Arquitectura del Sistema de Gestión de Farmacia - Octubre 2025*