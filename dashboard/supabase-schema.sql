-- ================================================
-- Eureka3D Dashboard - Schema de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Tabla de tenants (usuarios del dashboard)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  
  -- Configuración Trello
  trello_api_key TEXT,
  trello_token TEXT,
  trello_board_id TEXT,
  trello_list_pedidos_id TEXT,
  trello_list_en_proceso_id TEXT,
  trello_list_completados_id TEXT,
  
  -- Configuración WhatsApp/Evolution
  evolution_instance_name TEXT UNIQUE,
  whatsapp_group_id TEXT,
  whatsapp_group_name TEXT,
  whatsapp_connected BOOLEAN DEFAULT FALSE,
  whatsapp_number TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda por group_id (usado por el webhook)
CREATE INDEX IF NOT EXISTS idx_tenants_whatsapp_group 
ON tenants(whatsapp_group_id);

-- Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo pueden ver/editar su propio tenant
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tenant" ON tenants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tenant" ON tenants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tenant" ON tenants
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- Configuración adicional necesaria en Supabase:
-- 
-- 1. Authentication > Providers > Google
--    - Habilitar Google OAuth
--    - Agregar Client ID y Secret de Google Cloud
--
-- 2. Authentication > URL Configuration
--    - Agregar tu dominio a Site URL y Redirect URLs
--    - Ej: http://localhost:3000, https://tu-app.vercel.app
-- ================================================
