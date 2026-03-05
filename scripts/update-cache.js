/**
 * ============================================================
 * update-cache.js — Cache Busting automático
 * ============================================================
 * Uso:
 *   node scripts/update-cache.js
 *
 * Qué hace:
 *  1. Escanea todos los .html dentro de /public
 *  2. Inyecta / actualiza meta tags de no-cache en cada <head>
 *  3. Agrega o actualiza ?v=VERSIÓN en todos los <link> y <script>
 *     que apunten a archivos LOCALES (ignora CDNs externos)
 * ============================================================
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN ──────────────────────────────────────────
const VERSION    = '3.18.1';             // ← cambia aquí en cada release
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
// ────────────────────────────────────────────────────────────

// Dominios que se consideran externos (CDN / librerías de terceros)
const EXTERNAL_DOMAINS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'www.gstatic.com',      // Firebase CDN
    'apis.google.com',
    'ajax.googleapis.com',
];

// Bloque de metas no-cache que se inyectará (con comentario de anclaje)
const NO_CACHE_COMMENT = '<!-- cache-busting-meta -->';
const NO_CACHE_BLOCK   = `${NO_CACHE_COMMENT}
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;

// ─── HELPERS ────────────────────────────────────────────────

/** Devuelve true si la URL apunta a un recurso externo */
function esExterno(url) {
    if (!url) return true;
    // URLs absolutas con protocolo
    if (/^https?:\/\//i.test(url)) {
        return EXTERNAL_DOMAINS.some(d => url.includes(d));
    }
    // Data URIs, mailto:, etc.
    if (/^(data:|mailto:|tel:|#)/i.test(url)) return true;
    // Si es relativa o empieza con / → es local
    return false;
}

/** Elimina un parámetro ?v=... o &v=... existente de una URL */
function limpiarVersion(url) {
    return url
        .replace(/[?&]v=[^&?#]*/g, '')   // quita ?v=x o &v=x
        .replace(/\?$/, '')               // quita ? vacío al final
        .replace(/&$/, '');              // quita & vacío al final
}

/** Agrega ?v=VERSION a una URL local */
function inyectarVersion(url) {
    const limpia = limpiarVersion(url);
    const sep = limpia.includes('?') ? '&' : '?';
    return `${limpia}${sep}v=${VERSION}`;
}

// ─── PROCESAMIENTO DE UN ARCHIVO HTML ───────────────────────

function procesarHtml(filePath) {
    let contenido = fs.readFileSync(filePath, 'utf8');
    let modificado = false;
    const nombre   = path.relative(PUBLIC_DIR, filePath);

    // ── 1. META TAGS NO-CACHE ──────────────────────────────
    if (contenido.includes(NO_CACHE_COMMENT)) {
        // Ya existe: actualizar el bloque completo por si cambió
        const RE_BLOQUE = new RegExp(
            `${escapeRegex(NO_CACHE_COMMENT)}[\\s\\S]*?<meta[^>]+Expires[^>]*>`,
            'g'
        );
        const nuevo = contenido.replace(RE_BLOQUE, NO_CACHE_BLOCK);
        if (nuevo !== contenido) {
            contenido  = nuevo;
            modificado = true;
        }
    } else {
        // No existe: inyectar justo después de <head> (o del charset)
        // Preferimos después del <meta charset=...> si lo hay
        const ancla = contenido.match(/<meta\s+charset[^>]+>/i)
            ? /<meta\s+charset[^>]+>/i
            : /<head[^>]*>/i;

        const nuevo = contenido.replace(ancla, m => `${m}\n    ${NO_CACHE_BLOCK}`);
        if (nuevo !== contenido) {
            contenido  = nuevo;
            modificado = true;
        }
    }

    // ── 2. VERSIONAR <link rel="stylesheet" href="..."> ───
    contenido = contenido.replace(
        /(<link\b[^>]*\bhref=")([^"]+)("[^>]*>)/g,
        (match, pre, url, post) => {
            if (esExterno(url)) return match;          // ignorar CDN
            // Solo aplicar a hojas de estilo (o links que no son CDN)
            if (!/rel=["']stylesheet["']/i.test(match)) return match;
            const nueva = inyectarVersion(url);
            if (nueva === url) return match;
            modificado = true;
            return `${pre}${nueva}${post}`;
        }
    );

    // ── 3. VERSIONAR <script src="..."> ───────────────────
    contenido = contenido.replace(
        /(<script\b[^>]*\bsrc=")([^"]+)("[^>]*>)/g,
        (match, pre, url, post) => {
            if (esExterno(url)) return match;          // ignorar CDN
            const nueva = inyectarVersion(url);
            if (nueva === url) return match;
            modificado = true;
            return `${pre}${nueva}${post}`;
        }
    );

    // ── Guardar si hubo cambios ────────────────────────────
    if (modificado) {
        fs.writeFileSync(filePath, contenido, 'utf8');
        console.log(`  ✅  ${nombre}`);
    } else {
        console.log(`  ─   ${nombre}  (sin cambios)`);
    }
}

// ─── ESCANEO RECURSIVO DE .html ─────────────────────────────

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

/** Escapa caracteres especiales de regex */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── ENTRY POINT ────────────────────────────────────────────

console.log('');
console.log('═══════════════════════════════════════');
console.log(`  Cache Busting  →  v${VERSION}`);
console.log(`  Directorio     →  ${PUBLIC_DIR}`);
console.log('═══════════════════════════════════════');
console.log('');

if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`❌  No se encontró el directorio: ${PUBLIC_DIR}`);
    process.exit(1);
}

escanearDir(PUBLIC_DIR);

console.log('');
console.log('✔  Cache busting completado.');
console.log('');
