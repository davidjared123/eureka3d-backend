# 📱 Eureka3D Bot - Guía de Configuración para Usuarios

## ¿Qué es Eureka3D Bot?

Eureka3D Bot es un asistente que convierte automáticamente los mensajes de WhatsApp en tarjetas de Trello. Perfecto para gestionar pedidos de tu negocio sin esfuerzo.

---

## 📋 Requisitos Previos

Antes de comenzar, necesitas tener:

1. ✅ **Un teléfono con WhatsApp** (el número que usará el bot)
2. ✅ **Una cuenta de Trello** (gratis en trello.com)
3. ✅ **Un tablero de Trello** creado con una lista llamada "Pedidos"
4. ✅ **Acceso a un navegador web** (puede ser desde el teléfono o computadora)

---

## 🚀 PASO 1: Crear tu Cuenta

1. Abre tu navegador y ve a:
   
   👉 **https://eureka3d-backend.vercel.app**

2. Haz click en **"Comenzar Gratis"** o **"Crear Cuenta"**

3. Completa el formulario:
   - **Nombre de tu negocio**: Ej. "Impresiones 3D Pedro"
   - **Correo electrónico**: tu@email.com
   - **Contraseña**: mínimo 6 caracteres

4. Haz click en **"Crear Cuenta"**

5. Revisa tu correo y **confirma tu email** haciendo click en el enlace

6. Inicia sesión con tu correo y contraseña

---

## 🔧 PASO 2: Configurar Trello

### 2.1 Obtener las credenciales de Trello

1. Abre una nueva pestaña y ve a:
   
   👉 **https://trello.com/app-key**

2. Inicia sesión en Trello si te lo pide

3. Verás tu **API Key** - cópiala y guárdala

4. Debajo del API Key, haz click en el enlace que dice **"Token"**

5. Autoriza la aplicación y copia el **Token** que aparece

### 2.2 Obtener el ID del tablero

1. Abre tu tablero de Trello en el navegador

2. Mira la URL, se ve algo así:
   ```
   https://trello.com/b/ABC123/mi-tablero
   ```

3. Añade `.json` al final de la URL:
   ```
   https://trello.com/b/ABC123/mi-tablero.json
   ```

4. Presiona Enter - verás un texto largo

5. Busca al inicio: `"id":"XXXXXX"` - ese es tu **Board ID**

### 2.3 Obtener el ID de la lista "Pedidos"

1. En el mismo JSON, busca: `"lists":`

2. Encontrarás algo como:
   ```
   {"id":"YYYYYY","name":"Pedidos",...}
   ```

3. El `"id"` de la lista "Pedidos" es tu **List ID**

### 2.4 Ingresar en el Dashboard

1. Vuelve al dashboard de Eureka3D

2. Ve a **Configuración → Conexión** o haz click en "Configurar"

3. Completa los campos:
   - **API Key**: (la que copiaste en 2.1)
   - **Token**: (el que copiaste en 2.1)
   - **Board ID**: (el que copiaste en 2.2)
   - **List ID**: (el que copiaste en 2.3)

4. Haz click en **"Guardar y Continuar"**

---

## 📱 PASO 3: Conectar WhatsApp

1. En el dashboard, haz click en **"Conectar WhatsApp"**

2. Aparecerá un **código QR** en la pantalla

3. En tu teléfono:
   - Abre **WhatsApp**
   - Toca el menú (**⋮** o **⚙️**)
   - Selecciona **"Dispositivos vinculados"**
   - Toca **"Vincular un dispositivo"**
   - **Escanea el código QR** de la pantalla

4. Espera unos segundos... aparecerá **"✅ WhatsApp Conectado"**

---

## 👥 PASO 4: Configurar el Grupo de Pedidos

Después de conectar WhatsApp, tienes dos opciones:

### Opción A: Crear un nuevo grupo (recomendado)

1. Escribe el nombre del grupo, ej: **"Pedidos 3D"**

2. Haz click en **"+ Crear Grupo"**

3. ¡Listo! El grupo se crea automáticamente en tu WhatsApp

### Opción B: Usar un grupo existente

1. Verás una lista de todos tus grupos de WhatsApp

2. Haz click en el grupo que quieres usar

3. ¡Listo! El bot escuchará mensajes de ese grupo

---

## ✅ PASO 5: ¡Probar el Bot!

1. Abre WhatsApp en tu teléfono

2. Ve al grupo que configuraste

3. Envía un mensaje de prueba:
   ```
   Hola, quiero un soporte para celular
   ```

4. El bot responderá preguntando si quieres crear un pedido

5. Sigue las instrucciones del bot para completar el pedido

6. ¡Verifica que la tarjeta apareció en Trello! 🎉

---

## 📖 Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `#info` | Ver todos los pedidos pendientes |
| `#info hoy` | Ver pedidos para hoy |
| `#info semana` | Ver pedidos de esta semana |
| `sí` / `si` | Confirmar una acción |
| `no` / `cancelar` | Cancelar el pedido actual |

---

## ❓ Preguntas Frecuentes

### ¿Puedo usar mi número personal?
Sí, pero recomendamos usar un número dedicado al negocio.

### ¿Qué pasa si cierro WhatsApp en mi teléfono?
El bot sigue funcionando. Solo necesitas tener el teléfono conectado a internet.

### ¿Cuántos pedidos puedo recibir?
¡Ilimitados! El bot procesa todos los mensajes del grupo.

### ¿Puedo tener varios grupos?
Por ahora, un grupo por cuenta. Contacta soporte para más.

### ¿Puedo adjuntar fotos a los pedidos?
¡Sí! Envía fotos en el grupo y se adjuntan automáticamente a la tarjeta de Trello.

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas, contacta a soporte:

- 📧 Email: [TU_EMAIL_DE_SOPORTE]
- 💬 WhatsApp: [TU_NUMERO_DE_SOPORTE]

---

## 📝 Notas Importantes

1. **Mantén tu teléfono conectado a internet** - El bot requiere que WhatsApp esté activo

2. **No desvinques el dispositivo** - Si lo haces, tendrás que escanear el QR de nuevo

3. **Los mensajes privados no se procesan** - Solo mensajes del grupo configurado

---

© 2026 Eureka3D - Automatización de Pedidos por WhatsApp
