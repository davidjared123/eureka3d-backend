import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

/**
 * Cliente de Supabase para el backend (lazy initialization)
 * Se usa para leer configuraciones de tenants
 * Solo se crea si MULTI_TENANT=true
 */
let supabase = null;

function getSupabaseClient() {
    if (!supabase && config.supabase.url && config.supabase.serviceKey) {
        supabase = createClient(
            config.supabase.url,
            config.supabase.serviceKey
        );
    }
    return supabase;
}

/**
 * Busca un tenant por su whatsapp_group_id
 * @param {string} groupId - ID del grupo de WhatsApp (remoteJid)
 * @returns {Promise<Object|null>} Tenant o null si no existe
 */
export async function getTenantByGroupId(groupId) {
    const client = getSupabaseClient();

    if (!client) {
        console.log('[Supabase] Cliente no disponible (MULTI_TENANT deshabilitado)');
        return null;
    }

    try {
        // El groupId viene como "120363421458604106@g.us" o similar
        // Extraemos solo el número
        const numericId = groupId.replace('@g.us', '').replace('@s.whatsapp.net', '');

        console.log(`[Supabase] Buscando tenant para grupo: ${numericId}`);

        const { data, error } = await client
            .from('tenants')
            .select('*')
            .or(`whatsapp_group_id.eq.${numericId},whatsapp_group_id.eq.${groupId}`)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No se encontró tenant
                console.log(`[Supabase] No se encontró tenant para grupo: ${numericId}`);
                return null;
            }
            throw error;
        }

        console.log(`[Supabase] Tenant encontrado: ${data.business_name}`);
        return data;
    } catch (error) {
        console.error(`[Supabase] Error buscando tenant: ${error.message}`);
        return null;
    }
}

/**
 * Actualiza el estado de conexión de WhatsApp de un tenant
 * @param {string} tenantId - ID del tenant
 * @param {boolean} connected - Estado de conexión
 */
export async function updateWhatsAppStatus(tenantId, connected) {
    const client = getSupabaseClient();

    if (!client) return;

    try {
        const { error } = await client
            .from('tenants')
            .update({ whatsapp_connected: connected })
            .eq('id', tenantId);

        if (error) throw error;
        console.log(`[Supabase] WhatsApp status actualizado para tenant ${tenantId}: ${connected}`);
    } catch (error) {
        console.error(`[Supabase] Error actualizando status: ${error.message}`);
    }
}

export default {
    getTenantByGroupId,
    updateWhatsAppStatus,
    getClient: getSupabaseClient,
};
