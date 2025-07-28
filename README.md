# 🌱 API Gateway Mundo Verde - WebSocket Server

## Descripción

Este API Gateway actúa como servidor WebSocket que intercepta y transmite todas las operaciones (requests, responses, errores, y GraphQL queries) a clientes conectados. Permite monitorear en tiempo real todas las interacciones del sistema.

## 🚀 Características Principales

### ✅ Interceptación Completa
- **Requests HTTP**: Método, URL, headers, body, módulo origen, servicio destino
- **Responses HTTP**: Status code, headers, body, tiempo de respuesta, tamaño
- **GraphQL Queries**: Queries, variables, operaciones, respuestas
- **Errores**: Stack traces completos, contexto de error
- **Información de Conexión**: IP del cliente, User-Agent, módulos identificados

### 📡 WebSocket Server
- **Tiempo Real**: Transmisión instantánea de todas las operaciones
- **Multi-Cliente**: Soporte para múltiples clientes conectados simultáneamente
- **Bidireccional**: Comunicación cliente-servidor (ping/pong, comandos)
- **Reconexión Automática**: Cliente robusto con manejo de reconexión

### 🔍 Detección Inteligente de Módulos
- **Headers Personalizados**: `x-source-module`, `x-service-name`, `x-origin-service`
- **Análisis de Puertos**: Detección automática por puerto de conexión TCP
- **User-Agent**: Identificación por tecnología y herramientas
- **Headers de Proxy**: Análisis de `X-Forwarded-For`, `X-Real-IP`

## 🛠 Instalación y Ejecución

### Prerrequisitos
- Node.js 18+
- TypeScript
- npm/yarn

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📚 Rutas y Endpoints

### Información del Gateway
- **`GET /gateway/info`** - Información de todos los módulos registrados
- **`GET /gateway/health`** - Estado de salud del gateway
- **`GET /gateway/websocket/stats`** - Estadísticas del servidor WebSocket
- **`GET /gateway/websocket/client`** - Cliente WebSocket integrado
- **`GET /gateway/modules/detection`** - Guía de detección de módulos

### WebSocket
- **`ws://localhost:4000`** - Servidor WebSocket para interceptación

### GraphQL
- **`POST /graphql`** - Endpoint GraphQL unificado
- **`GET /graphql`** - GraphQL Playground (desarrollo)

### Proxies de Servicios
| Ruta | Servicio | Puerto | Tecnología | Protección |
|------|----------|--------|------------|------------|
| `/cultivo` | cultivo-manager | 8080 | Spring Boot | JWT |
| `/clima` | clima-service | 3000 | Node.js | JWT (excepto login) |
| `/plaga` | plaga-detection | 8000 | Laravel | JWT (excepto login/register) |
| `/sensor` | sensor-service | 6060 | FastAPI | JWT (excepto login) |
| `/export` | export-module | 5197 | .NET | JWT (excepto login) |
| `/ia` | ia-evaluacion | 3200 | FastAPI | Sin JWT |
| `/vision` | vision-detection | 5000 | Flask | Sin JWT |

## 📡 Uso del WebSocket

### Cliente Web Integrado
Visita `http://localhost:4000/gateway/websocket/client` para acceder al cliente WebSocket integrado con interfaz gráfica.

### Conexión Manual
```javascript
const ws = new WebSocket('ws://localhost:4000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Tipo:', message.type);
  console.log('ID:', message.id);
  
  switch(message.type) {
    case 'request':
      console.log('Request:', message.request);
      break;
    case 'response':
      console.log('Response:', message.response);
      break;
    case 'graphql':
      console.log('GraphQL:', message.data);
      break;
    case 'error':
      console.log('Error:', message.error);
      break;
    case 'connection':
      console.log('Connection:', message.data);
      break;
  }
};
```

### Formato de Mensajes WebSocket

#### Request
```json
{
  "type": "request",
  "id": "req_1_1645123456789",
  "request": {
    "timestamp": "2024-02-17T10:30:00.000Z",
    "method": "POST",
    "url": "/cultivo/api/usuarios",
    "headers": {...},
    "body": {...},
    "sourceModule": "clima-service",
    "targetService": "cultivo-manager",
    "clientIP": "127.0.0.1",
    "userAgent": "Node.js/18.0.0"
  }
}
```

