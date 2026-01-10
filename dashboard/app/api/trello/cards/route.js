import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/trello/cards
 * Obtiene las tarjetas de Trello del usuario
 */
export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('trello_api_key, trello_token, trello_board_id, trello_list_pedidos_id, trello_multilist_enabled, trello_list_monday, trello_list_tuesday, trello_list_wednesday, trello_list_thursday, trello_list_friday, trello_list_saturday, trello_list_sunday')
            .eq('user_id', user.id)
            .single();

        if (!tenant?.trello_api_key || !tenant?.trello_token) {
            return NextResponse.json({ error: 'Trello no configurado' }, { status: 400 });
        }

        const { trello_api_key: apiKey, trello_token: token } = tenant;

        // Obtener todas las listas a consultar
        const listIds = new Set();

        if (tenant.trello_list_pedidos_id) {
            listIds.add(tenant.trello_list_pedidos_id);
        }

        if (tenant.trello_multilist_enabled) {
            const dailyLists = [
                tenant.trello_list_monday,
                tenant.trello_list_tuesday,
                tenant.trello_list_wednesday,
                tenant.trello_list_thursday,
                tenant.trello_list_friday,
                tenant.trello_list_saturday,
                tenant.trello_list_sunday,
            ].filter(Boolean);
            dailyLists.forEach(id => listIds.add(id));
        }

        // Obtener tarjetas de todas las listas
        const allCards = [];

        for (const listId of listIds) {
            try {
                const res = await fetch(
                    `https://api.trello.com/1/lists/${listId}/cards?key=${apiKey}&token=${token}&fields=id,name,desc,due,dateLastActivity,labels`,
                    { cache: 'no-store' }
                );

                if (res.ok) {
                    const cards = await res.json();
                    // Agregar el listId a cada tarjeta
                    cards.forEach(card => {
                        card.listId = listId;
                        allCards.push(card);
                    });
                }
            } catch (err) {
                console.error(`Error fetching list ${listId}:`, err);
            }
        }

        // Obtener nombres de las listas
        let lists = [];
        try {
            const listsRes = await fetch(
                `https://api.trello.com/1/boards/${tenant.trello_board_id}/lists?key=${apiKey}&token=${token}&fields=id,name`,
                { cache: 'no-store' }
            );
            if (listsRes.ok) {
                lists = await listsRes.json();
            }
        } catch (err) {
            console.error('Error fetching lists:', err);
        }

        // Ordenar por fecha de entrega
        allCards.sort((a, b) => {
            if (!a.due) return 1;
            if (!b.due) return -1;
            return new Date(a.due) - new Date(b.due);
        });

        return NextResponse.json({
            success: true,
            cards: allCards,
            lists: lists,
            multilistEnabled: tenant.trello_multilist_enabled,
        });

    } catch (error) {
        console.error('[API Trello Cards]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
