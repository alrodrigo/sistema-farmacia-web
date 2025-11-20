# 🎨 Guía de Personalización de Temas
## Sistema de Farmacia Web - Documentación para Personalización

---

## 📋 Índice
1. [Introducción](#introducción)
2. [Cómo Cambiar el Tema](#cómo-cambiar-el-tema)
3. [Temas Incluidos](#temas-incluidos)
4. [Crear un Tema Personalizado](#crear-un-tema-personalizado)
5. [Variables CSS Disponibles](#variables-css-disponibles)
6. [Modo Oscuro](#modo-oscuro)
7. [Guía para Vender/Personalizar](#guía-para-vender-personalizar)

---

## 🎯 Introducción

Este sistema utiliza **CSS Custom Properties (Variables CSS)** para permitir personalización completa del diseño desde archivos centralizados.

### Beneficios:
✅ Cambiar toda la apariencia modificando un solo archivo  
✅ Crear múltiples temas para diferentes clientes  
✅ Alternar entre temas sin tocar el código HTML/JavaScript  
✅ Mantener consistencia visual en todo el sistema  
✅ Facilitar venta/licencia del sistema con branding personalizado  

---

## 🔄 Cómo Cambiar el Tema

### Método 1: Cambio Manual (Para desarrollo/pruebas)

En cada archivo HTML (`dashboard.html`, `productos.html`, etc.), busca esta línea:

```html
<link rel="stylesheet" href="css/theme.css">
```

Reemplázala con el tema deseado:

```html
<!-- Tema Original (Morado) -->
<link rel="stylesheet" href="css/theme.css">

<!-- Tema Azul Corporativo -->
<link rel="stylesheet" href="css/themes/theme-blue.css">

<!-- Tema Verde Farmacia -->
<link rel="stylesheet" href="css/themes/theme-green.css">

<!-- Tema Rojo Salud -->
<link rel="stylesheet" href="css/themes/theme-red.css">

<!-- Modo Oscuro -->
<link rel="stylesheet" href="css/themes/theme-dark.css">
```

### Método 2: Selector de Temas (Recomendado para producción)

**Agregar HTML al navbar:**

```html
<div class="theme-selector">
    <select id="themeSelect">
        <option value="default">🟣 Morado (Predeterminado)</option>
        <option value="blue">🔵 Azul Corporativo</option>
        <option value="green">🟢 Verde Farmacia</option>
        <option value="red">🔴 Rojo Salud</option>
        <option value="dark">🌙 Modo Oscuro</option>
    </select>
</div>
```

**Agregar JavaScript al final del `<body>`:**

```javascript
// Selector de temas
const themeSelect = document.getElementById('themeSelect');
const themeMap = {
    'default': 'css/theme.css',
    'blue': 'css/themes/theme-blue.css',
    'green': 'css/themes/theme-green.css',
    'red': 'css/themes/theme-red.css',
    'dark': 'css/themes/theme-dark.css'
};

// Cargar tema guardado
const savedTheme = localStorage.getItem('selectedTheme') || 'default';
themeSelect.value = savedTheme;
loadTheme(savedTheme);

themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    loadTheme(theme);
    localStorage.setItem('selectedTheme', theme);
});

function loadTheme(theme) {
    const existingLink = document.querySelector('link[href*="theme"]');
    if (existingLink) {
        existingLink.href = themeMap[theme];
    }
}
```

---

## 🎨 Temas Incluidos

### 1. **Tema Original (Morado)** - `theme.css`
- Color principal: Morado (#6a5acd)
- Uso: Elegante, profesional, diferenciador
- Ideal para: Farmacias modernas, consultorios privados

### 2. **Tema Azul Corporativo** - `themes/theme-blue.css`
- Color principal: Azul (#2563EB)
- Uso: Corporativo, confiable, tradicional
- Ideal para: Empresas establecidas, cadenas de farmacias

### 3. **Tema Verde Farmacia** - `themes/theme-green.css`
- Color principal: Verde (#059669)
- Uso: Salud, naturaleza, productos naturales
- Ideal para: Farmacias naturistas, productos ecológicos

### 4. **Tema Rojo Salud** - `themes/theme-red.css`
- Color principal: Rojo (#DC2626)
- Uso: Urgencia, salud, atención médica
- Ideal para: Farmacias 24h, servicios de emergencia

### 5. **Modo Oscuro** - `themes/theme-dark.css`
- Fondo oscuro con textos claros
- Uso: Reducir fatiga visual, ambiente nocturno
- Ideal para: Uso prolongado, turnos nocturnos

---

## 🛠️ Crear un Tema Personalizado

### Paso 1: Duplicar Archivo Base

```bash
cp public/css/themes/theme-blue.css public/css/themes/theme-miempresa.css
```

### Paso 2: Modificar Colores Principales

Edita `theme-miempresa.css`:

```css
:root {
    /* CAMBIA ESTOS VALORES */
    --primary-color: #TU_COLOR_PRINCIPAL;
    --primary-light: #TU_COLOR_CLARO;
    --primary-dark: #TU_COLOR_OSCURO;
    
    --secondary-color: #TU_COLOR_SECUNDARIO;
    --accent-color: #TU_COLOR_ACENTO;
}
```

### Paso 3: Vincular en HTML

```html
<link rel="stylesheet" href="css/themes/theme-miempresa.css">
```

### Herramientas Útiles:

- **Color Picker**: [Coolors.co](https://coolors.co) - Generador de paletas
- **Contraste**: [WebAIM](https://webaim.org/resources/contrastchecker/) - Verificar accesibilidad
- **Extractor**: [Color.adobe.com](https://color.adobe.com) - Extraer colores de logos

---

## 📚 Variables CSS Disponibles

### Colores Principales
```css
--primary-color          /* Color primario (botones, enlaces) */
--primary-light          /* Variante clara */
--primary-dark           /* Variante oscura */
--secondary-color        /* Color secundario */
--accent-color           /* Color de acento */
```

### Colores Semánticos
```css
--success-color          /* Verde para éxito */
--error-color            /* Rojo para errores */
--warning-color          /* Amarillo para advertencias */
--info-color             /* Azul para información */
```

### Tipografía
```css
--font-primary           /* Fuente principal (Poppins) */
--font-secondary         /* Fuente secundaria */
--font-size-xs           /* Tamaño extra pequeño */
--font-size-sm           /* Tamaño pequeño */
--font-size-base         /* Tamaño base (16px) */
--font-size-lg           /* Tamaño grande */
--font-size-xl           /* Tamaño extra grande */
```

### Espaciado
```css
--spacing-xs             /* 4px */
--spacing-sm             /* 8px */
--spacing-md             /* 16px */
--spacing-lg             /* 24px */
--spacing-xl             /* 32px */
```

### Sombras
```css
--shadow-sm              /* Sombra pequeña */
--shadow-md              /* Sombra mediana */
--shadow-lg              /* Sombra grande */
--shadow-xl              /* Sombra extra grande */
```

### Componentes Específicos
```css
--sidebar-bg             /* Fondo del sidebar */
--navbar-bg              /* Fondo del navbar */
--card-bg                /* Fondo de tarjetas */
--input-border           /* Borde de inputs */
--table-header-bg        /* Fondo header de tablas */
```

---

## 🌙 Modo Oscuro

### Implementación con Toggle

**HTML (en navbar):**

```html
<button id="darkModeToggle" class="dark-mode-toggle">
    <i class="fas fa-moon"></i>
</button>
```

**JavaScript:**

```javascript
const darkModeToggle = document.getElementById('darkModeToggle');
const html = document.documentElement;

// Cargar preferencia
const darkMode = localStorage.getItem('darkMode') === 'true';
if (darkMode) {
    html.setAttribute('data-theme', 'dark');
}

darkModeToggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('darkMode', 'false');
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('darkMode', 'true');
    }
});
```

**CSS adicional:**

```css
.dark-mode-toggle {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text-primary);
}
```

---

## 💼 Guía para Vender/Personalizar

### Caso de Uso 1: Cliente Específico

1. **Obtén el logo y colores del cliente**
   - Logo en formato PNG/SVG
   - Colores principales (hexadecimal)

2. **Crea tema personalizado**
   ```bash
   cp theme.css themes/theme-cliente-farmaciaelsa.css
   ```

3. **Modifica colores en el nuevo archivo**
   - Usa herramienta de color picker desde su logo
   - Ajusta `--primary-color`, `--secondary-color`, etc.

4. **Reemplaza logo**
   ```bash
   cp logo-farmaciaelsa.png public/img/logo.png
   ```

5. **Cambia referencias en HTML**
   ```html
   <link rel="stylesheet" href="css/themes/theme-cliente-farmaciaelsa.css">
   ```

6. **Opcional: Personaliza textos**
   - Nombre de la farmacia en títulos
   - Información de contacto en footer
   - Mensajes de bienvenida

### Caso de Uso 2: Vender Múltiples Copias

**Estructura de paquetes:**

```
📦 Sistema Farmacia - Paquete Básico ($299)
├── ✅ Sistema completo funcional
├── ✅ 1 tema personalizado (colores + logo)
├── ✅ Configuración Firebase
└── ✅ Manual de usuario

📦 Sistema Farmacia - Paquete Premium ($499)
├── ✅ Todo lo del Básico +
├── ✅ 3 temas personalizados
├── ✅ Modo oscuro activado
├── ✅ Selector de temas en interfaz
└── ✅ Soporte técnico 30 días
```

**Checklist para entrega:**

```markdown
# Checklist de Entrega - Cliente: [NOMBRE]

## Pre-entrega
- [ ] Crear tema personalizado con colores del cliente
- [ ] Reemplazar logo (header, favicon, login)
- [ ] Configurar proyecto Firebase del cliente
- [ ] Actualizar nombre de empresa en todos los HTML
- [ ] Crear usuario administrador inicial
- [ ] Probar todas las funcionalidades

## Archivos a Entregar
- [ ] Código fuente completo
- [ ] Archivo de configuración Firebase
- [ ] Credenciales de acceso inicial
- [ ] Manual de usuario (PDF)
- [ ] Video tutorial de uso (opcional)

## Post-entrega
- [ ] Capacitación de 2 horas
- [ ] Documento de garantía y soporte
- [ ] Factura emitida
```

### Estrategia de Precios Sugerida

| Servicio | Precio Sugerido | Incluye |
|----------|----------------|---------|
| **Instalación Básica** | $199 - $299 USD | Sistema + 1 tema + Firebase + Manual |
| **Instalación Premium** | $399 - $599 USD | Sistema + 3 temas + Dark mode + Selector + Soporte 30d |
| **Personalización Adicional** | $100 USD | Tema extra personalizado |
| **Capacitación Presencial** | $150 USD | 4 horas de capacitación |
| **Soporte Mensual** | $49 USD/mes | Soporte técnico + actualizaciones |
| **Hosting + Mantenimiento** | $79 USD/mes | Firebase Pro + backups + monitoreo |

### Argumentos de Venta

**Para Farmacias Pequeñas:**
> "Sistema completo de farmacia por menos de $300. Sin mensualidades, sin licencias. Una sola inversión, úsalo para siempre."

**Para Farmacias Medianas:**
> "Sistema profesional con tu logo y colores. Controla inventario, ventas y reportes desde cualquier dispositivo."

**Para Cadenas:**
> "Plataforma escalable con temas personalizados para cada sucursal. Reportes centralizados en tiempo real."

### Canales de Venta Sugeridos

1. **Facebook Marketplace** - Publicar como servicio
2. **Grupos de Facebook** - Grupos de farmacéuticos, emprendedores
3. **Instagram** - Videos demostrativos
4. **LinkedIn** - Contacto directo con dueños de farmacias
5. **Fiverr/Upwork** - Como servicio de desarrollo
6. **Boca a boca** - Referencias de clientes satisfechos

---

## 🚀 Tips Avanzados

### 1. Animaciones Personalizadas

```css
:root {
    --animation-duration: 0.3s;
}

.custom-animation {
    animation: slideIn var(--animation-duration) ease-out;
}
```

### 2. Fuentes Personalizadas

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');

:root {
    --font-primary: 'Montserrat', sans-serif;
}
```

### 3. Degradados Personalizados

```css
:root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
    background: var(--primary-gradient);
}
```

---

## 📞 Soporte y Consultas

Para consultas sobre personalización:
- Email: [tu-email@ejemplo.com]
- WhatsApp: [tu-numero]

---

**Última actualización:** Enero 2025  
**Versión del sistema:** 1.0.0  
**Documentación creada por:** [Tu Nombre/Empresa]
