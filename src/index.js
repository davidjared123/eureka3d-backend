import express from 'express';
import config, { validateConfig } from './config/index.js';
import { handleEvolutionWebhook, webhookHealth } from './controllers/webhookController.js';
import trelloService from './services/trelloService.js';
import { calcularCostoPieza } from './utils/costCalculator.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({
        service: 'Eureka 3D Backend',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            webhook: 'POST /webhook/evolution',
            health: 'GET /health',
            pedidos: 'GET /api/pedidos',
            calcular: 'GET /api/calcular/:gramos',
        },
    });
});

app.get('/health', webhookHealth);
app.post('/webhook/evolution', handleEvolutionWebhook);

// API endpoints
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await trelloService.obtenerPedidosPendientes();
        res.json({ success: true, count: pedidos.length, pedidos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/calcular/:gramos', (req, res) => {
    try {
        const gramos = parseFloat(req.params.gramos);
        const calculo = calcularCostoPieza(gramos);
        res.json({ success: true, ...calculo });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/mover/:cardId/proceso', async (req, res) => {
    try {
        const result = await trelloService.moverAEnProceso(req.params.cardId);
        res.json({ success: true, card: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = config.port;
const validation = validateConfig();

if (!validation.isValid) {
    console.warn('⚠️ Variables faltantes:', validation.missing.join(', '));
}

app.listen(PORT, () => {
    console.log(`🚀 Eureka 3D Backend corriendo en puerto ${PORT}`);
});

export default app;
