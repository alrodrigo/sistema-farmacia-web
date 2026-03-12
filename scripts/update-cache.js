/**
 * ============================================================
 * update-cache.js — Cache Busting automático NIVEL DIOS
 * ============================================================
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN AUTOMÁTICA ───────────────────────────────
// Genera una versión única basada en la hora exacta (ej. 4.0.1709683)
const timestamp = Math.floor(Date.now() / 1000);
const VERSION   = `4.0.${timestamp}`; 
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
// ────────────────────────────────────────────────────────────

const EXTERNAL_DOMAINS = [
    'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com',
    'unpkg.com', 'cdn.jsdelivr.net', 'www.gstatic.com', 'apis.google.com', 'ajax.googleapis.com'
];

const NO_CACHE_COMMENT = '';
const NO_CACHE_BLOCK   = `${NO_CACHE_COMMENT}
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;

function esExterno(url) {
    if (!url) return true;
    if (/^https?:\/\//i.test(url)) return EXTERNAL_DOMAINS.some(d => url.includes(d));
    if (/^(data:|mailto:|tel:|#)/i.test(url)) return true;
    return false;
}

function limpiarVersion(url) {
    return url.replace(/[?&]v=[^&?#]*/g, '').replace(/\?$/, '').replace(/&$/, '');
}

function inyectarVersion(url) {
    const limpia = limpiarVersion(url);
    const sep = limpia.includes('?') ? '&' : '?';
    return `${limpia}${sep}v=${VERSION}`;
}

// ─── 1. ACTUALIZAR SERVICE WORKERS (EL ESCUDO) ──────────────
function actualizarServiceWorkers() {
    console.log('🔄 Actualizando Service Workers...');
    
    // Rutas posibles (busca en raíz o dentro de js/)
    const rutasSW = [
        path.join(PUBLIC_DIR, 'sw.js'),
        path.join(__dirname, '..', 'sw.js') // Por si lo tienes fuera de public
    ];
    const rutasReg = [
        path.join(PUBLIC_DIR, 'js', 'sw-register.js'),
        path.join(PUBLIC_DIR, 'sw-register.js')
    ];

    // Actualizar sw.js
    rutasSW.forEach(ruta => {
        if (fs.existsSync(ruta)) {
            let contenido = fs.readFileSync(ruta, 'utf8');
            contenido = contenido.replace(/const CACHE_VERSION\s*=\s*['"][^'"]+['"];/g, `const CACHE_VERSION = 'v${VERSION}';`);
            fs.writeFileSync(ruta, contenido, 'utf8');
            console.log(`  ✅  Actualizado: ${path.basename(ruta)} -> v${VERSION}`);
        }
    });

    // Actualizar sw-register.js
    rutasReg.forEach(ruta => {
        if (fs.existsSync(ruta)) {
            let contenido = fs.readFileSync(ruta, 'utf8');
            contenido = contenido.replace(/sw\.js\?v=[^'"]+/g, `sw.js?v=${VERSION}`);
            contenido = contenido.replace(/✅ Actualizado a v[^<]+/g, `✅ Actualizado a v${VERSION}`);
            fs.writeFileSync(ruta, contenido, 'utf8');
            console.log(`  ✅  Actualizado: ${path.basename(ruta)} -> v${VERSION}`);
        }
    });
}

// ─── 2. PROCESAMIENTO DE HTML ───────────────────────────────
function procesarHtml(filePath) {
    let contenido = fs.readFileSync(filePath, 'utf8');
    let modificado = false;
    const nombre   = path.relative(PUBLIC_DIR, filePath);

    if (contenido.includes(NO_CACHE_COMMENT)) {
        const RE_BLOQUE = new RegExp(`${escapeRegex(NO_CACHE_COMMENT)}[\\s\\S]*?<meta[^>]+Expires[^>]*>`, 'g');
        const nuevo = contenido.replace(RE_BLOQUE, NO_CACHE_BLOCK);
        if (nuevo !== contenido) { contenido = nuevo; modificado = true; }
    } else {
        const ancla = contenido.match(/<meta\s+charset[^>]+>/i) ? /<meta\s+charset[^>]+>/i : /<head[^>]*>/i;
        const nuevo = contenido.replace(ancla, m => `${m}\n    ${NO_CACHE_BLOCK}`);
        if (nuevo !== contenido) { contenido = nuevo; modificado = true; }
    }

    contenido = contenido.replace(/(<link\b[^>]*\bhref=")([^"]+)("[^>]*>)/g, (match, pre, url, post) => {
        if (esExterno(url) || !/rel=["']stylesheet["']/i.test(match)) return match;
        const nueva = inyectarVersion(url);
        if (nueva === url) return match;
        modificado = true; return `${pre}${nueva}${post}`;
    });

    contenido = contenido.replace(/(<script\b[^>]*\bsrc=")([^"]+)("[^>]*>)/g, (match, pre, url, post) => {
        if (esExterno(url)) return match;
        const nueva = inyectarVersion(url);
        if (nueva === url) return match;
        modificado = true; return `${pre}${nueva}${post}`;
    });

    if (modificado) {
        fs.writeFileSync(filePath, contenido, 'utf8');
        console.log(`  ✅  ${nombre}`);
    } else {
        console.log(`  ─   ${nombre}  (sin cambios)`);
    }
}

function escanearDir(dir) {
    const entradas = fs.readdirSync(dir, { withFileTypes: true });
    for (const entrada of entradas) {
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) {
            escanearDir(ruta);
        } else if (entrada.isFile() && entrada.name.endsWith('.html')) {
            procesarHtml(ruta);
        }
    }
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── ENTRY POINT ────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════');
console.log(`  🚀 Despliegue Automático (Cache Busting)`);
console.log(`  Versión generada →  v${VERSION}`);
console.log('═══════════════════════════════════════\n');

if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`❌  No se encontró el directorio: ${PUBLIC_DIR}`);
    process.exit(1);
}

actualizarServiceWorkers();
console.log('\n📄 Actualizando archivos HTML...');
escanearDir(PUBLIC_DIR);

console.log('\n✔  Sistema listo para subir a Firebase.\n');