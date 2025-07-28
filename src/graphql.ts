import express from "express";
import { ApolloServer, gql } from "apollo-server-express";
import fetch from "cross-fetch";
import { services } from "./config";

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
    }

    type Mutation {
      # Autenticación del módulo de clima
      loginClima(username: String!, password: String!): AuthResponse
      # Autenticación del módulo de plagas
      loginPlagas(email: String!, password: String!): AuthResponse
      registerPlagas(username: String!, password: String!, email: String!): AuthResponse
      # Operaciones del módulo de plagas
      realizarDeteccion(token: String!, imagenUrl: String!): PlagaResponse
      capturarImagen(token: String!, dispositivo: String!): PlagaResponse
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

      registerPlagas: async (_: any, { username, password, email }: { username: string, password: string, email: string }) => {
        try {
          console.log('Registrando usuario en módulo de plagas:', username);
          
          const response = await fetch(`${services["plaga-detection"].base_url}/api/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
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
    ]
  });
  
  await server.start();

  /* Conecta Apollo con Express */
  server.applyMiddleware({ 
    app: app as any, 
    path: '/graphql',
    cors: true
  });

  console.log(`🚀 GraphQL server ready at http://localhost:4000${server.graphqlPath}`);

  /* Opcional: endpoints de salud */
  app.get("/", (_, res) => res.send("¡Bienvenido a la API Gateway!"));
  app.get("/status", (_, res) =>
    res.json({ status: "El servidor está en funcionamiento" })
  );
}