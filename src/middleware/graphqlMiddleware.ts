import { Request, Response, NextFunction } from 'express';
import { ApolloServer } from '@apollo/server';
import { GraphQLContext } from '../graphql/types';
import { GraphQLService } from '../graphql/GraphQLService';
import { Logger } from '../utils/logger';

export function createGraphQLMiddleware(graphQLService: GraphQLService) {
  const server = graphQLService.getServer();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Solo procesar solicitudes POST a /graphql
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // Validar que el cuerpo de la solicitud tenga contenido
      if (!req.body) {
        return res.status(400).json({ error: 'Request body is required' });
      }

      // Crear contexto
      const context = graphQLService.createContext(req, res);

      // Ejecutar la consulta GraphQL
      const result = await server.executeOperation(
        {
          query: req.body.query,
          variables: req.body.variables,
          operationName: req.body.operationName,
        },
        {
          contextValue: context,
        }
      );

      // Manejar errores de ejecución
      if (result.body.kind === 'single') {
        const response = result.body.singleResult;
        
        if (response.errors) {
          Logger.warn('GraphQL execution errors:', response.errors);
          res.status(400).json(response);
        } else {
          res.status(200).json(response);
        }
      } else {
        // Para respuestas incrementales (subscriptions)
        res.status(200).json(result.body);
      }

    } catch (error) {
      Logger.error('GraphQL middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Middleware para GraphQL Playground en desarrollo
export function createGraphQLPlaygroundMiddleware() {
  return (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'GraphQL Playground not available in production' });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>GraphQL Playground</title>
        <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css">
        <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png">
        <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
      </head>
      <body>
        <div id="root">
          <style>
            body { margin: 0; font-family: "Open Sans", sans-serif; overflow: hidden; }
            #root { height: 100vh; }
          </style>
        </div>
        <script>
          window.addEventListener('load', function (event) {
            GraphQLPlayground.init(document.getElementById('root'), {
              endpoint: '/graphql',
              subscriptionEndpoint: null,
              settings: {
                'general.betaUpdates': false,
                'editor.theme': 'dark',
                'editor.cursorShape': 'line',
                'editor.reuseHeaders': true,
                'tracing.hideTracingResponse': true,
                'queryPlan.hideQueryPlanResponse': true,
                'editor.fontSize': 14,
                'editor.fontFamily': 'Source Code Pro, Consolas, Inconsolata, Droid Sans Mono, Monaco, monospace',
                'request.credentials': 'include',
              }
            })
          })
        </script>
      </body>
      </html>
    `);
  };
}
