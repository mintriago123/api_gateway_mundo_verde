# API Gateway - Mundo Verde

Un API Gateway moderno y escalable construido con Node.js, TypeScript y Express, con integración completa al módulo de clima de MundoVerde.

## 🚀 Características

- **Arquitectura Modular**: Estructura organizada y mantenible
- **Service Discovery**: Descubrimiento automático de servicios con balanceador de carga
- **Health Checks**: Monitoreo automático de servicios
- **Logging Avanzado**: Sistema de logs con colores y timestamps
- **CORS Configurable**: Soporte completo para CORS
- **Graceful Shutdown**: Cierre elegante de la aplicación
- **Proxy Inteligente**: Proxy HTTP con manejo de errores robusto
- **Configuración Centralizada**: Variables de entorno organizadas
- **TypeScript**: Tipado fuerte para mejor desarrollo
- **Integración Clima**: Conectado al módulo de clima de MundoVerde ✨

## 📁 Estructura del Proyecto

```
src/
├── config/           # Configuración centralizada
├── middleware/       # Middlewares personalizados
├── routes/          # Definición de rutas
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
| `CLIMA_SERVICE_URL` | URL del servicio de clima | `http://localhost:3000` |
| `HEALTH_CHECK_ENABLED` | Habilitar health checks | `true` |
| `HEALTH_CHECK_INTERVAL` | Intervalo de health checks (ms) | `30000` |
| `SERVICE_DISCOVERY_ENABLED` | Habilitar service discovery | `true` |

### Servicios Configurados

El API Gateway está configurado para los siguientes servicios:

- **Authentication Service** (`/auth/*` → `http://localhost:5000`)
- **Admissions Service** (`/admissions/*` → `http://localhost:5001`)
- **Clima Service** (`/clima/*` → `http://localhost:3000`) ✨

## 📋 Endpoints de Monitoreo

- `GET /api-gateway/health` - Estado de salud general
- `GET /api-gateway/info` - Información detallada del sistema
- `GET /api-gateway/metrics` - Métricas del sistema
- `GET /api-gateway/services` - Estado del service discovery
- `GET /api-gateway/ready` - Readiness probe
- `GET /api-gateway/live` - Liveness probe

## 🌡️ Integración con Módulo de Clima

### Endpoints Disponibles

Todas las rutas del módulo de clima están disponibles a través del prefijo `/clima`:

#### Autenticación
- `POST /clima/api/auth/login` - Login de usuario
- `POST /clima/api/auth/register` - Registro de usuario

#### Consultas de Clima (Requieren JWT)
- `GET /clima/api/consulta-clima?ciudad=NombreCiudad` - Obtener clima por ciudad

#### Fuentes Climáticas (Requieren JWT)
- `GET /clima/api/fuentes` - Listar fuentes climáticas
- `POST /clima/api/fuentes` - Crear fuente climática
- `PUT /clima/api/fuentes/:id` - Actualizar fuente climática
- `DELETE /clima/api/fuentes/:id` - Eliminar fuente climática

#### Logs del Sistema (Requieren JWT)
- `GET /clima/api/logs` - Obtener logs del sistema

#### Documentación
- `GET /clima/api-docs` - Documentación Swagger del módulo de clima

### Inicio Rápido con Clima

1. **Iniciar el módulo de clima:**
```bash
cd "c:\Users\micha\Desktop\Aws\MundoVerde\Clima-MundoVerde"
npm run dev
```

2. **Iniciar el API Gateway:**
```bash
cd "c:\Users\micha\Desktop\Aws\Api_Gateway"
# Usando el script de PowerShell
.\start-with-clima.ps1

# O manualmente
npm run serve
```

3. **Probar la integración:**
```bash
# Login para obtener JWT
curl -X POST http://localhost:8080/clima/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "tu_usuario", "password": "tu_password"}'

# Consultar clima (con JWT token)
curl -X GET "http://localhost:8080/clima/api/consulta-clima?ciudad=Medellín" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

Para más detalles, consulta [CLIMA_INTEGRATION.md](./CLIMA_INTEGRATION.md).

## 🔄 Proxy de Servicios

Todas las rutas de servicios son proxy automáticamente:

```
GET /auth/users → http://localhost:5000/users
POST /admissions/applications → http://localhost:5001/applications
GET /clima/api/consulta-clima → http://localhost:3000/api/consulta-clima
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
