import express from "express";
import { ApolloServer, gql } from "apollo-server-express";
import fetch from "cross-fetch";
import { services } from "./config";

export async function mountGraphQL(app: express.Application) {
  const typeDefs = gql`
    type Query {
      hello: String
      consultaClima(token: String!): ClimaResponse
    }

    type Mutation {
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
      
      consultaClima: async (_: any, { token }: { token: string }) => {
        try {
          const response = await fetch(`${services["clima-service"].base_url}/api/consulta-clima`, {
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
              message: "Consulta exitosa"
            };
          } else {
            return {
              success: false,
              data: null,
              message: `Error: ${response.status} ${response.statusText}`
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
            const token = await response.text();
            return {
              success: true,
              token: token.replace(/"/g, ''),
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

  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    introspection: true,
    context: ({ req }) => ({ req })
  });
  
  await server.start();

  server.applyMiddleware({ 
    app: app as any, 
    path: '/graphql',
    cors: true
  });

  console.log(`🚀 GraphQL server ready at http://localhost:4000${server.graphqlPath}`);

  app.get("/", (_, res) => res.send("¡Bienvenido a la API Gateway!"));
  app.get("/status", (_, res) =>
    res.json({ status: "El servidor está en funcionamiento" })
  );
}
