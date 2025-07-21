# Integración API Gateway - Módulo de Clima

## 🌡️ Configuración Completada

El API Gateway ya está configurado para conectarse con el módulo de clima de MundoVerde. La integración incluye:

### ⚙️ Servicios Configurados

1. **Authentication Service** - Puerto 5000
   - Ruta: `/auth/*`
   - Target: `http://localhost:5000`

2. **Admissions Service** - Puerto 5001
   - Ruta: `/admissions/*`
   - Target: `http://localhost:5001`

3. **Clima Service** - Puerto 3000 ✨ **NUEVO**
   - Ruta: `/clima/*`
   - Target: `http://localhost:3000`

### 🚀 Cómo Usar

#### 1. Iniciar el Módulo de Clima
```bash
cd "c:\Users\micha\Desktop\Aws\MundoVerde\Clima-MundoVerde"
npm run dev
```

#### 2. Iniciar el API Gateway
```bash
cd "c:\Users\micha\Desktop\Aws\Api_Gateway"
npm run serve
```

### 📡 Endpoints Disponibles a través del API Gateway

El API Gateway estará corriendo en el puerto **8080** y todas las rutas del módulo de clima serán accesibles a través del prefijo `/clima`:

#### Rutas de Autenticación (Clima)
- `POST http://localhost:8080/clima/api/auth/login`
- `POST http://localhost:8080/clima/api/auth/register`

#### Rutas de Consulta de Clima (Protegidas con JWT)
- `GET http://localhost:8080/clima/api/consulta-clima?ciudad=TuCiudad`

#### Rutas de Fuentes Climáticas (Protegidas con JWT)
- `GET http://localhost:8080/clima/api/fuentes`
- `POST http://localhost:8080/clima/api/fuentes`
- `PUT http://localhost:8080/clima/api/fuentes/:id`
- `DELETE http://localhost:8080/clima/api/fuentes/:id`

#### Rutas de Logs del Sistema (Protegidas con JWT)
- `GET http://localhost:8080/clima/api/logs`

#### Documentación Swagger
- `GET http://localhost:8080/clima/api-docs`

### 🔐 Autenticación

Para acceder a las rutas protegidas, necesitas:

1. **Obtener un token JWT:**
```bash
curl -X POST http://localhost:8080/clima/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tu_usuario",
    "password": "tu_password"
  }'
```

2. **Usar el token en las peticiones:**
```bash
curl -X GET "http://localhost:8080/clima/api/consulta-clima?ciudad=Medellín" \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

### 🔄 Service Discovery

El API Gateway tiene habilitado el Service Discovery con las siguientes características:

- **Estrategia de Load Balancing:** Round Robin
- **Health Check Interval:** 30 segundos
- **Registry Type:** Memory (en desarrollo)
- **Heartbeat Timeout:** 60 segundos

### 🌐 WebSocket Support

El módulo de clima también incluye soporte para WebSocket para datos en tiempo real:

- **WebSocket URL:** `ws://localhost:3000`
- **A través del API Gateway:** Se puede configurar proxy WebSocket si es necesario

### 📊 Monitoreo

Endpoints de monitoreo del API Gateway:

- **Health Check:** `GET http://localhost:8080/api-gateway/health`
- **Service Info:** `GET http://localhost:8080/api-gateway/info`
- **Metrics:** `GET http://localhost:8080/api-gateway/metrics`
- **Service Discovery Status:** `GET http://localhost:8080/api-gateway/services`

### 🛠️ Variables de Entorno

Puedes personalizar la configuración modificando el archivo `.env` del API Gateway:

```env
# Clima Service Configuration
CLIMA_SERVICE_URL=http://localhost:3000
CLIMA_SERVICE_ENABLED=true
```

### 🔧 Troubleshooting

1. **Verificar que el módulo de clima esté corriendo:**
```bash
curl http://localhost:3000/api-docs
```

2. **Verificar que el API Gateway esté corriendo:**
```bash
curl http://localhost:8080/api-gateway/health
```

3. **Verificar la conexión entre servicios:**
```bash
curl http://localhost:8080/api-gateway/services
```

### 📝 Notas Importantes

- El API Gateway corre en el puerto **8080** para evitar conflictos
- El módulo de clima corre en el puerto **3000**
- Todas las rutas del clima deben incluir el prefijo `/clima`
- El Service Discovery está habilitado y registra automáticamente los servicios
- Las rutas están protegidas con JWT excepto las de autenticación
