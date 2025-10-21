# 🗄️ Diseño de Base de Datos - Sistema de Farmacia

## 📊 Esquema de Base de Datos

### 🏗️ Arquitectura de Datos
El sistema utiliza una base de datos relacional optimizada para operaciones frecuentes de consulta y escritura, con énfasis en la integridad referencial y el rendimiento.

## 📋 Tablas Principales

### 👥 **users** - Gestión de Usuarios
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('admin', 'employee', 'cashier') DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos explicados:**
- `role`: Define permisos del usuario
- `is_active`: Para deshabilitar usuarios sin eliminar
- `password_hash`: Contraseña encriptada con bcrypt

### 🏷️ **categories** - Categorías de Productos
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Color hex para UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🏭 **suppliers** - Proveedores/Laboratorios
```sql
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 💊 **products** - Productos de Farmacia
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL, -- Código único del producto
    barcode VARCHAR(100), -- Código de barras
    name VARCHAR(200) NOT NULL, -- Nombre comercial
    generic_name VARCHAR(200), -- Nombre genérico
    description TEXT,
    presentation VARCHAR(100), -- Ej: "Caja x 30 tabletas"
    
    -- Relaciones
    category_id INTEGER REFERENCES categories(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    -- Precios
    purchase_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    margin_percentage DECIMAL(5,2), -- Calculado automáticamente
    
    -- Inventario
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5, -- Alerta de stock bajo
    max_stock INTEGER DEFAULT 100,
    
    -- Fechas importantes
    expiry_date DATE,
    manufacturing_date DATE,
    
    -- Control
    requires_prescription BOOLEAN DEFAULT false,
    is_controlled BOOLEAN DEFAULT false, -- Medicamentos controlados
    is_active BOOLEAN DEFAULT true,
    
    -- Metadatos
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🛒 **sales** - Ventas Realizadas
```sql
CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number VARCHAR(20) UNIQUE NOT NULL, -- Número correlativo
    
    -- Información de venta
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Pago
    payment_method ENUM('cash', 'card', 'transfer', 'mixed') DEFAULT 'cash',
    amount_paid DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Referencias
    cashier_id INTEGER REFERENCES users(id),
    customer_name VARCHAR(100), -- Opcional para comprobantes
    customer_id VARCHAR(20), -- CI/NIT opcional
    
    -- Estados
    status ENUM('completed', 'cancelled', 'refunded') DEFAULT 'completed',
    notes TEXT,
    
    -- Timestamps
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id)
);
```

### 🧾 **sale_items** - Detalle de Ventas
```sql
CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    
    -- Datos del producto al momento de la venta
    product_name VARCHAR(200) NOT NULL, -- Snapshot del nombre
    product_sku VARCHAR(50) NOT NULL, -- Snapshot del SKU
    
    -- Cantidades y precios
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, -- Precio unitario al momento de venta
    line_total DECIMAL(10,2) NOT NULL, -- quantity * unit_price
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 📦 **inventory_movements** - Movimientos de Inventario
```sql
CREATE TABLE inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    
    -- Tipo de movimiento
    movement_type ENUM('purchase', 'sale', 'adjustment', 'return', 'expiry') NOT NULL,
    
    -- Cantidades
    quantity INTEGER NOT NULL, -- Positivo para entradas, negativo para salidas
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    
    -- Referencias
    reference_id INTEGER, -- ID de venta, compra, etc.
    reference_type VARCHAR(20), -- 'sale', 'purchase', 'adjustment'
    
    -- Detalles
    reason TEXT,
    cost_per_unit DECIMAL(10,2),
    
    -- Metadatos
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔄 **stock_adjustments** - Ajustes Manuales de Stock
```sql
CREATE TABLE stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    
    -- Ajuste
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL, -- new - previous
    
    -- Justificación
    reason ENUM('count_error', 'damaged', 'expired', 'theft', 'other') NOT NULL,
    notes TEXT,
    
    -- Metadatos
    adjusted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### ⚠️ **alerts** - Sistema de Alertas
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type ENUM('low_stock', 'expiry_warning', 'out_of_stock', 'system') NOT NULL,
    
    -- Contenido
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Referencias
    product_id INTEGER REFERENCES products(id), -- NULL para alertas del sistema
    
    -- Estado
    is_read BOOLEAN DEFAULT false,
    read_by INTEGER REFERENCES users(id),
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 Índices para Optimización

