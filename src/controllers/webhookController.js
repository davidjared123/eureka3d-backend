import { extraerFecha, formatearFecha } from '../utils/dateParser.js';
import trelloService from '../services/trelloService.js';
import { TrelloServiceMultiTenant } from '../services/trelloServiceMultiTenant.js';
import evolutionService from '../services/evolutionService.js';
import whatsappService from '../services/whatsappService.js';
import pedidoSession from '../services/pedidoSession.js';
import supabaseService from '../services/supabaseService.js';
import config from '../config/index.js';

/**
 * Controlador conversacional para pedidos
 * Soporta modo single-tenant (env vars) y multi-tenant (Supabase)
 */

// ID del grupo permitido (solo para modo single-tenant)
const GRUPO_PERMITIDO = process.env.WHATSAPP_GROUP_ID || null;

// Cache de tenants para evitar consultas repetidas
const tenantCache = new Map();

// Cache de IDs de mensajes enviados por el bot (para evitar loops)
// Se limpian automáticamente después de 60 segundos
const sentMessagesCache = new Set();

/**
 * Registra un mensaje como enviado por el bot
 * @param {string} messageId 
 */
export function markMessageAsSent(messageId) {
    if (messageId) {
        sentMessagesCache.add(messageId);
        // Limpiar después de 60 segundos
        setTimeout(() => sentMessagesCache.delete(messageId), 60000);
    }
}

/**
 * Verifica si un mensaje fue enviado por el bot
 * @param {string} messageId 
 * @returns {boolean}
 */
export function isMessageFromBot(messageId) {
    return sentMessagesCache.has(messageId);
}

// Comandos para confirmar
const COMANDOS_CONFIRMAR = ['sí', 'si', 'yes', 'confirmar', 'dale', 'ok', 'listo', 's'];

// Comandos para negar/cancelar
const COMANDOS_NEGAR = ['no', 'cancelar', 'cancel', 'salir', 'n'];

// Comando para cambiar título
const COMANDOS_OTRO = ['otro', 'otra', 'cambiar', 'diferente'];

/**
 * Procesa un webhook de Evolution API con lógica conversacional
 */
