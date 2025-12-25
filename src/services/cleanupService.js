import trelloService from './trelloService.js';

// Días después de la fecha de entrega para eliminar (default: 3)
const DIAS_PARA_LIMPIAR = parseInt(process.env.CLEANUP_DAYS_AFTER_DUE) || 3;

/**
 * Limpia pedidos completados que tienen más de X días pasados de su fecha de entrega
 * @returns {Promise<Object>} Resultado de la limpieza
 */
export async function limpiarPedidosVencidos() {
    console.log('[Cleanup] 🧹 Iniciando limpieza de pedidos vencidos...');

    try {
        // Obtener tarjetas completadas
        const tarjetas = await trelloService.obtenerPedidosCompletados();

        if (!tarjetas || tarjetas.length === 0) {
            console.log('[Cleanup] No hay tarjetas en la lista de completados');
            return { eliminadas: 0, total: 0 };
        }

        const ahora = new Date();
        const tarjetasAEliminar = [];

        for (const tarjeta of tarjetas) {
            if (!tarjeta.due) continue;

            const fechaEntrega = new Date(tarjeta.due);
            const diasPasados = Math.floor((ahora - fechaEntrega) / (1000 * 60 * 60 * 24));

            if (diasPasados >= DIAS_PARA_LIMPIAR) {
                tarjetasAEliminar.push({
                    id: tarjeta.id,
                    name: tarjeta.name,
                    due: tarjeta.due,
                    diasPasados,
                });
            }
        }

        console.log(`[Cleanup] Encontradas ${tarjetasAEliminar.length} tarjetas para eliminar de ${tarjetas.length} totales`);

        // Eliminar tarjetas
        let eliminadas = 0;
        for (const tarjeta of tarjetasAEliminar) {
            try {
                await trelloService.eliminarTarjeta(tarjeta.id);
                console.log(`[Cleanup] ✅ Eliminada: "${tarjeta.name}" (${tarjeta.diasPasados} días pasados)`);
                eliminadas++;
            } catch (error) {
                console.error(`[Cleanup] ❌ Error eliminando "${tarjeta.name}": ${error.message}`);
            }
        }

        console.log(`[Cleanup] 🧹 Limpieza completada: ${eliminadas}/${tarjetasAEliminar.length} eliminadas`);

        return {
            eliminadas,
            total: tarjetas.length,
            detalles: tarjetasAEliminar.map(t => t.name),
        };

    } catch (error) {
        console.error('[Cleanup] Error en limpieza:', error.message);
        throw error;
    }
}

/**
 * Inicia el intervalo de limpieza automática (cada 24 horas)
 */
export function iniciarLimpiezaAutomatica() {
    const INTERVALO_MS = 24 * 60 * 60 * 1000; // 24 horas

    console.log(`[Cleanup] ⏰ Limpieza automática configurada cada 24 horas`);
    console.log(`[Cleanup] 📅 Se eliminarán tarjetas con ${DIAS_PARA_LIMPIAR}+ días después de entrega`);

    // Ejecutar primera limpieza al iniciar (después de 1 minuto)
    setTimeout(async () => {
        console.log('[Cleanup] Ejecutando limpieza inicial...');
        await limpiarPedidosVencidos();
    }, 60 * 1000);

    // Configurar intervalo para limpiezas periódicas
    setInterval(async () => {
        console.log('[Cleanup] Ejecutando limpieza programada...');
        await limpiarPedidosVencidos();
    }, INTERVALO_MS);
}

export default {
    limpiarPedidosVencidos,
    iniciarLimpiezaAutomatica,
};
