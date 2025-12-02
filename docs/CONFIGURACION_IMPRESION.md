# 🖨️ Configuración de Impresión de Tickets

Este documento explica cómo personalizar y optimizar la impresión de tickets/recibos en el sistema.

## 📋 Configuración Actual

- **Formato**: A4 Portrait (210mm x 297mm)
- **Márgenes**: 10mm superior/inferior, 15mm izquierda/derecha
- **Fuente**: Arial/Helvetica, 14-16px
- **Ancho máximo**: 600px centrado
- **Páginas**: Optimizado para 1 sola hoja

## 🎨 Personalización del Recibo

### 1. Información de la Farmacia

Edita el archivo: `public/js/ventas.js` (línea ~1230)

```javascript
<div class="receipt-title">FARMACIA SERVISALUD</div>
<div class="receipt-subtitle">NIT: 123456789</div>
<div class="receipt-subtitle">Av. Principal #123, La Paz - Bolivia</div>
<div class="receipt-subtitle">Tel: (591) 2-2345678</div>
```

**Cambia:**
- Nombre de la farmacia
- NIT (número de identificación tributaria)
- Dirección física
- Teléfono de contacto

### 2. Logo de la Farmacia

El logo actual está en: `public/img/logo-servisalud.png`

**Para cambiar el logo:**
1. Reemplaza el archivo `logo-servisalud.png` con tu logo
2. Mantén dimensiones recomendadas: 300x300px (mínimo)
3. Formato recomendado: PNG con fondo transparente

**Ajustar tamaño del logo en impresión:**

Edita `public/css/print.css` (línea ~50):

```css
.receipt-logo {
    width: 150px;  /* Cambia este valor */
    margin: 0 auto 15px;
}
```

### 3. Pie de Página

Edita `public/js/ventas.js` (línea ~1270):

```javascript
<div class="receipt-footer-line">www.servisalud.com.bo</div>
```

Cambia la URL de tu sitio web o redes sociales.

## 🖨️ Opciones de Impresión

### Opción A: Impresora Estándar (A4)

**Ya está configurado por defecto.** Solo presiona Ctrl+P o haz clic en "Imprimir Recibo".

### Opción B: Impresora Térmica (80mm)

Si tienes una impresora térmica de tickets, edita `public/css/print.css` (línea ~20):

```css
@page {
    size: 80mm auto;  /* Cambia de "A4 portrait" a esto */
    margin: 5mm;      /* Reduce márgenes */
}
```

También ajusta el contenedor principal (línea ~45):

```css
#printReceipt {
    max-width: 70mm;  /* Cambia de 600px a 70mm */
    font-size: 12px;  /* Reduce tamaño de fuente */
}
```

### Opción C: Media Hoja (A5)

Para ahorrar papel, puedes configurar media hoja:

```css
@page {
    size: A5 portrait;
    margin: 8mm 10mm;
}
```

## 🎯 Ajustes Finos

### Reducir Espaciado (para recibos más compactos)

Edita `public/css/print.css`:

```css
.receipt-item {
    margin: 8px 0;  /* Reduce a 5px */
    padding: 6px 0; /* Reduce a 4px */
}

.receipt-total-row {
    margin: 6px 0;  /* Reduce a 4px */
    padding: 4px 0; /* Reduce a 2px */
}
```

### Aumentar Tamaño de Fuente (para mejor legibilidad)

```css
#printReceipt {
    font-size: 16px;  /* Aumenta de 14px */
}

.receipt-item-name {
    font-size: 17px;  /* Aumenta de 15px */
}

.receipt-total-row.main {
    font-size: 22px;  /* Aumenta de 20px */
}
```

### Cambiar Colores del Texto

```css
.receipt-title {
    color: #0D3C61;  /* Color primario de ServiSalud */
}

.receipt-thank-you {
    color: #7CB342;  /* Color secundario (verde) */
}
```

## 🔧 Solución de Problemas

### Problema: El recibo sale en 2 páginas

**Solución 1:** Reduce el espaciado (ver "Reducir Espaciado" arriba)

**Solución 2:** Reduce el tamaño de fuente:
```css
#printReceipt {
    font-size: 13px;
}
```

**Solución 3:** Reduce márgenes de la página:
```css
@page {
    margin: 5mm 10mm;  /* Reduce márgenes */
}
```

### Problema: El texto se ve muy pequeño

**Solución:** Aumenta el tamaño de fuente (ver "Aumentar Tamaño de Fuente" arriba)

### Problema: El logo no se ve en la impresión

**Solución:** Asegúrate de que la ruta del logo sea correcta:
```javascript
<img src="img/logo-servisalud.png" alt="ServiSalud">
```

Si el logo está en otra carpeta, ajusta la ruta:
```javascript
<img src="../assets/mi-logo.png" alt="Mi Farmacia">
```

### Problema: Aparecen elementos no deseados al imprimir

Verifica que los elementos estén ocultos en `public/css/print.css`:

```css
@media print {
    .navbar,
    .sidebar,
    .modal-close,
    .btn-print,
    .btn-new-sale,
    .sale-actions,
    button {
        display: none !important;
    }
}
```

## 📱 Vista Previa

Para ver cómo se verá el recibo antes de imprimir:

1. Completa una venta
2. Haz clic en "Imprimir Recibo"
3. En la ventana de impresión, selecciona "Vista previa"
4. Ajusta la configuración según necesites

## 💡 Consejos

- **Papel recomendado**: A4 blanco estándar (75-80 gr/m²)
- **Impresión en blanco y negro** es suficiente
- **Guarda PDF** si no tienes impresora: Selecciona "Guardar como PDF" en la ventana de impresión
- **Copia de seguridad**: Los recibos también se guardan en Firebase (colección `sales`)

## 🆘 Soporte

Si necesitas ayuda adicional, contacta al equipo de desarrollo o revisa los archivos:
- `public/css/print.css` - Estilos de impresión
- `public/js/ventas.js` - Función `imprimirRecibo()` (línea ~1140)
