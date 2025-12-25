import axios from 'axios';
import config from '../config/index.js';

/**
 * Servicio para enviar mensajes a WhatsApp via Evolution API
 */

const getBaseUrl = () => config.evolution.apiUrl;
const getApiKey = () => config.evolution.apiKey;

/**
 * Envía un mensaje de texto a un chat
 * @param {string} instanceName - Nombre de la instancia
 * @param {string} chatId - ID del chat (número@s.whatsapp.net o grupo@g.us)
 * @param {string} texto - Texto a enviar
 */
export async function enviarMensaje(instanceName, chatId, texto) {
    try {
        const response = await axios.post(
            `${getBaseUrl()}/message/sendText/${instanceName}`,
            {
                number: chatId,
                text: texto,
            },
            {
                headers: {
                    'apikey': getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

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