export async function handleEvolutionWebhook(req, res) {
    const startTime = Date.now();

    try {
        const payload = req.body;

        console.log(`[Webhook] 📥 Event recibido: ${payload.event}`);

        // Solo procesamos mensajes recibidos
        if (payload.event !== 'messages.upsert') {
            return res.status(200).json({ processed: false, reason: 'No es mensaje' });
        }

        const message = payload.data;
        const instanceName = payload.instance;

        if (!message) {
            console.log('[Webhook] ⚠️ Sin datos en el mensaje');
            return res.status(200).json({ processed: false, reason: 'Sin datos' });
        }

        // Ignorar solo mensajes de status@broadcast
        if (message.key?.remoteJid?.includes('status@broadcast')) {
            console.log('[Webhook] ⏭️ Ignorando mensaje de status');
            return res.status(200).json({ processed: false, reason: 'Status broadcast' });
        }

        const remoteJid = message.key?.remoteJid || '';
        const nombreUsuario = message.pushName || 'Usuario';

        console.log(`[Webhook] 📩 Mensaje de: ${remoteJid} (${nombreUsuario})`);
        console.log(`[Webhook] 🔧 Multi-tenant: ${config.multiTenant}`);

        // ============================================
        // MULTI-TENANT: Buscar tenant por grupo
        // ============================================
        let tenant = null;
        let trelloServiceInstance = trelloService; // Default: servicio con env vars

        if (config.multiTenant) {
            // Modo multi-tenant: buscar configuración en Supabase
            tenant = tenantCache.get(remoteJid) || await supabaseService.getTenantByGroupId(remoteJid);

            if (tenant) {
                tenantCache.set(remoteJid, tenant);
                // Crear instancia de Trello con credenciales del tenant
                trelloServiceInstance = new TrelloServiceMultiTenant(tenant);
                console.log(`[Webhook] 👤 Tenant: ${tenant.business_name}`);
            } else {
                console.log(`[Webhook] ❌ No se encontró tenant para este grupo`);
                return res.status(200).json({ processed: false, reason: 'Tenant no encontrado' });
            }

            // Verificar si este mensaje fue enviado por el bot (para evitar loops)
            const messageId = message.key?.id;
            if (messageId && isMessageFromBot(messageId)) {
                console.log('[Webhook] ⏭️ Ignorando mensaje enviado por el bot');
                return res.status(200).json({ processed: false, reason: 'Mensaje del bot' });
            }

            // En multi-tenant, permitir mensajes del dueño (fromMe) en el grupo configurado
            // Esto permite que el dueño del negocio también pueda crear pedidos
            if (message.key?.fromMe) {
                console.log('[Webhook] 📝 Mensaje del dueño - procesando normalmente');
            }
        } else {
            // Modo single-tenant: usar env vars
            const esDelGrupoPermitido = GRUPO_PERMITIDO && remoteJid.includes(GRUPO_PERMITIDO);

            if (message.key?.fromMe && !esDelGrupoPermitido) {
                console.log('[Webhook] ⏭️ Ignorando mensaje propio fuera del grupo');
                return res.status(200).json({ processed: false, reason: 'Mensaje propio' });
            }

            if (GRUPO_PERMITIDO && !remoteJid.includes(GRUPO_PERMITIDO)) {
                console.log(`[Webhook] ❌ Mensaje ignorado - no es del grupo permitido`);
                return res.status(200).json({ processed: false, reason: 'No es del grupo' });
            }
        }

        // Extraer texto e info de imagen
        const texto = extraerTextoMensaje(message);
        const tieneImagen = message.message?.imageMessage != null;

        console.log(`[Webhook] 📝 Texto: "${texto.substring(0, 100)}"`);
        console.log(`[Webhook] 📷 Tiene imagen: ${tieneImagen}`);

        // Procesar el mensaje
        const respuesta = await procesarMensaje({
            chatId: remoteJid,
            texto,
            tieneImagen,
            message,
            instanceName,
            nombreUsuario,
            tenant,
            trelloServiceInstance,
        });

        console.log(`[Webhook] 💬 Respuesta a enviar: "${respuesta ? respuesta.substring(0, 50) + '...' : 'null'}"`);

        // Enviar respuesta si hay
        if (respuesta) {
            console.log(`[Webhook] 📤 Enviando respuesta a ${remoteJid}...`);
            await whatsappService.enviarMensaje(instanceName, remoteJid, respuesta);
            console.log(`[Webhook] ✅ Respuesta enviada`);
        } else {
            console.log('[Webhook] ⚠️ No hay respuesta que enviar');
        }

        const processingTime = Date.now() - startTime;
        return res.status(200).json({ processed: true, processingTime });

    } catch (error) {
        console.error('[Webhook] ❌ Error:', error.message);
        console.error('[Webhook] Stack:', error.stack);
        return res.status(200).json({ processed: false, error: error.message });
    }
}

/**
 * Lógica principal de procesamiento de mensajes
 */
