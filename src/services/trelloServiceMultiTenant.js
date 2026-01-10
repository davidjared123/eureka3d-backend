import axios from 'axios';
import FormData from 'form-data';

const TRELLO_BASE_URL = 'https://api.trello.com/1';

/**
 * Servicio de Trello Multi-Tenant
 * Crea una instancia con credenciales específicas de un tenant
 */
export class TrelloServiceMultiTenant {
    constructor(tenant) {
        this.apiKey = tenant.trello_api_key;
        this.token = tenant.trello_token;
        this.boardId = tenant.trello_board_id;
        this.listPedidosId = tenant.trello_list_pedidos_id;
        this.listEnProcesoId = tenant.trello_list_en_proceso_id;
        this.listCompletadosId = tenant.trello_list_completados_id;

        // Multi-lista por día de la semana
        this.multilistEnabled = tenant.trello_multilist_enabled || false;
        this.dailyLists = {
            0: tenant.trello_list_sunday,    // Domingo
            1: tenant.trello_list_monday,    // Lunes
            2: tenant.trello_list_tuesday,   // Martes
            3: tenant.trello_list_wednesday, // Miércoles
            4: tenant.trello_list_thursday,  // Jueves
            5: tenant.trello_list_friday,    // Viernes
            6: tenant.trello_list_saturday,  // Sábado
        };

        this.client = axios.create({
            baseURL: TRELLO_BASE_URL,
            timeout: 30000,
            params: {
                key: this.apiKey,
                token: this.token,
            },
        });
    }

    /**
     * Obtiene el ID de la lista según la fecha de entrega
     * @param {Date|string} dueDate - Fecha de entrega
     * @returns {string} ID de la lista
     */
    getListIdForDate(dueDate) {
        if (!this.multilistEnabled) {
            return this.listPedidosId;
        }

        let date;
        if (dueDate instanceof Date) {
            date = dueDate;
        } else if (typeof dueDate === 'string') {
            date = new Date(dueDate);
        } else {
            return this.listPedidosId;
        }

        const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const listId = this.dailyLists[dayOfWeek];

        if (listId) {
            console.log(`[TrelloMT] Multi-lista: día ${dayOfWeek} -> lista ${listId}`);
            return listId;
        }

        // Fallback a la lista principal si no hay lista para ese día
        return this.listPedidosId;
    }

    /**
     * Crea una nueva tarjeta
     */
    async crearTarjeta({ name, desc, due, listId }) {
        try {
            const response = await this.client.post('/cards', {
                name,
                desc,
                due,
                idList: listId || this.listPedidosId,
                pos: 'top',
            });

            console.log(`[TrelloMT] Tarjeta creada: ${response.data.id} - ${name}`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'crearTarjeta');
        }
    }

    /**
     * Adjunta una imagen desde buffer
     */
    async adjuntarImagenDesdeBuffer(cardId, imageBuffer, filename, mimeType) {
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
                        key: this.apiKey,
                        token: this.token,
                    },
                    headers: form.getHeaders(),
                    timeout: 60000,
                }
            );

            console.log(`[TrelloMT] Imagen subida a tarjeta ${cardId}`);
            return response.data;
        } catch (error) {
            console.error(`[TrelloMT] No se pudo subir imagen: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtiene tarjetas de una lista
     */
    async obtenerTarjetasDeLista(listId) {
        try {
            const response = await this.client.get(`/lists/${listId}/cards`, {
                params: {
                    fields: 'id,name,desc,due,labels,dateLastActivity',
                    attachments: 'true',
                    attachment_fields: 'name,url',
                },
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'obtenerTarjetasDeLista');
        }
    }

    /**
     * Obtiene pedidos pendientes
     */
    async obtenerPedidosPendientes() {
        return this.obtenerTarjetasDeLista(this.listPedidosId);
    }

    /**
     * Mueve una tarjeta a otra lista
     */
    async moverTarjeta(cardId, listId) {
        try {
            const response = await this.client.put(`/cards/${cardId}`, {
                idList: listId,
            });
            console.log(`[TrelloMT] Tarjeta ${cardId} movida`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'moverTarjeta');
        }
    }

    /**
     * Elimina una tarjeta
     */
    async eliminarTarjeta(cardId) {
        try {
            await this.client.delete(`/cards/${cardId}`);
            console.log(`[TrelloMT] Tarjeta ${cardId} eliminada`);
            return true;
        } catch (error) {
            this._handleError(error, 'eliminarTarjeta');
        }
    }

    /**
     * Obtiene tarjetas completadas
     */
    async obtenerPedidosCompletados() {
        return this.obtenerTarjetasDeLista(this.listCompletadosId);
    }

    /**
     * Manejo de errores
     */
    _handleError(error, operation) {
        console.error(`[TrelloMT] Error en ${operation}:`, {
            status: error.response?.status,
            message: error.response?.data || error.message,
        });

        if (error.response?.status === 401) {
            throw new Error('Credenciales de Trello inválidas');
        }
        if (error.response?.status === 404) {
            throw new Error(`Recurso no encontrado: ${operation}`);
        }

        throw new Error(`Error en Trello (${operation}): ${error.message}`);
    }
}

export default TrelloServiceMultiTenant;
