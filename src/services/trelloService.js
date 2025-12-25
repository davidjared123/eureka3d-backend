import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';

const TRELLO_BASE_URL = 'https://api.trello.com/1';

/**
 * Cliente HTTP configurado para Trello API
 */
const trelloClient = axios.create({
    baseURL: TRELLO_BASE_URL,
    timeout: 30000, // 30 segundos timeout
    params: {
        key: config.trello.apiKey,
        token: config.trello.token,
    },
});

/**
 * Manejo de errores centralizado para Trello API
 * @param {Error} error - Error de Axios
 * @param {string} operation - Nombre de la operación
 */
function handleTrelloError(error, operation) {
    const errorInfo = {
        operation,
        status: error.response?.status,
        message: error.response?.data || error.message,
        timestamp: new Date().toISOString(),
    };

    console.error(`[TrelloService] Error en ${operation}:`, errorInfo);

    // Errores específicos de Trello
    if (error.response?.status === 401) {
        throw new Error('Credenciales de Trello inválidas. Verifica API_KEY y TOKEN.');
    }
    if (error.response?.status === 404) {
        throw new Error(`Recurso no encontrado en Trello: ${operation}`);
    }
    if (error.response?.status === 429) {
        throw new Error('Límite de rate de Trello excedido. Intenta más tarde.');
    }

    throw new Error(`Error en Trello (${operation}): ${error.message}`);
}

/**
 * Crea una nueva tarjeta en Trello
 * @param {Object} cardData - Datos de la tarjeta
 * @param {string} cardData.name - Título de la tarjeta
 * @param {string} cardData.desc - Descripción de la tarjeta
 * @param {string} cardData.due - Fecha de vencimiento (ISO 8601)
 * @param {string} [cardData.listId] - ID de la lista (opcional, usa default)
 * @returns {Promise<Object>} Tarjeta creada
 */
export async function crearTarjeta({ name, desc, due, listId }) {
    try {
        const response = await trelloClient.post('/cards', {
            name,
            desc,
            due,
            idList: listId || config.trello.lists.pedidos,
            pos: 'top', // Nueva tarjeta arriba
        });

        console.log(`[TrelloService] Tarjeta creada: ${response.data.id} - ${name}`);
        return response.data;
    } catch (error) {
        handleTrelloError(error, 'crearTarjeta');
    }
}

/**
 * Adjunta una imagen a una tarjeta desde URL
 * @param {string} cardId - ID de la tarjeta
 * @param {string} imageUrl - URL de la imagen
 * @param {string} [name] - Nombre del archivo
 * @returns {Promise<Object>} Adjunto creado
 */
export async function adjuntarImagenDesdeUrl(cardId, imageUrl, name = 'referencia.jpg') {
    try {
        const response = await trelloClient.post(`/cards/${cardId}/attachments`, {
            url: imageUrl,
            name,
        });

        console.log(`[TrelloService] Imagen adjuntada a tarjeta ${cardId}`);
        return response.data;
    } catch (error) {
        // No lanzamos error fatal por fallo de imagen
        console.error(`[TrelloService] No se pudo adjuntar imagen: ${error.message}`);
        return null;
    }
}

/**
 * Adjunta una imagen a una tarjeta desde buffer
 * @param {string} cardId - ID de la tarjeta
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 * @returns {Promise<Object>} Adjunto creado
 */
export async function adjuntarImagenDesdeBuffer(cardId, imageBuffer, filename, mimeType) {
    try {
        const form = new FormData();
        form.append('file', imageBuffer, {
            filename,
            contentType: mimeType,
        });

        const response = await axios.post(
            `${TRELLO_BASE_URL}/cards/${cardId}/attachments`,
            form,
            {
                params: {
                    key: config.trello.apiKey,
                    token: config.trello.token,
                },
                headers: form.getHeaders(),
                timeout: 60000, // 60 segundos para uploads
            }
        );

        console.log(`[TrelloService] Imagen subida a tarjeta ${cardId}`);
        return response.data;
    } catch (error) {
        console.error(`[TrelloService] No se pudo subir imagen: ${error.message}`);
        return null;
    }
}

/**
 * Obtiene las tarjetas de una lista
 * @param {string} listId - ID de la lista
 * @returns {Promise<Array>} Lista de tarjetas
 */
