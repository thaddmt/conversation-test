import { V6Client } from '@aws-amplify/api-graphql';
import {
  createUseAIConversation,
  UseAIConversationHook,
} from './useAIConversation';

export function createAIHooks<T extends V6Client<any>>(
  _client: T
): {
  useAIConversation: UseAIConversationHook<Extract<keyof T['conversations'], string>>;
} {
  const useAIConversation = createUseAIConversation(_client);

  return { useAIConversation };
}
