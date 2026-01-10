import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * PUT /api/whatsapp/group/description
 * Actualiza la descripción del grupo de WhatsApp
 */
export async function PUT(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { description } = body;

        if (!description) {
            return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
        }

        // Obtener tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('evolution_instance_name, whatsapp_group_id')
            .eq('user_id', user.id)
            .single();

        if (!tenant?.evolution_instance_name || !tenant?.whatsapp_group_id) {
            return NextResponse.json({ error: 'WhatsApp no configurado' }, { status: 400 });
        }

        // Update group description
        const fullGroupId = tenant.whatsapp_group_id.includes('@g.us')
            ? tenant.whatsapp_group_id
            : `${tenant.whatsapp_group_id}@g.us`;

        const response = await fetch(
            `${EVOLUTION_API_URL}/group/updateGroupDescription/${tenant.evolution_instance_name}`,
            {
                method: 'PUT',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groupJid: fullGroupId,
                    description: description,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Description] Update failed:', errorText);
            throw new Error('Error al actualizar descripción');
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API WhatsApp Description]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
