import * as chrono from 'chrono-node';

/**
 * Parser de fechas en lenguaje natural con soporte para español
 * Usa chrono-node con personalización para Venezuela
 */

// Crear parser personalizado con español como idioma base
const customChrono = chrono.es.casual.clone();

// Timezone de Venezuela (UTC-4)
const TIMEZONE_VENEZUELA = 'America/Caracas';
const UTC_OFFSET_VENEZUELA = -4 * 60; // -4 horas en minutos

/**
 * Extrae una fecha de un texto en lenguaje natural
 * @param {string} texto - Texto que contiene la fecha
 * @param {Date} [fechaReferencia] - Fecha de referencia (default: ahora)
 * @returns {Date|null} Fecha parseada o null si no se encuentra
 */
export function extraerFecha(texto, fechaReferencia = new Date()) {
    if (!texto || typeof texto !== 'string') {
        return null;
    }

    try {
        // Limpiar y normalizar el texto
        const textoNormalizado = normalizarTexto(texto);

        // Intentar parsear con chrono-node (español)
        const resultados = customChrono.parse(textoNormalizado, fechaReferencia, {
            forwardDate: true, // Siempre hacia el futuro
        });

        if (resultados.length > 0) {
            const resultado = resultados[0];
            let fecha = resultado.start.date();

            // Si no tiene hora específica, poner al mediodía
            if (!resultado.start.isCertain('hour')) {
                fecha.setHours(12, 0, 0, 0);
            }

            console.log(`[DateParser] Fecha extraída: "${resultado.text}" -> ${fecha.toISOString()}`);
            return fecha;
        }

        // Intentar patrones adicionales manualmente
        const fechaManual = parsearPatronesAdicionales(textoNormalizado, fechaReferencia);
        if (fechaManual) {
            return fechaManual;
        }

        console.log(`[DateParser] No se encontró fecha en: "${texto.substring(0, 50)}..."`);
        return null;
    } catch (error) {
        console.error(`[DateParser] Error parseando fecha: ${error.message}`);
        return null;
    }
}

/**
 * Normaliza el texto para mejor parsing
 * @param {string} texto - Texto original
 * @returns {string} Texto normalizado
 */
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        // Normalizar variaciones venezolanas
        .replace(/pa'?l?(?=\s)/gi, 'para el')
        .replace(/pa'?\s+el/gi, 'para el')
        .replace(/el proximo/gi, 'el próximo')
        .replace(/proxima/gi, 'próxima')
        .replace(/manana/gi, 'mañana')
        // Normalizar formatos de fecha
        .replace(/(\d{1,2})\s*de\s*(\w+)/gi, '$1 de $2')
        .replace(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, (_, d, m, y) => {
            const year = y ? (y.length === 2 ? `20${y}` : y) : new Date().getFullYear();
            return `${d}/${m}/${year}`;
        });
}

/**
 * Patrones adicionales que chrono podría no capturar
 * @param {string} texto - Texto normalizado
 * @param {Date} referencia - Fecha de referencia
 * @returns {Date|null}
 */
function parsearPatronesAdicionales(texto, referencia) {
    // Patrón: "en X días"
    const matchDias = texto.match(/en\s+(\d+)\s+d[ií]as?/i);
    if (matchDias) {
        const dias = parseInt(matchDias[1]);
        const fecha = new Date(referencia);
        fecha.setDate(fecha.getDate() + dias);
        fecha.setHours(12, 0, 0, 0);
        return fecha;
    }

    // Patrón: "esta semana"
    if (texto.includes('esta semana')) {
        const fecha = new Date(referencia);
        // Viernes de esta semana
        const diasHastaViernes = (5 - fecha.getDay() + 7) % 7;
        fecha.setDate(fecha.getDate() + (diasHastaViernes || 7));
        fecha.setHours(12, 0, 0, 0);
        return fecha;
    }

    // Patrón: "fin de semana"
    if (texto.includes('fin de semana')) {
        const fecha = new Date(referencia);
        const diasHastaSabado = (6 - fecha.getDay() + 7) % 7;
        fecha.setDate(fecha.getDate() + (diasHastaSabado || 7));
        fecha.setHours(12, 0, 0, 0);
        return fecha;
    }

    return null;
}

/**
 * Formatea una fecha para mostrar al usuario
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} Fecha formateada en español
 */
export function formatearFecha(fecha) {
    if (!fecha || !(fecha instanceof Date)) {
        return 'Sin fecha';
    }

    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: TIMEZONE_VENEZUELA,
    };

    return fecha.toLocaleDateString('es-VE', opciones);
}

/**
 * Calcula días restantes hasta una fecha
 * @param {Date} fecha - Fecha objetivo
 * @returns {number} Días restantes (negativo si ya pasó)
 */
export function diasRestantes(fecha) {
    if (!fecha) return null;

    const ahora = new Date();
    const diferencia = fecha.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una fecha es urgente (menos de 2 días)
 * @param {Date} fecha - Fecha a verificar
 * @returns {boolean}
 */
export function esUrgente(fecha) {
    const dias = diasRestantes(fecha);
    return dias !== null && dias <= 2;
}

export default {
    extraerFecha,
    formatearFecha,
    diasRestantes,
    esUrgente,
};
