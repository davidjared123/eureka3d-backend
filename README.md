# 🖨️ Eureka 3D Backend

Backend para automatización de pedidos de impresión 3D. Recibe pedidos desde WhatsApp (via Evolution API) y los convierte en tarjetas de Trello.

## 🚀 Características

- **Webhook de WhatsApp**: Detecta mensajes con `#pedido` y crea tarjetas automáticamente
- **Parsing de fechas**: Soporte para español venezolano ("para el viernes", "30 de diciembre")
- **Adjuntos**: Descarga y adjunta imágenes de referencia a las tarjetas
- **Calculadora de costos**: Calcula precios basados en peso del filamento
- **MCP Tools**: Herramientas para que una IA gestione los pedidos

## 📦 Instalación

```bash
npm install
cp .env.example .env
# Edita .env con tus credenciales
npm run dev
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `TRELLO_API_KEY` | Tu API Key de Trello |
| `TRELLO_TOKEN` | Token de acceso a Trello |
| `TRELLO_LIST_PEDIDOS_ID` | ID de la lista para nuevos pedidos |
| `TRELLO_LIST_EN_PROCESO_ID` | ID de la lista "En Proceso" |
| `COSTO_POR_GRAMO` | Costo del filamento por gramo |
| `MARGEN_GANANCIA` | Porcentaje de ganancia |

### Obtener ID de Lista de Trello

1. Abre tu tablero en el navegador
2. Añade `.json` al final de la URL (ej: `trello.com/b/ABC123/mi-tablero.json`)
3. Busca (Ctrl+F) el nombre de tu lista
4. Copia el `"id"` que aparece junto al nombre

## 📡 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info del servicio |
| GET | `/health` | Health check |
| POST | `/webhook/evolution` | Webhook de Evolution API |
| GET | `/api/pedidos` | Listar pedidos pendientes |
| GET | `/api/calcular/:gramos` | Calcular costo |
| POST | `/api/mover/:cardId/proceso` | Mover a "En Proceso" |

## 💬 Formato de Pedido en WhatsApp

```
#pedido Soporte para celular
Necesito un soporte de escritorio para iPhone
Material: PLA negro
Para el viernes

[Imagen adjunta]
```

## 🐳 Deploy en Koyeb

```bash
# El Dockerfile está optimizado para instancias Nano (512MB)
docker build -t eureka3d .
```

## 🤖 MCP Tools

El servidor MCP proporciona estas herramientas:

- `consultar_pedidos_trello`: Lista pedidos pendientes
- `calcular_costo_pieza`: Calcula costos por peso
- `mover_a_impresion`: Mueve tarjetas a "En Proceso"

## 📄 Licencia

MIT