async function procesarMensaje({ chatId, texto, tieneImagen, message, instanceName, nombreUsuario, tenant, trelloServiceInstance }) {
    const textoLower = texto.toLowerCase().trim();

    // ============================================
    // COMANDOS - Soportan # y ! como prefijo
    // ============================================

    // Comando #info / !info - Consultar pedidos
    if (textoLower.startsWith('#info') || textoLower.startsWith('!info')) {
        const consulta = texto.replace(/[#!]info/i, '').trim();
        return await procesarConsultaInfo(consulta, trelloServiceInstance);
    }

    // Comando #ayuda / !ayuda / #help / !help - Mostrar comandos disponibles
    if (textoLower.match(/^[#!](ayuda|help)$/)) {
        return `📋 *Comandos disponibles:*

🔍 *#info* o *!info*
   Ver todos los pedidos pendientes

🔍 *#info hoy* o *!info hoy*
   Ver pedidos para entregar hoy

🔍 *#info semana* o *!info semana*
   Ver pedidos de esta semana

✅ *sí* / *confirmar* / *ok*
   Confirmar el pedido actual

❌ *no* / *cancelar*
   Cancelar el pedido actual

✏️ *otro*
   Cambiar el título sugerido

📌 Solo envía un mensaje en el grupo para iniciar un nuevo pedido.`;
    }

    // Comando #cancelar / !cancelar - Cancelar sesión actual
    if (textoLower.match(/^[#!]cancelar$/)) {
        pedidoSession.finalizarSesion(chatId);
        return '❌ Sesión cancelada. Envía un nuevo mensaje para iniciar un pedido.';
    }

    // Verificar si hay sesión activa
    const sesionActiva = pedidoSession.obtenerSesion(chatId);

    // ============================================
    // CASO 1: No hay sesión - Iniciar nueva
    // ============================================
    if (!sesionActiva) {
        // Si no hay contenido, ignorar
        if (!texto && !tieneImagen) {
            return null;
        }

        // Crear sesión y guardar primer mensaje
        pedidoSession.iniciarSesion(chatId, nombreUsuario);
        // Guardar referencia al trelloService para usar después
        pedidoSession.actualizarSesion(chatId, { trelloServiceInstance });

        if (texto) {
            pedidoSession.agregarDescripcion(chatId, texto);
        }
        if (tieneImagen) {
            await guardarImagen(chatId, message, instanceName);
        }

        const sesion = pedidoSession.obtenerSesion(chatId);
        return pedidoSession.generarPreguntaInicio(sesion);
    }

    // ============================================
    // CASO 2: Hay sesión activa - Procesar según estado
    // ============================================
    return await procesarMensajeEnSesion(sesionActiva, {
        chatId, texto, textoLower, tieneImagen, message, instanceName, trelloServiceInstance
    });
}

/**
 * Procesa mensajes cuando hay una sesión activa
 */
async function procesarMensajeEnSesion(sesion, { chatId, texto, textoLower, tieneImagen, message, instanceName, trelloServiceInstance }) {
    const esConfirmar = COMANDOS_CONFIRMAR.some(cmd => textoLower === cmd);
    const esNegar = COMANDOS_NEGAR.some(cmd => textoLower === cmd);
    const esOtro = COMANDOS_OTRO.some(cmd => textoLower === cmd);

    // ============================================
    // Estado: ESPERANDO_INICIO - ¿Iniciar pedido?
    // ============================================
    if (sesion.estado === 'ESPERANDO_INICIO') {
        if (esConfirmar) {
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_MAS_INFO' });
            return '✅ *Pedido iniciado*\n\n¿Deseas añadir algo más? (sí/no)';
        }
        if (esNegar) {
            pedidoSession.cancelarSesion(chatId);
            return '👍 Ok, mensaje ignorado.';
        }
        // Si envía más contenido, agregarlo y volver a preguntar
        if (texto) pedidoSession.agregarDescripcion(chatId, texto);
        if (tieneImagen) await guardarImagen(chatId, message, instanceName);
        const sesionActualizada = pedidoSession.obtenerSesion(chatId);
        return pedidoSession.generarPreguntaInicio(sesionActualizada);
    }

    // ============================================
    // Estado: ESPERANDO_MAS_INFO - ¿Agregar más?
    // ============================================
    if (sesion.estado === 'ESPERANDO_MAS_INFO') {
        if (esConfirmar) {
            pedidoSession.actualizarSesion(chatId, { estado: 'AGREGANDO_INFO' });
            return '📝 Perfecto, envía más detalles o imágenes.';
        }
        if (esNegar) {
            // No quiere agregar más - preguntar por título
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_TITULO' });
            const sesionActualizada = pedidoSession.obtenerSesion(chatId);
            return pedidoSession.generarPreguntaTitulo(sesionActualizada);
        }
        // Asumir que está agregando contenido
        if (texto) pedidoSession.agregarDescripcion(chatId, texto);
        if (tieneImagen) await guardarImagen(chatId, message, instanceName);
        const sesionActualizada = pedidoSession.obtenerSesion(chatId);
        return pedidoSession.generarPreguntaMasInfo(sesionActualizada);
    }

    // ============================================
    // Estado: AGREGANDO_INFO - Recibiendo contenido
    // ============================================
    if (sesion.estado === 'AGREGANDO_INFO') {
        // Guardar contenido
        if (texto) pedidoSession.agregarDescripcion(chatId, texto);
        if (tieneImagen) await guardarImagen(chatId, message, instanceName);

        // Preguntar si quiere agregar más
        pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_MAS_INFO' });
        const sesionActualizada = pedidoSession.obtenerSesion(chatId);
        return pedidoSession.generarPreguntaMasInfo(sesionActualizada);
    }

    // ============================================
    // Estado: ESPERANDO_TITULO - ¿Título actual u otro?
    // ============================================
    if (sesion.estado === 'ESPERANDO_TITULO') {
        if (esConfirmar) {
            // Usar título actual y preguntar fecha
            const tituloActual = sesion.titulo || sesion.descripcion[0]?.substring(0, 50) || 'Nuevo pedido';
            pedidoSession.establecerTitulo(chatId, tituloActual);
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_FECHA' });
            return '📅 *¿Para cuándo es la entrega?*\n\nEjemplos: *mañana*, *viernes*, *30 de diciembre*';
        }
        if (esOtro) {
            pedidoSession.actualizarSesion(chatId, { estado: 'ESCRIBIENDO_TITULO' });
            return '✏️ Escribe el título que quieres para este pedido:';
        }
        // No entendió
        return '❓ Responde *sí* para usar el título actual, o *otro* para cambiarlo.';
    }

    // ============================================
    // Estado: ESCRIBIENDO_TITULO - Usuario escribe nuevo título
    // ============================================
    if (sesion.estado === 'ESCRIBIENDO_TITULO') {
        if (texto) {
            pedidoSession.establecerTitulo(chatId, texto.substring(0, 100));
            pedidoSession.actualizarSesion(chatId, { estado: 'ESPERANDO_FECHA' });
            return `✅ Título: *"${texto.substring(0, 100)}"*\n\n📅 *¿Para cuándo es la entrega?*\n\nEjemplos: *mañana*, *viernes*, *30 de diciembre*`;
        }
        return '✏️ Escribe el título del pedido:';
    }

    // ============================================
    // Estado: ESPERANDO_FECHA - Usuario da fecha de entrega
    // ============================================
    if (sesion.estado === 'ESPERANDO_FECHA') {
        const fecha = extraerFecha(texto);
        if (fecha) {
            pedidoSession.establecerFecha(chatId, fecha, texto);
            // Crear tarjeta directamente
            return await crearTarjetaDesdeSesion(chatId, trelloServiceInstance);
        } else {
            return '❓ No entendí la fecha. Intenta con:\n• *hoy*, *mañana*\n• *viernes*, *lunes*\n• *25 de diciembre*';
        }
    }

    // Estado no manejado
    return null;
}

/**
 * Procesa consultas #info
 */
async function procesarConsultaInfo(consulta, trelloSvc = trelloService) {
    try {
        const consultaLower = consulta.toLowerCase();
        let tarjetas = [];
        let titulo = '';

        if (consultaLower.includes('hoy')) {
            tarjetas = await trelloSvc.obtenerPedidosPendientes();
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            tarjetas = tarjetas.filter(t => {
                if (!t.due) return false;
                const due = new Date(t.due);
                return due >= hoy && due < manana;
            });
            titulo = '📋 *Pedidos para HOY*';
        } else if (consultaLower.includes('semana')) {
            tarjetas = await trelloSvc.obtenerPedidosPendientes();
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const finSemana = new Date(hoy);
            finSemana.setDate(finSemana.getDate() + 7);

            tarjetas = tarjetas.filter(t => {
                if (!t.due) return false;
                const due = new Date(t.due);
                return due >= hoy && due < finSemana;
            });
            titulo = '📋 *Pedidos para esta SEMANA*';
        } else {
            // Todos los pendientes
            tarjetas = await trelloSvc.obtenerPedidosPendientes();
            titulo = '📋 *Todos los pedidos pendientes*';
        }

        if (tarjetas.length === 0) {
            return `${titulo}\n\n✨ No hay pedidos pendientes.`;
        }

        const lista = tarjetas.map((t, i) => {
            const fecha = t.due ? formatearFecha(new Date(t.due)) : 'Sin fecha';
            return `${i + 1}. *${t.name}*\n   📅 ${fecha}`;
        }).join('\n\n');

        return `${titulo}\n\n${lista}\n\n_Total: ${tarjetas.length} pedido(s)_`;

    } catch (error) {
        console.error('[Webhook] Error en consulta:', error.message);
        return `❌ Error consultando pedidos: ${error.message}`;
    }
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
async function crearTarjetaDesdeSesion(chatId, trelloSvc = trelloService) {
    const sesion = pedidoSession.finalizarSesion(chatId);

    // Usar el servicio guardado en la sesión si existe
    const servicioTrello = sesion?.trelloServiceInstance || trelloSvc;

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
        const tarjeta = await servicioTrello.crearTarjeta({
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
                    await servicioTrello.adjuntarImagenDesdeBuffer(
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

        return `✅ *Pedido subido a Trello*\n\n` +
            `📋 *Título:* ${sesion.titulo}\n` +
            `📅 *Entrega:* ${fechaTexto}\n` +
            `📷 *Imágenes:* ${sesion.imagenes.length}`;

    } catch (error) {
        console.error('[Webhook] Error creando tarjeta:', error.message);
        return `❌ Error creando el pedido: ${error.message}`;
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
