import axios from 'axios';
import config from '../config/index.js';
import { markMessageAsSent } from '../controllers/webhookController.js';

/**
 * Servicio para enviar mensajes a WhatsApp via Evolution API
 */

const getBaseUrl = () => config.evolution.apiUrl;
const getApiKey = () => config.evolution.apiKey;

// Prefijo para identificar mensajes del bot
const BOT_PREFIX = '🤖 BOT: ';

/**
 * Envía un mensaje de texto a un chat
 * @param {string} instanceName - Nombre de la instancia
 * @param {string} chatId - ID del chat (número@s.whatsapp.net o grupo@g.us)
 * @param {string} texto - Texto a enviar
 */
export async function enviarMensaje(instanceName, chatId, texto) {
    try {
        // Agregar prefijo de bot al mensaje
        const textoConPrefijo = `${BOT_PREFIX}${texto}`;

        const response = await axios.post(
            `${getBaseUrl()}/message/sendText/${instanceName}`,
            {
                number: chatId,
                text: textoConPrefijo,
            },
            {
                headers: {
                    'apikey': getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        // Registrar el ID del mensaje para evitar procesarlo como webhook
        const messageId = response.data?.key?.id;
        if (messageId) {
            markMessageAsSent(messageId);
        }

        console.log(`[WhatsApp] Mensaje enviado a ${chatId}`);
        return response.data;
    } catch (error) {
        console.error(`[WhatsApp] Error enviando mensaje: ${error.message}`);
        throw error;
    }
}

/**
 * Envía un mensaje con botones (si está soportado)
 */
export async function enviarMensajeConOpciones(instanceName, chatId, texto, opciones) {
    // Evolution API puede no soportar botones en todas las versiones
    // Fallback a mensaje con numeración
    const textoConOpciones = [
        texto,
        '',
        ...opciones.map((op, i) => `${i + 1}. ${op}`),
    ].join('\n');

    return enviarMensaje(instanceName, chatId, textoConOpciones);
}

export default {
    enviarMensaje,
    enviarMensajeConOpciones,
};
