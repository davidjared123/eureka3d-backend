import axios from 'axios';
import config from '../config/index.js';

/**
 * Servicio para interactuar con Evolution API
 * Permite descargar media de mensajes de WhatsApp
 */

/**
 * Descarga media desde Evolution API
 * @param {string} mediaUrl - URL de la media proporcionada por Evolution API
 * @param {string} [instanceName] - Nombre de la instancia de WhatsApp
 * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string}>}
 */
export async function descargarMedia(mediaUrl, instanceName) {
    try {
        // Evolution API puede proporcionar la URL directa o requerir autenticación
        const response = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 segundos para descargas
            headers: {
                'apikey': config.evolution.apiKey,
            },
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        const filename = extraerNombreArchivo(mediaUrl, contentType);

        console.log(`[EvolutionService] Media descargada: ${filename} (${contentType})`);

        return {
            buffer: Buffer.from(response.data),
            mimeType: contentType,
            filename,
        };
    } catch (error) {
        console.error(`[EvolutionService] Error descargando media: ${error.message}`);
        throw new Error(`No se pudo descargar la media: ${error.message}`);
    }
}

/**
 * Descarga media usando la API de Evolution directamente
 * Útil cuando solo tenemos el mediaKey
 * @param {string} instanceName - Nombre de la instancia
 * @param {Object} mediaInfo - Información del media del mensaje
 * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string}>}
 */
export async function descargarMediaPorKey(instanceName, mediaInfo) {
    try {
        const url = `${config.evolution.apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;

        const response = await axios.post(
            url,
            {
                message: mediaInfo,
                convertToMp4: false,
            },
            {
                headers: {
                    'apikey': config.evolution.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );

        if (response.data?.base64) {
            const base64Data = response.data.base64;
            const mimeType = response.data.mimetype || 'image/jpeg';
            const buffer = Buffer.from(base64Data, 'base64');

            return {
                buffer,
                mimeType,
                filename: `media_${Date.now()}.${obtenerExtension(mimeType)}`,
            };
        }

        throw new Error('No se recibió base64 en la respuesta');
    } catch (error) {
        console.error(`[EvolutionService] Error descargando por key: ${error.message}`);
        throw error;
    }
}

/**
 * Extrae el nombre de archivo de una URL o genera uno
 * @param {string} url - URL del archivo
 * @param {string} contentType - Tipo MIME
 * @returns {string} Nombre del archivo
 */
function extraerNombreArchivo(url, contentType) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();

        if (filename && filename.includes('.')) {
            return filename;
        }
    } catch (e) {
        // URL inválida, generamos nombre
    }

    const extension = obtenerExtension(contentType);
    return `media_${Date.now()}.${extension}`;
}

/**
 * Obtiene extensión de archivo basado en MIME type
 * @param {string} mimeType - Tipo MIME
 * @returns {string} Extensión del archivo
 */
function obtenerExtension(mimeType) {
    const mimeMap = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'audio/ogg': 'ogg',
        'audio/mpeg': 'mp3',
        'application/pdf': 'pdf',
    };

    return mimeMap[mimeType] || 'bin';
}

export default {
    descargarMedia,
    descargarMediaPorKey,
};
