import type { ApolloServerPlugin, BaseContext, GraphQLRequestListener } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { validate } from 'graphql';
import type { GraphQLSchema } from 'graphql';

/**
 * Apollo Server plugin that enforces a maximum query nesting depth.
 * Rejects queries exceeding the configured depth before resolver execution.
 *
 * Default: max 7 levels of nesting.
 *
 * Requirements: 23.2
 * Validates: Property 22 — GraphQL Query Depth Limiting
 */
export function createDepthLimitPlugin(maxDepth = 7): ApolloServerPlugin<BaseContext> {
  return {
    async requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
      return {
        async didResolveOperation(requestContext) {
          const { document, schema } = requestContext;

          if (!document || !schema) {
            return;
          }

          const errors = validate(schema as GraphQLSchema, document, [depthLimit(maxDepth)]);

          if (errors.length > 0) {
            const error = errors[0];
            throw new Error(
              `Query depth limit exceeded. Maximum allowed depth is ${maxDepth}. ${error.message}`,
            );
          }
        },
      };
    },
  };
}
