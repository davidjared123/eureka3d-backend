import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración centralizada de la aplicación
 * Todas las variables de entorno se validan aquí
 */
export const config = {
  // Servidor
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Trello
  trello: {
    apiKey: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    boardId: process.env.TRELLO_BOARD_ID,
    lists: {
      pedidos: process.env.TRELLO_LIST_PEDIDOS_ID,
      enProceso: process.env.TRELLO_LIST_EN_PROCESO_ID,
      completados: process.env.TRELLO_LIST_COMPLETADOS_ID,
    },
  },

  // Evolution API
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
  },

  // Configuración de negocio
  negocio: {
    costoPorGramo: parseFloat(process.env.COSTO_POR_GRAMO) || 0.05,
    margenGanancia: parseFloat(process.env.MARGEN_GANANCIA) || 40,
  },
};

/**
 * Valida que las variables críticas estén configuradas
 * @returns {Object} { isValid: boolean, missing: string[] }
 */
export function validateConfig() {
  const required = [
    { key: 'TRELLO_API_KEY', value: config.trello.apiKey },
    { key: 'TRELLO_TOKEN', value: config.trello.token },
    { key: 'TRELLO_LIST_PEDIDOS_ID', value: config.trello.lists.pedidos },
  ];

  const missing = required
    .filter((item) => !item.value)
    .map((item) => item.key);

  return {
    isValid: missing.length === 0,
    missing,
  };
}

export default config;
