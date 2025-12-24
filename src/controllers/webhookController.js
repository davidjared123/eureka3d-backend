import { esPedido, parsearPedido, formatearDescripcionTrello } from '../utils/messageParser.js';
import trelloService from '../services/trelloService.js';
import evolutionService from '../services/evolutionService.js';

/**
 * Controlador para manejar webhooks de Evolution API
 */

// ID del grupo permitido (configurar en .env)
// Para obtener el ID, envía un mensaje al grupo y mira el log
const GRUPO_PERMITIDO = process.env.WHATSAPP_GROUP_ID || null;

/**
 * Procesa un webhook de mensaje de Evolution API
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleEvolutionWebhook(req, res) {
    const startTime = Date.now();

    try {
        const payload = req.body;

        // Log del evento recibido (resumido para eficiencia)
        console.log(`[Webhook] Evento recibido: ${payload.event || 'unknown'}`);

        // Solo procesamos mensajes recibidos
        if (payload.event !== 'messages.upsert') {
            return res.status(200).json({
                processed: false,
                reason: 'Evento no es mensaje'
            });
        }

        // Extraer información del mensaje
        const message = payload.data;
        const instanceName = payload.instance;

        if (!message) {
            return res.status(200).json({
                processed: false,
                reason: 'Sin datos de mensaje'
            });
        }

        // Ignorar mensajes propios y de status
        if (message.key?.fromMe || message.key?.remoteJid?.includes('status@broadcast')) {
            return res.status(200).json({
                processed: false,
                reason: 'Mensaje propio o status'
            });
        }

        // Log del remoteJid para identificar grupos
        const remoteJid = message.key?.remoteJid || '';
        console.log(`[Webhook] 📩 Mensaje de: ${remoteJid}`);

        // Filtrar solo mensajes del grupo permitido (si está configurado)
        if (GRUPO_PERMITIDO && !remoteJid.includes(GRUPO_PERMITIDO)) {
            return res.status(200).json({
                processed: false,
                reason: `Mensaje no es del grupo configurado`
            });
        }

        // Obtener el texto del mensaje
        const textoMensaje = extraerTextoMensaje(message);

        // Verificar si es un pedido
        if (!esPedido(textoMensaje)) {
            return res.status(200).json({
                processed: false,
                reason: 'No contiene #pedido'
            });
        }

        console.log(`[Webhook] 🎯 Pedido detectado de: ${message.key?.remoteJid}`);

        // Parsear el pedido
        const pedido = parsearPedido(textoMensaje);
        if (!pedido) {
            return res.status(200).json({
                processed: false,
                reason: 'No se pudo parsear el pedido'
            });
        }

        // Crear la tarjeta en Trello
        const tarjeta = await trelloService.crearTarjeta({
            name: pedido.titulo,
            desc: formatearDescripcionTrello(pedido),
            due: pedido.fechaEntrega?.toISOString() || null,
        });

        console.log(`[Webhook] ✅ Tarjeta creada: ${tarjeta.id}`);

        // Procesar imagen si existe
        const tieneImagen = message.message?.imageMessage ||
            message.message?.documentMessage?.mimetype?.startsWith('image/');

        if (tieneImagen && tarjeta) {
            await procesarImagenAdjunta(message, instanceName, tarjeta.id);
        }

        const processingTime = Date.now() - startTime;
        console.log(`[Webhook] Procesado en ${processingTime}ms`);

        return res.status(200).json({
            processed: true,
            cardId: tarjeta.id,
            cardUrl: tarjeta.url,
            processingTime,
        });

    } catch (error) {
        console.error('[Webhook] Error procesando:', error.message);

        // Siempre responder 200 para evitar retries innecesarios de Evolution API
        return res.status(200).json({
            processed: false,
            error: error.message,
        });
    }
}

/**
 * Extrae el texto de diferentes tipos de mensajes
 * @param {Object} message - Objeto mensaje de Evolution API
 * @returns {string} Texto del mensaje
 */
function extraerTextoMensaje(message) {
    const msg = message.message;
    if (!msg) return '';

    // Mensaje de texto simple
    if (msg.conversation) {
        return msg.conversation;
    }

    // Mensaje extendido
    if (msg.extendedTextMessage?.text) {
        return msg.extendedTextMessage.text;
    }

    // Caption de imagen
    if (msg.imageMessage?.caption) {
        return msg.imageMessage.caption;
    }

    // Caption de documento
    if (msg.documentMessage?.caption) {
        return msg.documentMessage.caption;
    }

    // Caption de video
    if (msg.videoMessage?.caption) {
        return msg.videoMessage.caption;
    }

    return '';
}

/**
 * Procesa y adjunta la imagen del mensaje a la tarjeta de Trello
 * @param {Object} message - Mensaje con imagen
 * @param {string} instanceName - Nombre de la instancia
 * @param {string} cardId - ID de la tarjeta de Trello
 */
async function procesarImagenAdjunta(message, instanceName, cardId) {
    try {
        console.log(`[Webhook] Procesando imagen para tarjeta ${cardId}`);

        // Intentar obtener la media
        const mediaInfo = message.message?.imageMessage || message.message?.documentMessage;

        if (!mediaInfo) {
            console.log('[Webhook] No se encontró información de media');
            return;
        }

        // Descargar la imagen usando Evolution API
        const media = await evolutionService.descargarMediaPorKey(instanceName, message);

        if (media?.buffer) {
            await trelloService.adjuntarImagenDesdeBuffer(
                cardId,
                media.buffer,
                media.filename,
                media.mimeType
            );
            console.log(`[Webhook] ✅ Imagen adjuntada a tarjeta ${cardId}`);
        }
    } catch (error) {
        // No fallamos todo el proceso por una imagen
        console.error(`[Webhook] ⚠️ No se pudo adjuntar imagen: ${error.message}`);
    }
}

/**
 * Endpoint de verificación de salud del webhook
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
