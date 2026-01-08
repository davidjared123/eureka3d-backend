# Eureka3D Dashboard

Panel de control para gestionar pedidos de WhatsApp a Trello.

## 🚀 Setup Rápido

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`
3. Ve a **Settings > API** y copia:
   - `Project URL`
   - `anon public` key

### 2. Configurar variables de entorno

Copia `env.example` a `.env.local` y completa:

```bash
cp env.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_URL=https://eureka3d-backend.onrender.com
```

### 3. Configurar Google OAuth (opcional)

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea credenciales OAuth 2.0
3. En Supabase > Authentication > Providers > Google
4. Agrega Client ID y Secret

### 4. Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📁 Estructura

```
dashboard/
├── app/
│   ├── page.js                 # Landing page
│   ├── login/                  # Página de login
│   ├── registro/               # Página de registro
│   ├── auth/callback/          # OAuth callback
│   └── dashboard/              # Panel principal
│       ├── page.js             # Dashboard home
│       └── conexion/           # Config Trello + WhatsApp
├── lib/
│   └── supabase/               # Clientes de Supabase
└── middleware.js               # Protección de rutas
```

## 🚀 Deploy en Vercel

1. Push el código a GitHub
2. Importa en Vercel
3. Agrega las variables de entorno
4. Deploy!
