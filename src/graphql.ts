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
    }

    type Mutation {
      # Autenticación del módulo de clima
      loginClima(username: String!, password: String!): AuthResponse
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
            
            console.log('Token limpio:', token);
            
            return {
              success: true,
              token,
              message: "Login exitoso"
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