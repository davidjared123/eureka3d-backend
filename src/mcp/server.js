#!/usr/bin/env node
import trelloService from '../services/trelloService.js';
import { calcularCostoPieza, formatearCalculo } from '../utils/costCalculator.js';

/**
 * MCP Server para Eureka 3D
 * Proporciona herramientas (tools) para que la IA gestione pedidos
 */

// Definición de herramientas disponibles
const TOOLS = {
    consultar_pedidos_trello: {
        name: 'consultar_pedidos_trello',
        description: 'Lista todas las tarjetas/pedidos pendientes en Trello',
        inputSchema: {
            type: 'object',
            properties: {
                estado: {
                    type: 'string',
                    enum: ['pendientes', 'en_proceso', 'todos'],
                    description: 'Filtrar por estado del pedido',
                },
            },
        },
    },
    calcular_costo_pieza: {
        name: 'calcular_costo_pieza',
        description: 'Calcula el costo de una pieza basado en su peso en gramos',
        inputSchema: {
            type: 'object',
            properties: {
                gramos: { type: 'number', description: 'Peso en gramos' },
                margen: { type: 'number', description: 'Margen ganancia %' },
            },
            required: ['gramos'],
        },
    },
    mover_a_impresion: {
        name: 'mover_a_impresion',
        description: 'Mueve una tarjeta de Trello a la lista En Proceso',
        inputSchema: {
            type: 'object',
            properties: {
                cardId: { type: 'string', description: 'ID de la tarjeta' },
            },
            required: ['cardId'],
        },
    },
};

// Handlers
async function handleConsultarPedidos(args) {
    const estado = args.estado || 'pendientes';
    let pedidos = [];

    if (estado === 'pendientes' || estado === 'todos') {
        pedidos = [...pedidos, ...(await trelloService.obtenerPedidosPendientes())];
    }
    if (estado === 'en_proceso' || estado === 'todos') {
        pedidos = [...pedidos, ...(await trelloService.obtenerPedidosEnProceso())];
    }

    return pedidos.map(p => ({
        id: p.id,
        nombre: p.name,
        vencimiento: p.due,
        descripcion: p.desc?.substring(0, 200),
    }));
}

async function handleCalcularCosto(args) {
    const calculo = calcularCostoPieza(args.gramos, { margenGanancia: args.margen });
    return { ...calculo, resumen: formatearCalculo(calculo) };
}

async function handleMoverAImpresion(args) {
    const result = await trelloService.moverAEnProceso(args.cardId);
    return { success: true, cardId: result.id, nuevoEstado: 'en_proceso' };
}

// Main MCP loop
async function main() {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    for await (const line of rl) {
        try {
            const request = JSON.parse(line);
            let response;

            if (request.method === 'tools/list') {
                response = { tools: Object.values(TOOLS) };
            } else if (request.method === 'tools/call') {
                const { name, arguments: args } = request.params;
                const handlers = {
                    consultar_pedidos_trello: handleConsultarPedidos,
                    calcular_costo_pieza: handleCalcularCosto,
                    mover_a_impresion: handleMoverAImpresion,
                };
                const result = await handlers[name]?.(args) || { error: 'Tool not found' };
                response = { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            console.log(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: response }));
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

main().catch(console.error);
