# Service Discovery API Gateway

## 🎯 Descripción

Este API Gateway está diseñado específicamente para funcionar con **Service Discovery**, eliminando la necesidad de configuración manual de servicios y rutas. Los servicios se registran automáticamente y el enrutamiento es dinámico.

## 🚀 Características Principales

- **Service Discovery**: Descubrimiento automático de servicios
- **Load Balancing**: Balanceador de carga integrado (Round Robin, Weighted)
- **Health Checks**: Monitoreo automático de servicios
- **Dynamic Routing**: Enrutamiento dinámico basado en servicios descubiertos
- **Auto-registration**: Los servicios configurados se registran automáticamente

## 🔧 Configuración

### Variables de Entorno

```env
PORT=8080
NODE_ENV=development
SERVICE_DISCOVERY_ENABLED=true
SERVICE_DISCOVERY_REGISTRY=memory
SERVICE_DISCOVERY_LB_STRATEGY=round-robin
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## 📡 Endpoints de Service Discovery

### Gestión de Servicios
- `GET /api-gateway/services` - Listar servicios registrados
- `POST /api-gateway/services` - Registrar nuevo servicio
- `DELETE /api-gateway/services/:id` - Desregistrar servicio
- `GET /api-gateway/services/:name` - Obtener instancias de un servicio

### Estadísticas y Monitoreo
- `GET /api-gateway/discovery/stats` - Estadísticas detalladas
- `GET /api-gateway/health` - Estado general del gateway

## 🔄 Enrutamiento Dinámico

El gateway enruta automáticamente las requests basándose en los servicios registrados:

```
GET /user-service/api/users → http://service-host:port/api/users
POST /payment-service/transactions → http://service-host:port/transactions
```

**Patrón**: `/{service-name}/...` → se redirige al servicio correspondiente

## 📝 Registro Manual de Servicios

Ejemplo de registro de un servicio:

```bash
curl -X POST http://localhost:8080/api-gateway/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "host": "localhost",
    "port": 3001,
    "protocol": "http",
    "version": "1.0.0",
    "metadata": {
      "description": "User management service"
    }
  }'
```

## ⚡ Inicio Rápido

1. **Instalar dependencias:**
```bash
npm install
```

2. **Compilar:**
```bash
npm run build
```

3. **Ejecutar:**
```bash
npm start
```

4. **Para desarrollo:**
```bash
npm run serve
```

## 🏥 Health Checks

El gateway realiza health checks automáticos a todos los servicios registrados llamando a `/health` en cada servicio cada 30 segundos (configurable).

## 🔒 Seguridad

- Headers de seguridad por defecto
- CORS configurable
- Rate limiting (configurable)
- Validación de entrada

## 📊 Monitoreo

- Logs estructurados con timestamps
- Métricas de rendimiento
- Estados de salud de servicios
- Estadísticas de balanceador de carga

El API Gateway está listo para usar con cualquier arquitectura de microservicios que implemente service discovery!
