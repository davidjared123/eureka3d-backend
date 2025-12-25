import { extraerFecha, formatearFecha } from '../utils/dateParser.js';
import trelloService from '../services/trelloService.js';
import evolutionService from '../services/evolutionService.js';
import whatsappService from '../services/whatsappService.js';
import pedidoSession from '../services/pedidoSession.js';

/**
 * Controlador conversacional para pedidos
 */

// ID del grupo permitido
const GRUPO_PERMITIDO = process.env.WHATSAPP_GROUP_ID || null;

// Comandos para iniciar pedido
const COMANDOS_INICIO = [
    'agendame',
    'agéndame',
    'agendar',
    'nuevo pedido',
    'añadir pedido',
    'anadir pedido',
    'añádelo al trello',
    'anadelo al trello',
    'crear pedido',
    '#pedido',
];

// Comandos para confirmar
const COMANDOS_CONFIRMAR = ['sí', 'si', 'yes', 'confirmar', 'dale', 'ok', 'listo'];

// Comandos para cancelar
const COMANDOS_CANCELAR = ['no', 'cancelar', 'cancel', 'salir'];

// Comandos para modificar pedidos existentes
const PATRON_MODIFICAR = /^(al título|al titulo|en el pedido|pedido)\s+(.+?)\s*[,:]?\s*(añade|anade|agrega|pon|cambia)\s+(.+)$/i;

/**
 * Procesa un webhook de Evolution API con lógica conversacional
 */
export async function handleEvolutionWebhook(req, res) {
    const startTime = Date.now();

    try {
        const payload = req.body;

        // Solo procesamos mensajes recibidos
        if (payload.event !== 'messages.upsert') {
            return res.status(200).json({ processed: false, reason: 'No es mensaje' });
        }

        const message = payload.data;
        const instanceName = payload.instance;

        if (!message) {
            return res.status(200).json({ processed: false, reason: 'Sin datos' });
        }

        // Ignorar mensajes propios y de status
        if (message.key?.fromMe || message.key?.remoteJid?.includes('status@broadcast')) {
            return res.status(200).json({ processed: false, reason: 'Mensaje propio' });
        }

        const remoteJid = message.key?.remoteJid || '';
        const nombreUsuario = message.pushName || 'Usuario';

        console.log(`[Webhook] 📩 Mensaje de: ${remoteJid} (${nombreUsuario})`);

        // Filtrar solo mensajes del grupo permitido
        if (GRUPO_PERMITIDO && !remoteJid.includes(GRUPO_PERMITIDO)) {
            return res.status(200).json({ processed: false, reason: 'No es del grupo' });
        }

        // Extraer texto e info de imagen
        const texto = extraerTextoMensaje(message);
        const tieneImagen = message.message?.imageMessage != null;

        console.log(`[Webhook] Texto: "${texto.substring(0, 50)}..." | Imagen: ${tieneImagen}`);

        // Procesar el mensaje
        const respuesta = await procesarMensaje({
            chatId: remoteJid,
            texto,
            tieneImagen,
            message,
            instanceName,
            nombreUsuario,
        });

        // Enviar respuesta si hay
        if (respuesta) {
            await whatsappService.enviarMensaje(instanceName, remoteJid, respuesta);
        }

        const processingTime = Date.now() - startTime;
        return res.status(200).json({ processed: true, processingTime });

    } catch (error) {
        console.error('[Webhook] Error:', error.message);
        return res.status(200).json({ processed: false, error: error.message });
    }
}

/**
 * Lógica principal de procesamiento de mensajes
 */
