import { extraerFecha } from './dateParser.js';

/**
 * Parser de mensajes de WhatsApp para extraer pedidos
 */

// Hashtag que identifica un pedido
const HASHTAG_PEDIDO = '#pedido';

/**
 * Verifica si un mensaje es un pedido válido
 * @param {string} mensaje - Texto del mensaje
 * @returns {boolean}
 */
export function esPedido(mensaje) {
    if (!mensaje || typeof mensaje !== 'string') {
        return false;
    }
    return mensaje.toLowerCase().includes(HASHTAG_PEDIDO);
}

/**
 * Extrae la información de un pedido desde un mensaje
 * @param {string} mensaje - Texto del mensaje completo
 * @returns {Object} Datos del pedido extraídos
 */
export function parsearPedido(mensaje) {
    if (!mensaje) {
        return null;
    }

    // Separar líneas y limpiar
    const lineas = mensaje
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lineas.length === 0) {
        return null;
    }

    // La primera línea (o la que contiene #pedido) es el título base
    let titulo = '';
    let descripcionLineas = [];
    let encontroHashtag = false;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];

        if (linea.toLowerCase().includes(HASHTAG_PEDIDO)) {
            encontroHashtag = true;
            // El título es esta línea sin el hashtag
            titulo = linea
                .replace(/#pedido/gi, '')
                .replace(/^[\s\-:]+/, '')
                .trim();

            // El resto es descripción
            descripcionLineas = lineas.slice(i + 1);
            break;
        }
    }

    // Si no encontramos hashtag en una línea específica, usar primera línea como título
    if (!encontroHashtag) {
        titulo = lineas[0].replace(/#pedido/gi, '').trim();
        descripcionLineas = lineas.slice(1);
    }

    // Si el título quedó vacío, intentar con la siguiente línea
    if (!titulo && descripcionLineas.length > 0) {
        titulo = descripcionLineas[0];
        descripcionLineas = descripcionLineas.slice(1);
    }

    // Si aún no hay título, usar un default
    if (!titulo) {
        titulo = 'Nuevo pedido';
    }

    // Limitar longitud del título (Trello tiene límites)
    if (titulo.length > 100) {
        titulo = titulo.substring(0, 97) + '...';
    }

    // Construir descripción completa
    const descripcion = descripcionLineas.length > 0
        ? descripcionLineas.join('\n')
        : mensaje;

    // Extraer fecha de todo el mensaje
    const fechaEntrega = extraerFecha(mensaje);

    // Extraer información adicional
    const infoAdicional = extraerInfoAdicional(mensaje);

    return {
        titulo,
        descripcion,
        fechaEntrega,
        ...infoAdicional,
        mensajeOriginal: mensaje,
    };
}

/**
 * Extrae información adicional del mensaje
 * @param {string} mensaje - Texto del mensaje
 * @returns {Object} Info adicional extraída
 */
function extraerInfoAdicional(mensaje) {
    const info = {
        gramos: null,
        material: null,
        color: null,
        cantidad: 1,
        urgente: false,
    };

    const textoLower = mensaje.toLowerCase();

    // Detectar urgencia
    info.urgente = /urgente|asap|para ya|lo antes posible|rapido/i.test(mensaje);

    // Extraer peso en gramos
    const matchGramos = mensaje.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gramos?)/i);
    if (matchGramos) {
        info.gramos = parseFloat(matchGramos[1]);
    }

    // Extraer cantidad
    const matchCantidad = mensaje.match(/(\d+)\s*(?:unidades?|piezas?|copias?)/i);
    if (matchCantidad) {
        info.cantidad = parseInt(matchCantidad[1]);
    }

    // Detectar material
    const materiales = ['pla', 'abs', 'petg', 'tpu', 'nylon', 'resina'];
    for (const mat of materiales) {
        if (textoLower.includes(mat)) {
            info.material = mat.toUpperCase();
            break;
        }
    }

    // Detectar color
    const colores = [
        'negro', 'blanco', 'rojo', 'azul', 'verde', 'amarillo',
        'naranja', 'morado', 'rosa', 'gris', 'transparente', 'dorado', 'plateado'
    ];
    for (const color of colores) {
        if (textoLower.includes(color)) {
            info.color = color.charAt(0).toUpperCase() + color.slice(1);
            break;
        }
    }

    return info;
}

/**
 * Formatea un pedido para la descripción en Trello
 * @param {Object} pedido - Datos del pedido parseado
 * @returns {string} Descripción formateada para Trello
 */
export function formatearDescripcionTrello(pedido) {
    const secciones = [];

    // Encabezado
    secciones.push('## 📦 Detalles del Pedido\n');

    // Descripción original
    secciones.push('### Descripción');
    secciones.push(pedido.descripcion || pedido.mensajeOriginal);
    secciones.push('');

    // Especificaciones si existen
    const specs = [];
    if (pedido.cantidad > 1) specs.push(`**Cantidad:** ${pedido.cantidad}`);
    if (pedido.material) specs.push(`**Material:** ${pedido.material}`);
    if (pedido.color) specs.push(`**Color:** ${pedido.color}`);
    if (pedido.gramos) specs.push(`**Peso estimado:** ${pedido.gramos}g`);

    if (specs.length > 0) {
        secciones.push('### Especificaciones');
        secciones.push(specs.join('\n'));
        secciones.push('');
    }

    // Etiquetas
    if (pedido.urgente) {
        secciones.push('### ⚠️ Prioridad');
        secciones.push('**URGENTE**');
        secciones.push('');
    }

    // Metadata
    secciones.push('---');
    secciones.push(`*Recibido vía WhatsApp: ${new Date().toLocaleString('es-VE')}*`);

    return secciones.join('\n');
}

export default {
    esPedido,
    parsearPedido,
    formatearDescripcionTrello,
};