```sql
-- Índices para búsquedas frecuentes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Índices para ventas
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_number ON sales(sale_number);

-- Índices para movimientos de inventario
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);

-- Índices para alertas
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_alerts_product ON alerts(product_id);
```

## 🔗 Relaciones Clave

### Relaciones Uno a Muchos
- `categories` → `products` (Una categoría tiene muchos productos)
- `suppliers` → `products` (Un proveedor tiene muchos productos)
- `users` → `sales` (Un usuario puede hacer muchas ventas)
- `products` → `sale_items` (Un producto puede estar en muchas ventas)
- `sales` → `sale_items` (Una venta tiene muchos items)

### Integridad Referencial
- **CASCADE DELETE**: `sale_items` se eliminan automáticamente al eliminar una venta
- **RESTRICT DELETE**: No se pueden eliminar productos con ventas asociadas
- **SOFT DELETE**: Usuarios, productos y categorías se desactivan en lugar de eliminarse

## 📊 Vistas para Reportes

### Vista de Productos con Stock Actual
```sql
CREATE VIEW v_products_stock AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.current_stock,
    p.min_stock,
    p.sale_price,
    c.name as category_name,
    s.name as supplier_name,
    CASE 
        WHEN p.current_stock <= 0 THEN 'out_of_stock'
        WHEN p.current_stock <= p.min_stock THEN 'low_stock'
        ELSE 'normal'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true;
```

### Vista de Ventas Diarias
```sql
CREATE VIEW v_daily_sales AS
SELECT 
    DATE(sale_date) as sale_day,
    COUNT(*) as total_sales,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_sale,
    COUNT(DISTINCT cashier_id) as active_cashiers
FROM sales 
WHERE status = 'completed'
GROUP BY DATE(sale_date);
```

## 🔧 Triggers para Automatización

### Trigger para Actualizar Stock en Ventas
```sql
CREATE TRIGGER update_stock_after_sale
AFTER INSERT ON sale_items
BEGIN
    -- Actualizar stock del producto
    UPDATE products 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    
    -- Registrar movimiento de inventario
    INSERT INTO inventory_movements (
        product_id, movement_type, quantity, 
        previous_stock, new_stock, reference_id, 
        reference_type, created_by
    ) VALUES (
        NEW.product_id, 'sale', -NEW.quantity,
        (SELECT current_stock + NEW.quantity FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        NEW.sale_id, 'sale', 
        (SELECT cashier_id FROM sales WHERE id = NEW.sale_id)
    );
END;
```

### Trigger para Generar Alertas de Stock Bajo
```sql
CREATE TRIGGER check_low_stock
AFTER UPDATE ON products
WHEN NEW.current_stock <= NEW.min_stock AND NEW.current_stock > 0
BEGIN
    INSERT INTO alerts (type, title, message, severity, product_id)
    VALUES (
        'low_stock',
        'Stock Bajo: ' || NEW.name,
        'El producto ' || NEW.name || ' tiene solo ' || NEW.current_stock || ' unidades disponibles.',
        'medium',
        NEW.id
    );
END;
```

## 📈 Consideraciones de Escalabilidad

### Particionado de Datos (Futuro)
- **Ventas por fecha**: Particionar tabla `sales` por año
- **Movimientos de inventario**: Archivar datos antiguos
- **Logs de auditoría**: Rotación automática

### Optimizaciones
- **Índices compuestos** para consultas complejas
- **Materialización de vistas** para reportes frecuentes
- **Cache de consultas** para datos que cambian poco

---

*Diseño de base de datos optimizado para el Sistema de Gestión de Farmacia - Octubre 2025*