#### Response
```json
{
  "type": "response",
  "id": "req_1_1645123456789",
  "response": {
    "timestamp": "2024-02-17T10:30:01.250Z",
    "statusCode": 200,
    "headers": {...},
    "body": {...},
    "responseTime": 1250,
    "size": 1024
  }
}
```

#### GraphQL
```json
{
  "type": "graphql",
  "id": "req_2_1645123456790",
  "data": {
    "query": "query { hello }",
    "variables": {...},
    "operationName": "GetHello",
    "timestamp": "2024-02-17T10:30:02.000Z"
  }
}
```

## 🔧 Configuración

### Variables de Entorno
```env
GATEWAY_PORT=4000          # Puerto del API Gateway
WEBSOCKET_PORT=4000        # Puerto del WebSocket (mismo que gateway)
JWT_SECRET=tu_jwt_secret   # Secreto para JWT
NODE_ENV=development       # Entorno de ejecución
```

### Detección de Módulos Origen

Para mejor identificación, configura tus servicios para incluir headers:

```bash
# Ejemplo con curl
curl -H "x-source-module: clima-service" \
     -H "x-source-port: 3000" \
     http://localhost:4000/cultivo/api/usuarios

# Ejemplo en código JavaScript
fetch('/cultivo/api/usuarios', {
  headers: {
    'x-source-module': 'mi-frontend',
    'x-source-port': '3001'
  }
});
```

## 📊 Monitoreo y Estadísticas

### Estadísticas en Tiempo Real
- **Clientes Conectados**: Número de clientes WebSocket activos
- **Total de Requests**: Contador de requests interceptados
- **Requests por Tipo**: Desglose por método HTTP
- **Errores**: Contador de errores interceptados
- **Queries GraphQL**: Contador de operaciones GraphQL

### Logs Detallados
El sistema genera logs estructurados con:
- Timestamp preciso
- Identificación de módulo origen y destino
- Información completa de conexión
- Tiempo de respuesta
- Tamaño de payload

## 🔒 Seguridad

### Autenticación JWT
La mayoría de endpoints requieren token JWT válido. Endpoints públicos:
- `/clima/api/auth/login`
- `/plaga/login` y `/plaga/register`
- `/sensor/auth/login`
- `/export/auth/login`
- `/ia/*` (IA evaluación)
- `/vision/*` (Vision detection)

### Headers de Seguridad
- CORS habilitado
- Límites de payload (10MB)
- Validación de headers

## 🐛 Debugging y Troubleshooting

### Logs de Conexión
Todos los requests incluyen información detallada del módulo origen:
```
╭─────────────────────────────────────────────────────────────╮
│ 🚀 PETICIÓN AL API GATEWAY                                  │
├─────────────────────────────────────────────────────────────┤
│ 📅 Timestamp: 2024-02-17T10:30:00.000Z                     │
│ 🌐 IP Cliente: 127.0.0.1      │ 🔌 Puerto remoto: 3000    │
│ 📡 Método: POST   │ 🛣️  Ruta: /cultivo/api/usuarios        │
├─────────────────────────────────────────────────────────────┤
│ 📤 MÓDULO ORIGEN:                                           │
│   🏷️  Módulo: clima-service                                 │
│   🔍 Evidencia: Puerto de conexión TCP 3000                │
├─────────────────────────────────────────────────────────────┤
│ 📥 MÓDULO DESTINO:                                          │
│   📦 Nombre: cultivo-manager                                │
│   📝 Descripción: Spring Boot - Gestión de Cultivos       │
│   🔌 Puerto: 8080                                          │
│   🎯 URL Base: http://localhost:8080                       │
╰─────────────────────────────────────────────────────────────╯
```

### Cliente WebSocket de Debug
Utiliza el cliente integrado en `http://localhost:4000/gateway/websocket/client` para:
- Ver todas las operaciones en tiempo real
- Enviar pings al servidor
- Hacer requests de prueba
- Limpiar logs
- Ver estadísticas

## 🤝 Contribución

Este API Gateway está diseñado para ser el punto central de comunicación del ecosistema Mundo Verde, interceptando y monitoreando todas las operaciones para proporcionar visibilidad completa del sistema.

## 📄 Licencia

Proyecto privado - Mundo Verde

---

**🌱 API Gateway Mundo Verde** - Monitoreo en tiempo real de toda la infraestructura del sistema.