export async function obtenerTarjetasDeLista(listId) {
    try {
        const response = await trelloClient.get(`/lists/${listId}/cards`, {
            params: {
                fields: 'id,name,desc,due,labels,dateLastActivity',
                attachments: 'true',
                attachment_fields: 'name,url',
            },
        });

        return response.data;
    } catch (error) {
        handleTrelloError(error, 'obtenerTarjetasDeLista');
    }
}

/**
 * Obtiene todas las tarjetas pendientes (lista de pedidos)
 * @returns {Promise<Array>} Tarjetas pendientes
 */
export async function obtenerPedidosPendientes() {
    return obtenerTarjetasDeLista(config.trello.lists.pedidos);
}

/**
 * Obtiene tarjetas en proceso
 * @returns {Promise<Array>} Tarjetas en proceso
 */
export async function obtenerPedidosEnProceso() {
    return obtenerTarjetasDeLista(config.trello.lists.enProceso);
}

/**
 * Mueve una tarjeta a otra lista
 * @param {string} cardId - ID de la tarjeta
 * @param {string} listId - ID de la lista destino
 * @returns {Promise<Object>} Tarjeta actualizada
 */
export async function moverTarjeta(cardId, listId) {
    try {
        const response = await trelloClient.put(`/cards/${cardId}`, {
            idList: listId,
        });

        console.log(`[TrelloService] Tarjeta ${cardId} movida a lista ${listId}`);
        return response.data;
    } catch (error) {
        handleTrelloError(error, 'moverTarjeta');
    }
}

/**
 * Mueve una tarjeta a "En Proceso"
 * @param {string} cardId - ID de la tarjeta
 * @returns {Promise<Object>} Tarjeta actualizada
 */
export async function moverAEnProceso(cardId) {
    return moverTarjeta(cardId, config.trello.lists.enProceso);
}

/**
 * Mueve una tarjeta a "Completados"
 * @param {string} cardId - ID de la tarjeta
 * @returns {Promise<Object>} Tarjeta actualizada
 */
export async function moverACompletados(cardId) {
    return moverTarjeta(cardId, config.trello.lists.completados);
}

/**
 * Obtiene información de una tarjeta específica
 * @param {string} cardId - ID de la tarjeta
 * @returns {Promise<Object>} Datos de la tarjeta
 */
export async function obtenerTarjeta(cardId) {
    try {
        const response = await trelloClient.get(`/cards/${cardId}`, {
            params: {
                fields: 'id,name,desc,due,labels,dateLastActivity,idList',
                attachments: 'true',
            },
        });

        return response.data;
    } catch (error) {
        handleTrelloError(error, 'obtenerTarjeta');
    }
}

/**
 * Obtiene las listas de un tablero
 * @param {string} [boardId] - ID del tablero (usa default si no se proporciona)
 * @returns {Promise<Array>} Lista de listas del tablero
 */
export async function obtenerListasDelTablero(boardId) {
    try {
        const response = await trelloClient.get(`/boards/${boardId || config.trello.boardId}/lists`, {
            params: {
                fields: 'id,name,pos',
            },
        });

        return response.data;
    } catch (error) {
        handleTrelloError(error, 'obtenerListasDelTablero');
    }
}

/**
 * Elimina una tarjeta de Trello (y todos sus adjuntos)
 * @param {string} cardId - ID de la tarjeta a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export async function eliminarTarjeta(cardId) {
    try {
        await trelloClient.delete(`/cards/${cardId}`);
        console.log(`[TrelloService] Tarjeta ${cardId} eliminada`);
        return true;
    } catch (error) {
        handleTrelloError(error, 'eliminarTarjeta');
    }
}

/**
 * Obtiene tarjetas completadas
 * @returns {Promise<Array>} Tarjetas completadas
 */
export async function obtenerPedidosCompletados() {
    return obtenerTarjetasDeLista(config.trello.lists.completados);
}

export default {
    crearTarjeta,
    adjuntarImagenDesdeUrl,
    adjuntarImagenDesdeBuffer,
    obtenerTarjetasDeLista,
    obtenerPedidosPendientes,
    obtenerPedidosEnProceso,
    obtenerPedidosCompletados,
    moverTarjeta,
    moverAEnProceso,
    moverACompletados,
    eliminarTarjeta,
    obtenerTarjeta,
    obtenerListasDelTablero,
};
