import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface InterceptedRequest {
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  sourceModule?: string;
  targetService?: string;
  clientIP?: string;
  userAgent?: string;
}

export interface InterceptedResponse {
  timestamp: string;
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  responseTime: number;
  size?: number;
}

export interface WebSocketMessage {
  type: 'request' | 'response' | 'error' | 'graphql' | 'connection';
  id: string;
  request?: InterceptedRequest;
  response?: InterceptedResponse;
  error?: any;
  data?: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private requestCounter = 0;

  initialize(server: Server, port: number = 8080) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`📡 Cliente WebSocket conectado desde ${clientIP}`);
      
      this.clients.add(ws);
      
      // Enviar mensaje de bienvenida
      this.sendToClient(ws, {
        type: 'connection',
        id: this.generateRequestId(),
        data: {
          message: 'Conectado al API Gateway Mundo Verde',
          timestamp: new Date().toISOString(),
          clientIP,
          totalClients: this.clients.size
        }
      });

      ws.on('close', () => {
        console.log(`📡 Cliente WebSocket desconectado desde ${clientIP}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Error en WebSocket:', error);
        this.clients.delete(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Mensaje recibido del cliente:', message);
          
          // Aquí puedes manejar mensajes del cliente si es necesario
          if (message.type === 'ping') {
            this.sendToClient(ws, {
              type: 'connection',
              id: this.generateRequestId(),
              data: { type: 'pong', timestamp: new Date().toISOString() }
            });
          }
        } catch (error) {
          console.error('❌ Error procesando mensaje WebSocket:', error);
        }
      });
    });

    console.log(`📡 Servidor WebSocket iniciado en puerto ${port}`);
  }

  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message, null, 2));
      } catch (error) {
        console.error('❌ Error enviando mensaje WebSocket:', error);
      }
    }
  }

  broadcast(message: WebSocketMessage) {
    if (this.clients.size === 0) return;

    console.log(`📤 Broadcasting a ${this.clients.size} cliente(s):`, {
      type: message.type,
      id: message.id,
      url: message.request?.url || message.response?.statusCode
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      } else {
        this.clients.delete(client);
      }
    });
  }

  interceptRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    sourceModule?: string,
    targetService?: string,
    clientIP?: string
  ): string {
    const requestId = this.generateRequestId();
    
    const interceptedRequest: InterceptedRequest = {
      timestamp: new Date().toISOString(),
      method,
      url,
      headers,
      body,
      sourceModule,
      targetService,
      clientIP,
      userAgent: headers['user-agent']
    };

    this.broadcast({
      type: 'request',
      id: requestId,
      request: interceptedRequest
    });

    return requestId;
  }

  interceptResponse(
    requestId: string,
    statusCode: number,
    headers: Record<string, string>,
    body?: any,
    responseTime?: number,
    size?: number
  ) {
    const interceptedResponse: InterceptedResponse = {
      timestamp: new Date().toISOString(),
      statusCode,
      headers,
      body,
      responseTime: responseTime || 0,
      size
    };

    this.broadcast({
      type: 'response',
      id: requestId,
      response: interceptedResponse
    });
  }

  interceptError(requestId: string, error: any) {
    this.broadcast({
      type: 'error',
      id: requestId,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }

  interceptGraphQL(query: string, variables?: any, operationName?: string) {
    const requestId = this.generateRequestId();
    
    this.broadcast({
      type: 'graphql',
      id: requestId,
      data: {
        query,
        variables,
        operationName,
        timestamp: new Date().toISOString()
      }
    });

    return requestId;
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      totalRequests: this.requestCounter,
      serverRunning: this.wss !== null
    };
  }
}

export const wsManager = new WebSocketManager();
