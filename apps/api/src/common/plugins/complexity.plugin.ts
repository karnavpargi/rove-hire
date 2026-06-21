import { ApolloServerPlugin, BaseContext, GraphQLRequestListener } from '@apollo/server';
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
} from 'graphql-query-complexity';
import { GraphQLSchema } from 'graphql';

/**
 * Apollo Server plugin that enforces query complexity scoring.
 * Rejects queries exceeding the configured maximum complexity score.
 *
 * Estimators:
 * - fieldExtensionsEstimator: uses @Complexity() decorator values
 * - simpleEstimator: defaults each field to cost 1
 *
 * Default: max complexity 1000.
 *
 * Requirements: 23.3
 */
export function createComplexityPlugin(maxComplexity = 1000): ApolloServerPlugin<BaseContext> {
  return {
    async requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
      return {
        async didResolveOperation(requestContext) {
          const { document, schema, request } = requestContext;

          if (!document || !schema) {
            return;
          }

          const complexity = getComplexity({
            schema: schema as GraphQLSchema,
            query: document,
            variables: request.variables ?? {},
            estimators: [
              fieldExtensionsEstimator(),
              simpleEstimator({ defaultComplexity: 1 }),
            ],
          });

          if (complexity > maxComplexity) {
            throw new Error(
              `Query complexity ${complexity} exceeds maximum allowed complexity of ${maxComplexity}. ` +
              `Please reduce the number of fields or nesting in your query.`,
            );
          }
        },
      };
    },
  };
}
