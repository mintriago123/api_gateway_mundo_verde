import { queryResolvers } from './queryResolvers';
import { mutationResolvers } from './mutationResolvers';
import { scalarResolvers } from './scalarResolvers';

export const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  ...scalarResolvers,
  
  // Subscriptions (placeholder para futuro desarrollo)
  Subscription: {
    serviceStatusChanged: {
      // Esto requeriría un sistema de suscripciones como Redis PubSub
      subscribe: () => {
        // Placeholder
        return {
          async *[Symbol.asyncIterator]() {
            // Implementación futura
          }
        };
      }
    },
    
    gatewayStatsUpdated: {
      subscribe: () => {
        return {
          async *[Symbol.asyncIterator]() {
            // Implementación futura
          }
        };
      }
    },
    
    applicationStatusChanged: {
      subscribe: () => {
        return {
          async *[Symbol.asyncIterator]() {
            // Implementación futura
          }
        };
      }
    },
    
    newApplicationSubmitted: {
      subscribe: () => {
        return {
          async *[Symbol.asyncIterator]() {
            // Implementación futura
          }
        };
      }
    }
  }
};

export default resolvers;
