import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * POST /api/whatsapp/group
 * Crea un grupo de WhatsApp y guarda el ID en el tenant
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { groupName } = body;

        if (!groupName) {
            return NextResponse.json({ error: 'Nombre del grupo requerido' }, { status: 400 });
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tenant?.evolution_instance_name) {
            return NextResponse.json({ error: 'WhatsApp no conectado' }, { status: 400 });
        }

        // Primero, obtener el número conectado
        const profileResponse = await fetch(
            `${EVOLUTION_API_URL}/chat/fetchProfile/${tenant.evolution_instance_name}`,
            {
                method: 'POST',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    number: '', // El propio número
                }),
            }
        );

        // Crear el grupo
        const createGroupResponse = await fetch(
            `${EVOLUTION_API_URL}/group/create/${tenant.evolution_instance_name}`,
            {
                method: 'POST',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject: groupName,
                    description: `Grupo de pedidos - ${tenant.business_name}`,
                    participants: [], // Solo el creador inicialmente
                }),
            }
        );

        const groupData = await createGroupResponse.json();

        if (!createGroupResponse.ok) {
            throw new Error(groupData.message || 'Error creando grupo');
        }

        // Extraer el ID del grupo (viene como "1234567890@g.us")
        const groupId = groupData.groupJid || groupData.id;
        const numericGroupId = groupId?.replace('@g.us', '') || null;

        if (!numericGroupId) {
            throw new Error('No se pudo obtener el ID del grupo');
        }

        // Guardar en tenant
        await supabase
            .from('tenants')
            .update({
                whatsapp_group_id: numericGroupId,
                whatsapp_group_name: groupName,
                whatsapp_connected: true,
            })
            .eq('id', tenant.id);

        return NextResponse.json({
            success: true,
            groupName,
            groupId: numericGroupId,
            fullGroupId: groupId,
        });

    } catch (error) {
        console.error('[API WhatsApp Group]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/whatsapp/group
 * Lista los grupos disponibles para seleccionar uno existente
 */
export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data: tenant } = await supabase
            .from('tenants')
            .select('evolution_instance_name')
            .eq('user_id', user.id)
            .single();

        if (!tenant?.evolution_instance_name) {
            return NextResponse.json({ error: 'WhatsApp no conectado' }, { status: 400 });
        }

        // Obtener grupos
        const response = await fetch(
            `${EVOLUTION_API_URL}/group/fetchAllGroups/${tenant.evolution_instance_name}?getParticipants=false`,
            {
                headers: { 'apikey': EVOLUTION_API_KEY },
            }
        );

        const groups = await response.json();

        // Formatear grupos
        const formattedGroups = (groups || []).map(g => ({
            id: g.id?.replace('@g.us', ''),
            fullId: g.id,
            name: g.subject || g.name || 'Sin nombre',
        }));

        return NextResponse.json({
            success: true,
            groups: formattedGroups,
        });

    } catch (error) {
        console.error('[API WhatsApp Groups]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/whatsapp/group
 * Selecciona un grupo existente
 */
export async function PUT(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { groupId, groupName } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'ID del grupo requerido' }, { status: 400 });
        }

        // Obtener tenant para el instance name
        const { data: tenant } = await supabase
            .from('tenants')
            .select('evolution_instance_name, business_name')
            .eq('user_id', user.id)
            .single();

        // Actualizar descripción del grupo con comandos del bot
        if (tenant?.evolution_instance_name) {
            const botDescription = `🤖 *Bot de Pedidos - ${tenant.business_name || 'Eureka3D'}*

📋 *COMANDOS DISPONIBLES:*

🔍 #info → Ver pedidos pendientes
🔍 #info hoy → Pedidos para hoy
🔍 #info semana → Pedidos de la semana
❓ #ayuda → Ver esta lista
❌ #cancelar → Cancelar pedido actual

📝 *CÓMO CREAR UN PEDIDO:*
1️⃣ Envía un mensaje describiendo el pedido
2️⃣ El bot te sugerirá un título
3️⃣ Confirma con "sí" o escribe "otro" para cambiarlo
4️⃣ Indica la fecha de entrega
5️⃣ ¡Listo! Se crea en Trello

💡 También puedes enviar imágenes de referencia`;

            try {
                const fullGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;

                await fetch(`${EVOLUTION_API_URL}/group/updateGroupDescription/${tenant.evolution_instance_name}`, {
                    method: 'PUT',
                    headers: {
                        'apikey': EVOLUTION_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        groupJid: fullGroupId,
                        description: botDescription,
                    }),
                });
                console.log('[API WhatsApp] Group description updated');
            } catch (descError) {
                console.error('[API WhatsApp] Failed to update group description:', descError);
                // No lanzar error, continuar con el flujo
            }
        }

        // Guardar en tenant
        const { error } = await supabase
            .from('tenants')
            .update({
                whatsapp_group_id: groupId.replace('@g.us', ''),
                whatsapp_group_name: groupName || 'Grupo de pedidos',
                whatsapp_connected: true,
            })
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            groupId: groupId.replace('@g.us', ''),
        });

    } catch (error) {
        console.error('[API WhatsApp Select Group]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
