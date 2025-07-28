import express from "express";
import { ApolloServer, gql } from "apollo-server-express";
import fetch from "cross-fetch";
import { services } from "./config";
import { wsManager } from "./websocket";

/**
 * Monta el endpoint /graphql sobre un Express ya existente.
 */
export async function mountGraphQL(app: express.Application) {
  // Esquema GraphQL expandido
  const typeDefs = gql`
    type Query {
      hello: String
      # Consultas del módulo de clima
      consultaClima(token: String!, ciudad: String!): ClimaResponse
      # Consultas del módulo de plagas
      obtenerNotificaciones(token: String!): PlagaResponse
      obtenerDetecciones(token: String!): PlagaResponse
      # Consultas del módulo de sensores
      obtenerSensores(token: String!): SensorResponse
      obtenerLecturas(token: String!): SensorResponse
      obtenerUbicaciones(token: String!): SensorResponse
      obtenerAnomalias(token: String!): SensorResponse
      obtenerPredicciones(token: String!): SensorResponse
    }

    type Mutation {
      # Autenticación del módulo de clima
      loginClima(username: String!, password: String!): AuthResponse
      # Autenticación del módulo de plagas
      loginPlagas(email: String!, password: String!): AuthResponse
      registerPlagas(name: String!, email: String!, cedula: String!, password: String!, password_confirmation: String!): AuthResponse
      # Autenticación del módulo de sensores
      loginSensores(username: String!, password: String!): AuthResponse
      # Operaciones del módulo de plagas
      realizarDeteccion(token: String!, imagenUrl: String!): PlagaResponse
      capturarImagen(token: String!, dispositivo: String!): PlagaResponse
      # Operaciones del módulo de sensores
      crearLectura(token: String!, sensor_id: Int!, humedad: Float!, temperatura: Float!): SensorResponse
      crearSensor(token: String!, nombre: String!, tipo: String!, ubicacion_id: Int!): SensorResponse
    }

    type AuthResponse {
      success: Boolean!
      token: String
      message: String
    }

    type ClimaResponse {
      success: Boolean!
      data: String
      message: String
    }

    type PlagaResponse {
      success: Boolean!
      data: String
      message: String
    }

    type SensorResponse {
      success: Boolean!
      data: String
      message: String
    }
  `;

  const resolvers = {
    Query: {
      hello: () => "Hola Mundo!",
      
      consultaClima: async (_: any, { token, ciudad }: { token: string, ciudad: string }) => {
        try {
          console.log(`Consultando clima para ${ciudad} con token:`, token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["clima-service"].base_url}/api/consulta-clima?ciudad=${encodeURIComponent(ciudad)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('Respuesta del clima-service:', response.status, response.statusText);

          if (response.ok) {
            const data = await response.text();
            console.log('Datos del clima recibidos:', data);
            return {
              success: true,
              data,
              message: "Consulta exitosa"
            };
          } else {
            const errorText = await response.text();
            console.log('Error del clima-service:', errorText);
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          console.error('Error de conexión con clima-service:', error);
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerNotificaciones: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo notificaciones de plagas con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/notificaciones`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Notificaciones obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerDetecciones: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo detecciones de plagas con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/deteccion`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Detecciones obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      // Resolvers del módulo de sensores
      obtenerSensores: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo sensores con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/sensores`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Sensores obtenidos exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerLecturas: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo lecturas de sensores con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/readings`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Lecturas obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerUbicaciones: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo ubicaciones con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/ubicaciones`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Ubicaciones obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerAnomalias: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo anomalías con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/anomalias`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Anomalías obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      obtenerPredicciones: async (_: any, { token }: { token: string }) => {
        try {
          console.log('Obteniendo predicciones con token:', token.substring(0, 20) + '...');
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/predicciones`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Predicciones obtenidas exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      }
    },

    Mutation: {
      loginClima: async (_: any, { username, password }: { username: string, password: string }) => {
        try {
          const response = await fetch(`${services["clima-service"].base_url}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });

          if (response.ok) {
            let token = await response.text();
            
            // Limpiar el token: remover comillas y formato {token:...}
            token = token.replace(/"/g, ''); // Remover comillas
            if (token.startsWith('{token:') && token.endsWith('}')) {
              token = token.slice(7, -1); // Extraer solo el JWT del formato {token:...}
            }
            
            console.log('Token limpio clima:', token);
            
            return {
              success: true,
              token,
              message: "Login exitoso en módulo de clima"
            };
          } else {
            return {
              success: false,
              token: null,
              message: `Error de autenticación: ${response.status} ${response.statusText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            token: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      loginPlagas: async (_: any, { email, password }: { email: string, password: string }) => {
        try {
          console.log('Intentando login en módulo de plagas:', email);
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': '*/*'
            },
            body: JSON.stringify({ email, password })
          });

          if (response.ok) {
            let token = await response.text();
            
            // Limpiar el token: remover comillas
            token = token.replace(/"/g, '');
            if (token.startsWith('{token:') && token.endsWith('}')) {
              token = token.slice(7, -1);
            }
            
            console.log('Token limpio plagas:', token);
            
            return {
              success: true,
              token,
              message: "Login exitoso en módulo de plagas"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              token: null,
              message: `Error de autenticación: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            token: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      registerPlagas: async (_: any, { name, email, cedula, password, password_confirmation }: { name: string, email: string, cedula: string, password: string, password_confirmation: string }) => {
        try {
          console.log('Registrando usuario en módulo de plagas:', name);
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': '*/*'
            },
            body: JSON.stringify({ 
              name, 
              email, 
              cedula, 
              password, 
              password_confirmation 
            })
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              token: null,
              message: "Usuario registrado exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              token: null,
              message: `Error de registro: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            token: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      loginSensores: async (_: any, { username, password }: { username: string, password: string }) => {
        try {
          console.log('Intentando login en módulo de sensores:', username);
          
          // Preparar los datos en formato form-urlencoded para OAuth2
          const formData = new URLSearchParams();
          formData.append('grant_type', 'password');
          formData.append('username', username);
          formData.append('password', password);
          formData.append('scope', '');
          formData.append('client_id', 'string');
          formData.append('client_secret', '');
          
          const response = await fetch(`${services["sensor-service"].base_url}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'accept': 'application/json'
            },
            body: formData.toString()
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Respuesta completa del sensor-service:', data);
            
            // El token viene en data.access_token según OAuth2
            const token = data.access_token || data.token;
            
            console.log('Token de sensores obtenido:', token);
            
            return {
              success: true,
              token,
              message: "Login exitoso en módulo de sensores"
            };
          } else {
            const errorText = await response.text();
            console.log('Error del sensor-service:', errorText);
            return {
              success: false,
              token: null,
              message: `Error de autenticación: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          console.error('Error de conexión con sensor-service:', error);
          return {
            success: false,
            token: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      realizarDeteccion: async (_: any, { token, imagenUrl }: { token: string, imagenUrl: string }) => {
        try {
          console.log('Realizando detección de plagas con imagen:', imagenUrl);
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/deteccion`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imagen_url: imagenUrl })
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Detección realizada exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error en detección: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      capturarImagen: async (_: any, { token, dispositivo }: { token: string, dispositivo: string }) => {
        try {
          console.log('Capturando imagen desde dispositivo:', dispositivo);
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/captura`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dispositivo })
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Imagen capturada exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error en captura: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      // Mutations del módulo de sensores
      crearLectura: async (_: any, { token, sensor_id, humedad, temperatura }: { token: string, sensor_id: number, humedad: number, temperatura: number }) => {
        try {
          console.log(`Creando lectura para sensor ${sensor_id}: humedad=${humedad}, temperatura=${temperatura}`);
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/lecturas/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify({ 
              sensor_id, 
              humedad, 
              temperatura 
            })
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Lectura creada exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error al crear lectura: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      },

      crearSensor: async (_: any, { token, nombre, tipo, ubicacion_id }: { token: string, nombre: string, tipo: string, ubicacion_id: number }) => {
        try {
          console.log(`Creando sensor: ${nombre} tipo ${tipo} en ubicación ${ubicacion_id}`);
          
          const response = await fetch(`${services["sensor-service"].base_url}/api/v1/sensores/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify({ 
              nombre, 
              tipo, 
              ubicacion_id 
            })
          });

          if (response.ok) {
            const data = await response.text();
            return {
              success: true,
              data,
              message: "Sensor creado exitosamente"
            };
          } else {
            const errorText = await response.text();
            return {
              success: false,
              data: null,
              message: `Error al crear sensor: ${response.status} ${response.statusText} - ${errorText}`
            };
          }
        } catch (error: any) {
          return {
            success: false,
            data: null,
            message: `Error de conexión: ${error.message}`
          };
        }
      }
    }
  };

  /* Arranca Apollo */
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    introspection: true,
    context: ({ req }) => ({ req }),
    plugins: [
      // Habilita GraphQL Playground en desarrollo
      process.env.NODE_ENV === 'production' 
        ? require('apollo-server-core').ApolloServerPluginLandingPageDisabled()
        : require('apollo-server-core').ApolloServerPluginLandingPageGraphQLPlayground()
    ],
    // Formatear errores para mejor debugging
    formatError: (err) => {
      console.error('❌ Error en GraphQL:', err);
      return {
        message: err.message,
        locations: err.locations,
        path: err.path,
      };
    }
  });
  
  await server.start();

  /* Conecta Apollo con Express - configuración que evita conflictos de stream */
  server.applyMiddleware({ 
    app: app as any, 
    path: '/graphql',
    cors: false, // Ya manejamos CORS globalmente
    bodyParserConfig: {
      limit: '10mb'
    },
    // Deshabilitar el propio body-parser de Apollo si causa problemas
    disableHealthCheck: true
  });

  console.log(`🚀 GraphQL server ready at http://localhost:4000${server.graphqlPath}`);

  /* Opcional: endpoints de salud */
  app.get("/", (_, res) => res.send("¡Bienvenido a la API Gateway!"));
  app.get("/status", (_, res) =>
    res.json({ status: "El servidor está en funcionamiento" })
  );
}