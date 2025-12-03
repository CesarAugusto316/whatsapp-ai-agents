# Chatbots Platform

Plataforma unificada para chatbots con múltiples servicios independientes.

## 🏗️ Estructura del Proyecto

```
chatbots-platform/
├── chat-agent/        # App de chat con IA (Cloudflare Workers)
├── cms/              # Panel de administración (Next.js + TypeScript)
├── cms-api/          # API REST para el CMS (Bun + Payload CMS)
└── whatsapp-api/     # API para integración con WhatsApp (pendiente)
```

## 📁 Descripción de Proyectos

### **🤖 Chat Agent** (`/chat-agent`)
Aplicación de chat con inteligencia artificial desplegada en Cloudflare Workers.
- **Tecnología**: TypeScript, Cloudflare Workers, IA integrations
- **Puerto desarrollo**: 8787 (configurable en wrangler.jsonc)

### **🛠️ CMS Admin Panel** (`/cms`)
Panel de administración construido con Next.js para gestionar contenido y configuración.
- **Tecnología**: Next.js 15, TypeScript, Tailwind CSS, Playwright tests
- **Puerto desarrollo**: 3000

### **🔧 CMS API** (`/cms-api`)
API REST construida con Payload CMS para gestión de contenido.
- **Tecnología**: Bun, Payload CMS, SQLite/PostgreSQL
- **Puerto desarrollo**: 3001

### **📱 WhatsApp API** (`/whatsapp-api`)
API para integración con WhatsApp Business (pendiente de desarrollo).
- **Tecnología**: Por definir
- **Estado**: En configuración

## 🚀 Desarrollo Local

### **Requisitos Previos**
- Node.js 18+ (recomendado 20+)
- Bun 1.0+ (para cms-api)
- pnpm 8+ (para cms)
- Docker (opcional, para despliegue local)
- Git

### **Instalación y Ejecución**

#### **1. Chat Agent**
```bash
cd chat-agent
yarn install          # Instalar dependencias
yarn dev              # Iniciar servidor de desarrollo
# Accede en: http://localhost:8787
```

#### **2. CMS Admin Panel**
```bash
cd cms
pnpm install          # Instalar dependencias
pnpm dev              # Iniciar servidor de desarrollo
# Accede en: http://localhost:3000
```

#### **3. CMS API**
```bash
cd cms-api
bun install           # Instalar dependencias
bun dev               # Iniciar servidor de desarrollo
# Accede en: http://localhost:3001
```

#### **4. WhatsApp API** (cuando esté disponible)
```bash
cd whatsapp-api
# Instrucciones pendientes
```

### **Ejecutar Todos los Servicios**
```bash
# Terminal 1
cd chat-agent && yarn dev

# Terminal 2  
cd cms && pnpm dev

# Terminal 3
cd cms-api && bun dev
```

## 📦 Despliegue

Cada servicio tiene su propio pipeline de CI/CD independiente:

### **Chat Agent** → Cloudflare Workers
- **Workflow**: `.github/workflows/deploy-chat-agent.yml`
- **Trigger**: Cambios en `/chat-agent/**`
- **Variables necesarias**:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

### **CMS** → Vercel / Dokploy
- **Workflow**: `.github/workflows/deploy-cms.yml`
- **Trigger**: Cambios en `/cms/**`
- **Variables necesarias**:
  - `VERCEL_TOKEN` (si usas Vercel)
  - `NEXT_PUBLIC_API_URL`

### **CMS API** → Docker en Dokploy
- **Workflow**: `.github/workflows/deploy-cms-api.yml`
- **Trigger**: Cambios en `/cms-api/**`

### **WhatsApp API** → Por configurar
- **Workflow**: Pendiente
- **Trigger**: Cambios en `/whatsapp-api/**`

## 🔧 Configuración

### **Variables de Entorno**

Cada proyecto tiene su archivo `.env.example`. Copia y configura:

```bash
# Chat Agent
cp chat-agent/.env.example chat-agent/.env

# CMS
cp cms/.env.example cms/.env

# CMS API  
cp cms-api/.env.example cms-api/.env
```

### **Base de Datos**

**CMS API** usa SQLite por defecto (`local.db`). Para producción:
1. Cambiar a PostgreSQL en la configuración de Payload
2. Configurar variables de conexión en `.env`

### **Docker (Opcional)**

Cada proyecto puede tener su `Dockerfile`. Para construir:

```bash
# CMS API
cd cms-api
docker build -t cms-api:latest .

# CMS
cd cms
docker build -t cms-admin:latest .
```

## 🧪 Testing

### **Chat Agent**
```bash
cd chat-agent
yarn test            # Ejecutar tests
```

### **CMS**
```bash
cd cms
pnpm test:unit       # Tests unitarios
pnpm test:e2e        # Tests end-to-end (Playwright)
```

### **CMS API**
```bash
cd cms-api
bun test             # Ejecutar tests
```

## 📁 Estructura de Archivos Importantes

```
.github/workflows/           # Pipelines CI/CD por proyecto
│   ├── deploy-chat-agent.yml
│   ├── deploy-cms.yml
│   └── deploy-cms-api.yml
│
chat-agent/                  # Aplicación Chat IA
│   ├── src/                # Código fuente
│   ├── wrangler.jsonc      # Config Cloudflare
│   └── package.json
│
cms/                        # Panel Admin Next.js
│   ├── src/
│   ├── docker-compose.yml  # Docker local
│   └── package.json
│
cms-api/                    # API Payload CMS
│   ├── src/
│   ├── payload.config.ts   # Config Payload
│   └── package.json
│
whatsapp-api/               # API WhatsApp (futuro)
```

## 🤝 Contribución

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/chatbots-platform.git
   cd chatbots-platform
   ```

2. **Crear una rama**
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

3. **Trabajar en el proyecto específico**
   ```bash
   cd cms  # o el proyecto que corresponda
   # Realizar cambios
   ```

4. **Commit y Push**
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   git push origin feature/nueva-funcionalidad
   ```

5. **Crear Pull Request** en GitHub

## 🚨 Solución de Problemas

### **Problemas comunes:**

1. **"Module not found" al mover archivos**
   ```bash
   cd proyecto-afectado
   rm -rf node_modules
   yarn install  # o pnpm install / bun install
   ```

2. **Puertos en conflicto**
   - Chat Agent: 8787
   - CMS: 3000  
   - CMS API: 3001
   - Ajusta en los archivos de configuración si es necesario

3. **Variables de entorno faltantes**
   - Revisa `.env.example` en cada proyecto
   - Copia a `.env` y completa los valores

### **Recursos útiles:**
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Payload CMS Docs](https://payloadcms.com/docs)
- [Bun Documentation](https://bun.sh/docs)

## 📄 Licencia

[Incluir información de licencia aquí]

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/chatbots-platform/issues)
- **Documentación**: Revisa la carpeta `/docs` de cada proyecto

---

**Nota**: Este es un repositorio unificado que contiene proyectos independientes. Cada uno tiene su propio ciclo de desarrollo, dependencias y despliegue.
