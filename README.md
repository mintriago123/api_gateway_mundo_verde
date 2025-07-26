# API Gateway - Mundo Verde

Un API Gateway moderno y escalable construido con Node.js, TypeScript y Express, con **Service Discovery** integrado para descubrimiento automático de servicios.

## 🚀 Características Principales

- **Arquitectura Modular**: Estructura organizada y mantenible
- **Service Discovery**: Descubrimiento automático de servicios con balanceador de carga 🎯
- **Health Checks**: Monitoreo automático de servicios
- **Logging Avanzado**: Sistema de logs con colores y timestamps
- **CORS Configurable**: Soporte completo para CORS
- **Graceful Shutdown**: Cierre elegante de la aplicación
- **Proxy Inteligente**: Proxy HTTP con manejo de errores robusto
- **Configuración Centralizada**: Variables de entorno organizadas
- **TypeScript**: Tipado fuerte para mejor desarrollo
- **Load Balancing**: Balanceador de carga con múltiples estrategias
- **Dynamic Routing**: Enrutamiento dinámico basado en service discovery

## 📁 Estructura del Proyecto

```
src/
├── config/           # Configuración centralizada
├── middleware/       # Middlewares personalizados
├── routes/          # Definición de rutas REST
├── services/        # Servicios de la aplicación
├── types/           # Tipos de TypeScript
├── utils/           # Utilidades generales
└── server.ts        # Punto de entrada
```

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/mintriago123/api_gateway_mundo_verde.git
cd api_gateway_mundo_verde
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
# Edita .env con tus configuraciones
```

4. Compila y ejecuta:
```bash
npm run build
npm start
```

Para desarrollo:
```bash
npm run serve
```

## 🔗 Endpoints Principales

- **Health Check**: `http://localhost:8080/api-gateway/health` - Estado del gateway y servicios
- **Service Discovery**: `http://localhost:8080/api-gateway/services` - Listar servicios registrados
- **Metrics**: `http://localhost:8080/api-gateway/metrics` - Métricas del gateway
- **Discovery Stats**: `http://localhost:8080/api-gateway/discovery/stats` - Estadísticas de service discovery

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `8080` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `CORS_ENABLED` | Habilitar CORS | `true` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `AUTH_SERVICE_URL` | URL del servicio de autenticación | `http://localhost:5000` |
| `ADMISSIONS_SERVICE_URL` | URL del servicio de admisiones | `http://localhost:5001` |
| `HEALTH_CHECK_ENABLED` | Habilitar health checks | `true` |
| `HEALTH_CHECK_INTERVAL` | Intervalo de health checks (ms) | `30000` |
| `SERVICE_DISCOVERY_ENABLED` | Habilitar service discovery | `true` |

### Servicios Configurados

El API Gateway está configurado para los siguientes servicios:

- **Authentication Service** (`/auth/*` → `http://localhost:5000`)
- **Admissions Service** (`/admissions/*` → `http://localhost:5001`)

## 📋 Endpoints REST de Monitoreo

- `GET /api-gateway/health` - Estado de salud general
- `GET /api-gateway/info` - Información detallada del sistema
- `GET /api-gateway/metrics` - Métricas del sistema
- `GET /api-gateway/services` - Estado del service discovery
- `GET /api-gateway/ready` - Readiness probe
- `GET /api-gateway/live` - Liveness probe

## 🔄 Service Discovery

El API Gateway utiliza service discovery para:

- **Registro automático de servicios**: Los servicios se registran automáticamente
- **Balanceador de carga**: Distribución automática de tráfico entre instancias
- **Health checks**: Monitoreo continuo de la salud de los servicios
- **Enrutamiento dinámico**: Las rutas se crean automáticamente basadas en servicios descubiertos

### Endpoints de Service Discovery

```
GET /api-gateway/services - Listar servicios registrados
POST /api-gateway/services - Registrar un nuevo servicio
DELETE /api-gateway/services/:id - Desregistrar un servicio
GET /api-gateway/discovery/stats - Estadísticas de service discovery
```

## 📊 Logging

El sistema incluye un logger avanzado con:

- Timestamps automáticos
- Colores para diferentes niveles
- Metadatos estructurados
- Información de requests y responses

## 🏥 Health Checks

El API Gateway monitorea automáticamente la salud de todos los servicios configurados:

- Verificación periódica cada 30 segundos (configurable)
- Endpoint `/health` en cada servicio
- Estado disponible en `/api-gateway/health`

## 🚦 Manejo de Errores

- Manejo centralizado de errores
- Respuestas estructuradas
- Logging automático de errores
- Graceful shutdown en señales del sistema

## 🔒 Seguridad

- Headers de seguridad automáticos
- CORS configurable
- Validación de variables de entorno
- Límites de tamaño de payload

## 📦 Scripts Disponibles

- `npm run build` - Compila TypeScript
- `npm start` - Ejecuta la aplicación compilada
- `npm run serve` - Desarrollo con recarga automática
- `npm test` - Ejecuta tests (pendiente implementación)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia ISC. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas, por favor abre un [issue](https://github.com/mintriago123/api_gateway_mundo_verde/issues) en GitHub.
