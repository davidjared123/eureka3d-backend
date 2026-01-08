import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * GET /api/whatsapp/qr
 * Obtiene el código QR para conectar WhatsApp
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
            return NextResponse.json({ error: 'No hay instancia creada' }, { status: 400 });
        }

        // Conectar instancia (genera QR)
        const connectResponse = await fetch(
            `${EVOLUTION_API_URL}/instance/connect/${tenant.evolution_instance_name}`,
            {
                headers: { 'apikey': EVOLUTION_API_KEY },
            }
        );

        const connectData = await connectResponse.json();

        if (connectData.base64) {
            return NextResponse.json({
                success: true,
                qrcode: connectData.base64,
                pairingCode: connectData.pairingCode,
            });
        }

        // Si ya está conectado
        if (connectData.instance?.state === 'open') {
            return NextResponse.json({
                success: true,
                connected: true,
                message: 'Ya conectado',
            });
        }

        return NextResponse.json({
            success: false,
            message: connectData.message || 'No se pudo obtener QR',
        });

    } catch (error) {
        console.error('[API WhatsApp QR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
