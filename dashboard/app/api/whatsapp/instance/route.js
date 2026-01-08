import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * POST /api/whatsapp/instance
 * Crea una nueva instancia de WhatsApp en Evolution API
 */
export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener tenant del usuario
        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
        }

        // Crear nombre de instancia único basado en el tenant ID
        const instanceName = `tenant_${tenant.id.substring(0, 8)}`;

        // Verificar si ya existe la instancia
        const checkResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': EVOLUTION_API_KEY,
            },
        });

        const instances = await checkResponse.json();
        const existingInstance = instances?.find?.(i => i.instance?.instanceName === instanceName);

        if (existingInstance) {
            // Retornar info de la instancia existente
            return NextResponse.json({
                success: true,
                instanceName,
                exists: true,
                status: existingInstance.instance?.status || 'unknown',
            });
        }

        // Crear nueva instancia
        const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            }),
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
            throw new Error(createData.message || 'Error creando instancia');
        }

        // Guardar nombre de instancia en tenant
        await supabase
            .from('tenants')
            .update({ evolution_instance_name: instanceName })
            .eq('id', tenant.id);

        return NextResponse.json({
            success: true,
            instanceName,
            exists: false,
            qrcode: createData.qrcode,
        });

    } catch (error) {
        console.error('[API WhatsApp Instance]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/whatsapp/instance
 * Obtiene el estado de la instancia
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
            return NextResponse.json({
                connected: false,
                status: 'no_instance'
            });
        }

        // Obtener estado de la instancia
        const response = await fetch(
            `${EVOLUTION_API_URL}/instance/connectionState/${tenant.evolution_instance_name}`,
            {
                headers: { 'apikey': EVOLUTION_API_KEY },
            }
        );

        const data = await response.json();

        return NextResponse.json({
            connected: data.instance?.state === 'open',
            status: data.instance?.state || 'unknown',
            instanceName: tenant.evolution_instance_name,
        });

    } catch (error) {
        console.error('[API WhatsApp Status]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
