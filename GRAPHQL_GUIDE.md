# GraphQL API - Documentación

## 🚀 GraphQL Integration Completada

¡Tu API Gateway ahora tiene GraphQL totalmente integrado! Esto significa que tu frontend puede conectarse a través de una sola endpoint GraphQL en lugar de múltiples endpoints REST.

## 📋 Endpoints Disponibles

- **GraphQL API**: `http://localhost:8080/graphql`
- **GraphQL Playground**: `http://localhost:8080/playground` (solo en desarrollo)

## 🎯 Capacidades del API GraphQL

### 1. Gateway Management
```graphql
# Obtener estadísticas del gateway
query {
  gatewayStats {
    totalServices
    healthyServices
    unhealthyServices
    uptime
    version
    environment
    serviceGroups {
      name
      instances
      healthy
      unhealthy
    }
  }
}

# Listar todos los servicios registrados
query {
  services {
    id
    name
    endpoint
    status
    version
    lastSeen
    metadata
    tags
  }
}

# Buscar servicios por nombre
query {
  service(name: "Clima Service") {
    id
    name
    endpoint
    status
  }
}
```

### 2. Service Discovery Management
```graphql
# Registrar un nuevo servicio
mutation {
  registerService(input: {
    name: "New Service"
    host: "localhost"
    port: 3001
    protocol: "http"
    version: "1.0.0"
    metadata: {}
    tags: ["new", "test"]
  }) {
    id
    name
    endpoint
    status
  }
}

# Desregistrar un servicio
mutation {
  deregisterService(id: "service-id") 
}
```

### 3. Proxy de Servicios
```graphql
# Hacer request a través del proxy
query {
  proxyRequest(request: {
    serviceName: "Clima Service"
    path: "/weather"
    method: "GET"
    headers: {}
    body: ""
  }) {
    statusCode
    data
    error
    responseTime
  }
}
```

### 4. Auth Service (Delegado a microservicio)
```graphql
# Login
mutation {
  login(email: "user@example.com", password: "password") {
    token
    user {
      id
      username
      email
      role
    }
  }
}

# Obtener usuario actual
query {
  me {
    id
    username
    email
    role
    createdAt
  }
}

# Listar usuarios
query {
  users {
    id
    username
    email
    role
  }
}
```

### 5. Admissions Service (Delegado a microservicio)
```graphql
# Obtener estudiantes
query {
  students {
    id
    firstName
    lastName
    email
    dateOfBirth
    status
  }
}

# Obtener aplicaciones
query {
  applications {
    id
    student {
      firstName
      lastName
      email
    }
    program
    academicYear
    status
    submittedAt
  }
}

# Crear nueva aplicación
mutation {
  createApplication(input: {
    studentId: "student-123"
    program: "Computer Science"
    academicYear: "2024"
  }) {
    id
    program
    status
    submittedAt
  }
}
```

### 6. Subscriptions (Tiempo Real)
```graphql
# Suscribirse a cambios de estado de servicios
subscription {
  serviceStatusChanged {
    id
    name
    status
    lastSeen
  }
}

# Suscribirse a actualizaciones de estadísticas
subscription {
  gatewayStatsUpdated {
    totalServices
    healthyServices
    uptime
  }
}

# Suscribirse a cambios en aplicaciones
subscription {
  applicationStatusChanged {
    id
    status
    student {
      firstName
      lastName
    }
  }
}
```

## 🔧 Configuración para Frontend

### React con Apollo Client
```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:8080/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});
```

### Vue con Apollo
```javascript
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

const httpLink = new HttpLink({
  uri: 'http://localhost:8080/graphql'
})

const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  connectToDevTools: true
})
```

### Angular con Apollo
```typescript
import { NgModule } from '@angular/core';
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLinkModule, HttpLink } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

@NgModule({
  exports: [ApolloModule, HttpLinkModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink) => {
        return {
          cache: new InMemoryCache(),
          link: httpLink.create({
            uri: 'http://localhost:8080/graphql',
          }),
        };
      },
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
```

## 🎨 Usando GraphQL Playground

1. Abre `http://localhost:8080/playground` en tu navegador
2. Usa la documentación automática (lado derecho)
3. Escribe tus queries en el panel izquierdo
4. Presiona el botón ▶️ para ejecutar
5. Ve los resultados en el panel central

## 🏆 Ventajas de GraphQL vs REST

### ✅ Ventajas de GraphQL:
- **Una sola endpoint**: `/graphql` para todas las operaciones
- **Queries flexibles**: Pide exactamente los datos que necesitas
- **Strongly typed**: Validación automática de tipos
- **Introspección**: Documentación automática
- **Real-time**: Subscriptions para actualizaciones en tiempo real
- **Batch requests**: Múltiples operaciones en una sola request

### 🔄 Comparación práctica:

**REST tradicional:**
```bash
GET /api/services
GET /api/services/1/stats
GET /api/users
POST /api/auth/login
```

**GraphQL (una sola request):**
```graphql
query {
  services { id name status }
  gatewayStats { uptime totalServices }
  users { id username email }
}
```

## 🔒 Seguridad

El GraphQL server incluye:
- Validación de queries
- Rate limiting (configurable)
- Depth limiting para prevenir queries complejas
- Authentication/Authorization headers
- CORS configurado

## 📊 Monitoring

Todas las operaciones GraphQL son loggeadas con:
- Request ID único
- Timing de operaciones
- Errores detallados
- Metadata de usuario

## 🚀 Próximos Pasos

1. **Conecta tu frontend** usando Apollo Client, Relay, o cualquier cliente GraphQL
2. **Agrega autenticación** usando headers Authorization
3. **Configura subscriptions** para updates en tiempo real
4. **Optimiza queries** usando DataLoader para N+1 problems
5. **Monitorea performance** con Apollo Studio (opcional)

¡Tu API Gateway ahora es un GraphQL server completo y listo para producción! 🎉
