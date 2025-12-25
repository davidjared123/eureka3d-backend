/**
 * Gestión de sesiones de pedidos en curso
 * Permite acumular mensajes antes de crear la tarjeta
 */

// Almacén de sesiones activas (en memoria)
// En producción podría usar Redis
const sesionesActivas = new Map();

// Tiempo máximo de sesión (30 minutos)
const TIMEOUT_SESION = 30 * 60 * 1000;

/**
 * Estructura de una sesión de pedido
 */
function crearSesionVacia(chatId, nombreUsuario) {
    return {
        chatId,
        nombreUsuario,
        // Estados: ESPERANDO_INICIO, ESPERANDO_MAS_INFO, ESPERANDO_TITULO, ESCRIBIENDO_TITULO, ESPERANDO_FECHA
        estado: 'ESPERANDO_INICIO',
        titulo: null,
        primerMensaje: null, // Primer mensaje recibido
        descripcion: [],
        imagenes: [],
        fechaEntrega: null,
        fechaTexto: null,
        iniciadoEn: Date.now(),
        ultimaActualizacion: Date.now(),
    };
}

/**
 * Inicia una nueva sesión de pedido
 */
export function iniciarSesion(chatId, nombreUsuario) {
    // Limpiar sesión anterior si existe
    if (sesionesActivas.has(chatId)) {
        sesionesActivas.delete(chatId);
    }

    const sesion = crearSesionVacia(chatId, nombreUsuario);
    sesionesActivas.set(chatId, sesion);

    console.log(`[Sesion] Nueva sesión iniciada para ${chatId}`);
    return sesion;
}

/**
 * Obtiene una sesión activa
 */
export function obtenerSesion(chatId) {
    const sesion = sesionesActivas.get(chatId);

    if (!sesion) return null;

    // Verificar si expiró
    if (Date.now() - sesion.ultimaActualizacion > TIMEOUT_SESION) {
        sesionesActivas.delete(chatId);
        console.log(`[Sesion] Sesión expirada para ${chatId}`);
        return null;
    }

    return sesion;
}

/**
 * Actualiza una sesión
 */
export function actualizarSesion(chatId, datos) {
    const sesion = sesionesActivas.get(chatId);
    if (!sesion) return null;

    Object.assign(sesion, datos, { ultimaActualizacion: Date.now() });
    sesionesActivas.set(chatId, sesion);

    return sesion;
}

/**
 * Añade texto a la descripción
 */
export function agregarDescripcion(chatId, texto) {
    const sesion = obtenerSesion(chatId);
    if (!sesion) return null;

    sesion.descripcion.push(texto);
    sesion.ultimaActualizacion = Date.now();

    // Si no hay título, usar primera línea del primer mensaje
    if (!sesion.titulo && sesion.descripcion.length === 1) {
        const primeraLinea = texto.split('\n')[0];
        sesion.titulo = primeraLinea.substring(0, 80);
    }

    return sesion;
}

/**
 * Añade una imagen
 */
export function agregarImagen(chatId, imagenInfo) {
    const sesion = obtenerSesion(chatId);
    if (!sesion) return null;

    sesion.imagenes.push(imagenInfo);
    sesion.ultimaActualizacion = Date.now();

    return sesion;
}

/**
 * Establece la fecha de entrega
 */
export function establecerFecha(chatId, fecha, textoOriginal) {
    const sesion = obtenerSesion(chatId);
    if (!sesion) return null;

    sesion.fechaEntrega = fecha;
    sesion.fechaTexto = textoOriginal;
    sesion.estado = 'ESPERANDO_CONFIRMACION';
    sesion.ultimaActualizacion = Date.now();

    return sesion;
}

/**
 * Establece el título
 */
export function establecerTitulo(chatId, titulo) {
    const sesion = obtenerSesion(chatId);
    if (!sesion) return null;

    sesion.titulo = titulo;
    sesion.ultimaActualizacion = Date.now();

    return sesion;
}

/**
 * Finaliza y elimina la sesión
 */
export function finalizarSesion(chatId) {
    const sesion = sesionesActivas.get(chatId);
    sesionesActivas.delete(chatId);
    console.log(`[Sesion] Sesión finalizada para ${chatId}`);
    return sesion;
}

/**
 * Cancela una sesión
 */
export function cancelarSesion(chatId) {
    sesionesActivas.delete(chatId);
    console.log(`[Sesion] Sesión cancelada para ${chatId}`);
}

/**
 * Verifica si hay sesión activa
 */
export function tieneSesionActiva(chatId) {
    return obtenerSesion(chatId) !== null;
}

/**
 * Genera pregunta inicial cuando llega un mensaje nuevo
 */
export function generarPreguntaInicio(sesion) {
    const tipoContenido = sesion.imagenes.length > 0 ? '📷 imagen' : '📄 mensaje';
    return `¿Iniciar pedido con esta ${tipoContenido}? (sí/no)`;
}

/**
 * Genera pregunta para confirmar título
 */
export function generarPreguntaTitulo(sesion) {
    const tituloActual = sesion.titulo || sesion.descripcion[0]?.substring(0, 50) || 'Nuevo pedido';
    return `¿Subir a Trello con el título:\n*"${tituloActual}"*?\n\nResponde *sí* o *otro* para cambiarlo.`;
}

/**
 * Genera resumen del pedido para confirmación
 */
export function generarResumen(sesion) {
    const lineas = [
        `📦 *Resumen del Pedido*`,
        ``,
        `*Título:* ${sesion.titulo || 'Sin título'}`,
        ``,
        `*Descripción:*`,
        sesion.descripcion.join('\n') || 'Sin descripción',
        ``,
        `*Fecha de entrega:* ${sesion.fechaTexto || 'No especificada'}`,
        `*Imágenes:* ${sesion.imagenes.length} adjunta(s)`,
    ];

    return lineas.join('\n');
}

/**
 * Genera pregunta para agregar más información
 */
export function generarPreguntaMasInfo(sesion) {
    const numMensajes = sesion.descripcion.length;
    const numImagenes = sesion.imagenes.length;

    return `✅ Recibido (${numMensajes} mensaje(s), ${numImagenes} imagen(es)).\n\n` +
        `¿Deseas *agregar algo más*? (sí/no)`;
}

export default {
    iniciarSesion,
    obtenerSesion,
    actualizarSesion,
    agregarDescripcion,
    agregarImagen,
    establecerFecha,
    establecerTitulo,
    finalizarSesion,
    cancelarSesion,
    tieneSesionActiva,
    generarPreguntaInicio,
    generarPreguntaTitulo,
    generarResumen,
    generarPreguntaMasInfo,
};
