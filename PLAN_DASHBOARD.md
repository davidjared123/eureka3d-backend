# 🚀 Eureka3D Dashboard - Plan de Implementación

**Fecha:** 8 de Enero 2026  
**Objetivo:** Convertir el bot de WhatsApp en un SaaS multi-tenant con dashboard visual

---

## 📋 Resumen Ejecutivo

Crear un dashboard web donde múltiples usuarios (tu hermano, clientes) puedan:
- Registrarse con Google o email
- Configurar sus API Keys de Trello
- Escanear QR para conectar WhatsApp
- Crear su grupo y empezar a usar el bot
- **Todo sin tocar código**

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Next.js)                          │
│  • Login/Registro (Supabase Auth)                           │
│  • Dashboard de configuración                               │
│  • Escaneo de QR WhatsApp                                   │
│  • Panel de pedidos                                         │
│  Deploy: Vercel (gratis)                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Express - actual)                  │
│  • Webhook multi-tenant                                     │
│  • API para gestión de tenants                              │
│  • Conexión a Evolution API                                 │
│  Deploy: Render (actual)                                    │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│  SUPABASE              │  │  EVOLUTION API                 │
│  • PostgreSQL (datos)  │  │  • Instancias WhatsApp         │
│  • Auth (usuarios)     │  │  • QR codes                    │
│  • Gratis hasta 500MB  │  │  • Webhooks                    │
└────────────────────────┘  └────────────────────────────────┘
```

---

## 📱 Pantallas del Dashboard

### 1. Login/Registro
- Botón "Continuar con Google"
- O email + contraseña
- Powered by Supabase Auth

### 2. Onboarding (primera vez)
```
┌─────────────────────────────────────┐
│  Paso 1: Configurar Trello          │
│  ─────────────────────────────────  │
│  API Key: [________________]        │
│  Token:   [________________]        │
│  Board ID:[________________]        │
│                                     │
│  📖 ¿Cómo obtener estas keys?       │
│                      [Continuar →]  │
└─────────────────────────────────────┘
```

### 3. Conectar WhatsApp
```
┌─────────────────────────────────────┐
│  Paso 2: Conectar WhatsApp          │
│  ─────────────────────────────────  │
│                                     │
│       ┌─────────────────┐           │
│       │  [QR CODE]      │           │
│       │                 │           │
│       └─────────────────┘           │
│                                     │
│  Escanea con WhatsApp               │
│                                     │
│  Nombre del grupo: [Pedidos 3D___]  │
│                      [Crear grupo]  │
└─────────────────────────────────────┘
```

### 4. Dashboard Principal
```
┌─────────────────────────────────────┐
│  🏠 Eureka3D      [⚙️] [👤 Usuario] │
├─────────────────────────────────────┤
│                                     │
│  📊 Resumen                         │
│  ├── Pedidos hoy: 3                 │
│  ├── Esta semana: 12                │
│  └── WhatsApp: ✅ Conectado         │
│                                     │
│  📋 Últimos Pedidos                 │
│  ┌─────────────────────────────────┐│
│  │ Soporte iPhone    📅 Mañana     ││
│  │ Llavero custom    📅 Viernes    ││
│  │ Base laptop       📅 10 Ene     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 🗄️ Base de Datos (Supabase)

### Tabla: tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  business_name TEXT NOT NULL,
  
  -- Configuración Trello
  trello_api_key TEXT,
  trello_token TEXT,
  trello_board_id TEXT,
  trello_list_pedidos_id TEXT,
  trello_list_completados_id TEXT,
  
  -- Configuración WhatsApp
  evolution_instance_name TEXT UNIQUE,
  whatsapp_group_id TEXT,
  whatsapp_group_name TEXT,
  whatsapp_connected BOOLEAN DEFAULT FALSE,
  whatsapp_number TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: cada usuario solo ve sus datos
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant" ON tenants
  FOR ALL USING (auth.uid() = user_id);
```

---

## 🔄 Flujo del Webhook (Multi-tenant)

```javascript
// ANTES (single tenant)
const GRUPO_PERMITIDO = process.env.WHATSAPP_GROUP_ID;

// DESPUÉS (multi-tenant)
async function handleWebhook(req, res) {
  const groupId = message.key.remoteJid;
  
  // Buscar qué tenant tiene este grupo
  const tenant = await supabase
    .from('tenants')
    .select('*')
    .eq('whatsapp_group_id', groupId)
    .single();
  
  if (!tenant) {
    return res.json({ processed: false, reason: 'Grupo no registrado' });
  }
  
  // Usar las credenciales del tenant para Trello
  const trelloService = new TrelloService({
    apiKey: tenant.trello_api_key,
    token: tenant.trello_token,
    listId: tenant.trello_list_pedidos_id
  });
  
  // ... resto de la lógica igual
}
```

---

## 📅 Fases de Implementación

### FASE 1: MVP (3-5 días) ⭐ Empezar aquí
- [ ] Crear proyecto Next.js para dashboard
- [ ] Setup Supabase (DB + Auth)
- [ ] Pantalla de login con Google
- [ ] Formulario de configuración Trello
- [ ] Integración QR de Evolution API
- [ ] Modificar backend para multi-tenant
- [ ] Deploy en Vercel

### FASE 2: Mejoras (1 semana)
- [ ] Panel de pedidos en tiempo real
- [ ] Estadísticas básicas
- [ ] Mejorar UI/UX
- [ ] Documentación para usuarios

### FASE 3: Escalabilidad (futuro)
- [ ] Múltiples instancias Evolution
- [ ] Planes/suscripciones
- [ ] Más integraciones (Notion, Airtable)

---

## ❓ Preguntas Pendientes

Antes de empezar mañana, confirma:

1. **¿Usamos Supabase?** (recomendado, ya lo conoces)
   - [ ] Sí, usar Supabase
   - [ ] No, prefiero otra opción

2. **¿Cuántos usuarios iniciales?**
   - [ ] 2-3 (tu hermano + 1)
   - [ ] 5-10
   - [ ] Más de 10

3. **¿Tu Evolution API está en Render?**
   - [ ] Sí, self-hosted en Render
   - [ ] No, uso otro servicio

4. **¿Dominio para el dashboard?**
   - [ ] Usar subdominio gratis de Vercel (ejemplo.vercel.app)
   - [ ] Tengo dominio propio

---

## 🛠️ Stack Final

| Componente | Tecnología | Costo |
|------------|------------|-------|
| Frontend | Next.js 14 | Gratis (Vercel) |
| Backend | Express (actual) | Gratis (Render) |
| Base de Datos | Supabase PostgreSQL | Gratis (500MB) |
| Auth | Supabase Auth | Gratis |
| WhatsApp | Evolution API | Tu instancia actual |

**Costo total estimado: $0/mes** (con tiers gratuitos)

---

## ✅ Siguiente Paso

Mañana cuando estés listo, respóndeme las preguntas de arriba y comenzamos con la Fase 1.

¡El MVP puede estar listo en 3-5 días! 🚀