async function procesarMensaje({ chatId, texto, tieneImagen, message, instanceName, nombreUsuario }) {
    const textoLower = texto.toLowerCase().trim();

    // Verificar si es comando de inicio
    const esInicio = COMANDOS_INICIO.some(cmd => textoLower.includes(cmd));

    // Verificar si hay sesión activa
    const sesionActiva = pedidoSession.obtenerSesion(chatId);

    // ============================================
    // CASO 1: Iniciar nuevo pedido
    // ============================================
    if (esInicio) {
        pedidoSession.iniciarSesion(chatId, nombreUsuario);

        // Si el mensaje tiene más contenido además del comando, guardarlo
        const contenidoExtra = texto.replace(/#pedido|agendame|agéndame|nuevo pedido/gi, '').trim();
        if (contenidoExtra) {
            pedidoSession.agregarDescripcion(chatId, contenidoExtra);
        }

        // Si tiene imagen, procesarla
        if (tieneImagen) {
            await guardarImagen(chatId, message, instanceName);
        }

        return `📝 *Nuevo pedido iniciado por ${nombreUsuario}*\n\n` +
            `Envía la descripción del pedido. Puedes enviar:\n` +
            `📄 Textos con los detalles\n` +
            `📷 Fotos de referencia\n\n` +
            `Cuando termines, escribe: *listo* o *confirmar*\n` +
            `Para cancelar: *cancelar*`;
    }

    // ============================================
    // CASO 2: Hay sesión activa
    // ============================================
    if (sesionActiva) {
        return await procesarMensajeEnSesion(sesionActiva, {
            chatId, texto, textoLower, tieneImagen, message, instanceName
        });
    }

    // ============================================
    // CASO 3: Modificar pedido existente
    // ============================================
    const matchModificar = texto.match(PATRON_MODIFICAR);
    if (matchModificar) {
        const tituloBuscar = matchModificar[2];
        const modificacion = matchModificar[4];
        return await modificarPedidoExistente(tituloBuscar, modificacion);
    }

    // No hay acción que tomar
    return null;
}

/**
 * Procesa mensajes cuando hay una sesión activa
 */
async function procesarMensajeEnSesion(sesion, { chatId, texto, textoLower, tieneImagen, message, instanceName }) {

    // Verificar cancelación
    if (COMANDOS_CANCELAR.some(cmd => textoLower === cmd)) {
        pedidoSession.cancelarSesion(chatId);
        return '❌ Pedido cancelado.';
    }

    // ============================================
    // Estado: ESPERANDO_CONFIRMACION
    // ============================================
    if (sesion.estado === 'ESPERANDO_CONFIRMACION') {
        if (COMANDOS_CONFIRMAR.some(cmd => textoLower.includes(cmd))) {
            // Crear tarjeta en Trello
            return await crearTarjetaDesdeSesion(chatId);
        } else if (COMANDOS_CANCELAR.some(cmd => textoLower === cmd)) {
            // Usuario dijo "no" - quiere modificar algo
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_MAS_INFO' });
            return '👍 Ok, ¿qué deseas modificar o agregar?';
        } else {
            // Asumir que quiere añadir más información
            if (texto) pedidoSession.agregarDescripcion(chatId, texto);
            if (tieneImagen) await guardarImagen(chatId, message, instanceName);

            const sesionActualizada = pedidoSession.obtenerSesion(chatId);
            return pedidoSession.generarResumen(sesionActualizada);
        }
    }

    // ============================================
    // Estado: ESPERANDO_MAS_INFO
    // ============================================
    if (sesion.estado === 'ESPERANDO_MAS_INFO') {
        if (COMANDOS_CONFIRMAR.some(cmd => textoLower === cmd)) {
            // Usuario quiere agregar más
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_DESCRIPCION' });
            return '📝 Perfecto, sigue enviando más detalles o imágenes.';
        } else if (COMANDOS_CANCELAR.some(cmd => textoLower === cmd) || textoLower === 'no') {
            // Usuario NO quiere agregar más - preguntar fecha si no tiene
            if (!sesion.fechaEntrega) {
                pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_FECHA' });
                return '📅 ¿Para cuándo es la entrega?\n\n' +
                    'Puedes escribir:\n' +
                    '• *hoy*\n' +
                    '• *mañana*\n' +
                    '• *viernes*\n' +
                    '• *30 de diciembre*\n' +
                    '• *en 3 días*';
            }
            // Ya tiene fecha, mostrar resumen para confirmar
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_CONFIRMACION' });
            return pedidoSession.generarResumen(sesion);
        } else {
            // No entendió, asumir que está agregando más contenido
            if (texto) pedidoSession.agregarDescripcion(chatId, texto);
            if (tieneImagen) await guardarImagen(chatId, message, instanceName);
            const sesionActualizada = pedidoSession.obtenerSesion(chatId);
            return pedidoSession.generarPreguntaMasInfo(sesionActualizada);
        }
    }

    // ============================================
    // Estado: ESPERANDO_DESCRIPCION
    // ============================================

    // Verificar si es comando de confirmación/listo
    if (COMANDOS_CONFIRMAR.some(cmd => textoLower === cmd) || textoLower === 'listo') {
        // Verificar si tenemos suficiente información
        if (sesion.descripcion.length === 0 && sesion.imagenes.length === 0) {
            return '⚠️ No has enviado ninguna descripción ni imagen. Envía los detalles del pedido.';
        }

        // Preguntar por fecha si no la tiene
        if (!sesion.fechaEntrega) {
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_FECHA' });
            return '📅 ¿Para cuándo es la entrega?\n\n' +
                'Puedes escribir:\n' +
                '• *hoy*\n' +
                '• *mañana*\n' +
                '• *viernes*\n' +
                '• *30 de diciembre*\n' +
                '• *en 3 días*';
        }

        // Mostrar resumen para confirmar
        pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_CONFIRMACION' });
        return pedidoSession.generarResumen(sesion);
    }

    // ============================================
    // Estado: ESPERANDO_FECHA
    // ============================================
    if (sesion.estado === 'ESPERANDO_FECHA') {
        const fecha = extraerFecha(texto);
        if (fecha) {
            pedidoSession.establecerFecha(chatId, fecha, texto);
            const sesionActualizada = pedidoSession.obtenerSesion(chatId);
            return pedidoSession.generarResumen(sesionActualizada);
        } else {
            return '❓ No entendí la fecha. Intenta con:\n' +
                '• *hoy*, *mañana*\n' +
                '• *viernes*, *lunes*\n' +
                '• *25 de diciembre*';
        }
    }

    // ============================================
    // Acumular contenido (estado normal: ESPERANDO_DESCRIPCION)
    // ============================================

    // Verificar si el texto contiene una fecha
    const posibleFecha = extraerFecha(texto);
    if (posibleFecha) {
        pedidoSession.establecerFecha(chatId, posibleFecha, texto);
    }

    // Guardar texto
    if (texto && !COMANDOS_CONFIRMAR.includes(textoLower)) {
        pedidoSession.agregarDescripcion(chatId, texto);
    }

    // Guardar imagen
    if (tieneImagen) {
        await guardarImagen(chatId, message, instanceName);
    }

    // Después de recibir contenido, preguntar si quiere agregar más
    const sesionActualizada = pedidoSession.obtenerSesion(chatId);
    if (sesionActualizada && (texto || tieneImagen)) {
        pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_MAS_INFO' });
        return pedidoSession.generarPreguntaMasInfo(sesionActualizada);
    }

    return null; // No responder si no hay contenido
}

/**
 * Guarda una imagen en la sesión
 */
async function guardarImagen(chatId, message, instanceName) {
    try {
        const mediaInfo = message.message?.imageMessage;
        if (mediaInfo) {
            pedidoSession.agregarImagen(chatId, {
                messageId: message.key.id,
                caption: mediaInfo.caption || '',
                instanceName,
                message, // Guardamos el mensaje completo para descargar después
            });
        }
    } catch (error) {
        console.error('[Webhook] Error guardando imagen:', error.message);
    }
}

/**
 * Crea la tarjeta en Trello desde una sesión
 */
async function crearTarjetaDesdeSesion(chatId) {
    const sesion = pedidoSession.finalizarSesion(chatId);

    if (!sesion) {
        return '❌ Error: No se encontró la sesión.';
    }

    try {
        // Construir descripción
        const descripcion = [
            '## 📦 Pedido recibido por WhatsApp',
            '',
            '### Descripción',
            sesion.descripcion.join('\n\n'),
            '',
            '---',
            `*Solicitado por:* ${sesion.nombreUsuario}`,
            `*Fecha:* ${new Date().toLocaleString('es-VE')}`,
        ].join('\n');

        // Crear tarjeta
        const tarjeta = await trelloService.crearTarjeta({
            name: sesion.titulo || 'Nuevo pedido',
            desc: descripcion,
            due: sesion.fechaEntrega?.toISOString() || null,
        });

        console.log(`[Webhook] ✅ Tarjeta creada: ${tarjeta.id}`);

        // Subir imágenes
        for (const img of sesion.imagenes) {
            try {
                const media = await evolutionService.descargarMediaPorKey(img.instanceName, img.message);
                if (media?.buffer) {
                    await trelloService.adjuntarImagenDesdeBuffer(
                        tarjeta.id,
                        media.buffer,
                        media.filename,
                        media.mimeType
                    );
                }
            } catch (err) {
                console.error('[Webhook] Error subiendo imagen:', err.message);
            }
        }

        const fechaTexto = sesion.fechaEntrega ? formatearFecha(sesion.fechaEntrega) : 'sin fecha';

        return `✅ *Pedido creado exitosamente*\n\n` +
            `📋 *Título:* ${sesion.titulo}\n` +
            `📅 *Entrega:* ${fechaTexto}\n` +
            `📷 *Imágenes:* ${sesion.imagenes.length}\n\n` +
            `La tarjeta ya está en Trello.`;

    } catch (error) {
        console.error('[Webhook] Error creando tarjeta:', error.message);
        return `❌ Error creando el pedido: ${error.message}`;
    }
}

/**
 * Modifica un pedido existente en Trello
 */
async function modificarPedidoExistente(tituloBuscar, modificacion) {
    try {
        // Buscar tarjetas que coincidan con el título
        const tarjetas = await trelloService.obtenerPedidosPendientes();
        const tarjetaEncontrada = tarjetas.find(t =>
            t.name.toLowerCase().includes(tituloBuscar.toLowerCase())
        );

        if (!tarjetaEncontrada) {
            return `❌ No encontré un pedido con título "${tituloBuscar}".\n\n` +
                `Pedidos actuales:\n` +
                tarjetas.slice(0, 5).map(t => `• ${t.name}`).join('\n');
        }

        // Añadir la modificación a la descripción
        const nuevaDesc = tarjetaEncontrada.desc + `\n\n**Actualización:** ${modificacion}`;

        // TODO: Implementar actualización de tarjeta en trelloService
        // Por ahora, informamos que se detectó
        return `📝 Modificación detectada para "${tarjetaEncontrada.name}":\n` +
            `"${modificacion}"\n\n` +
            `(Funcionalidad de actualización próximamente)`;

    } catch (error) {
        console.error('[Webhook] Error modificando pedido:', error.message);
        return `❌ Error buscando el pedido: ${error.message}`;
    }
}

/**
 * Extrae texto de diferentes tipos de mensajes
 */
function extraerTextoMensaje(message) {
    const msg = message.message;
    if (!msg) return '';

    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;

    return '';
}

/**
 * Health check
 */
export function webhookHealth(req, res) {
    res.status(200).json({
        status: 'ok',
        service: 'Eureka 3D Webhook',
        timestamp: new Date().toISOString(),
    });
}

export default {
    handleEvolutionWebhook,
    webhookHealth,
};
