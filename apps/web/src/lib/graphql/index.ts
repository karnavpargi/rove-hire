/**
 * GraphQL client barrel export.
 *
 * Re-exports from the main graphql-client module for convenience.
 * The primary client uses graphql-request with TanStack Query.
 */

export {
  graphqlClient,
  classifyError,
  handleGraphQLError,
  extractErrorExtensions,
  extractAllErrorExtensions,
  isClientError,
  isNetworkError,
  isAuthenticationError,
  isConflictError,
  isRateLimitError,
  isValidationError,
  dispatchToast,
  type ClassifiedError,
  type FieldError,
} from '../graphql-client';

export {
  registerOptimisticUpdate,
  getOptimisticStatus,
  hasPendingUpdate,
  resolveDisplayStatus,
  subscribeToOptimisticUpdates,
  clearAllPendingUpdates,
  type OptimisticStatusUpdate,
  type OptimisticUpdateResult,
} from '../optimistic-updates';

export {
  saveFormData,
  restoreFormData,
  clearFormData,
  cleanupExpiredFormData,
} from '../form-persistence';
