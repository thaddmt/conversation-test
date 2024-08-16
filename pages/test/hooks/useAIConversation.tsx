import React from 'react';
import { V6Client } from '@aws-amplify/api-graphql';
import { Conversation, ConversationMessage } from '@aws-amplify/data-schema/dist/esm/ai/ConversationType';
import { useAIContext } from './AIContextProvider';

export interface ActionState<T> {
  data: T;
  isLoading: boolean;
  message: string | undefined;
}

interface SendMesageParameters {
  content: Parameters<Conversation['sendMessage']>[0]['content'];
  aiContext?: Parameters<Conversation['sendMessage']>[0]['aiContext'];
  responseComponents?: any;
}

interface UseAIConversationInput {
  id?: string; // should attempt to create a new session id if none is passed
  onResponse?: (message: ConversationMessage) => void;
}

interface AIConversationState {
  messages: ConversationMessage[];
}

export type UseAIConversationHook<T extends string> = (
  routeName: T,
  input?: UseAIConversationInput
) => [ActionState<AIConversationState>, (input: SendMesageParameters) => void];

export function createUseAIConversation<T extends V6Client<any>>(
  client: T
): UseAIConversationHook<Extract<keyof T['conversations'], string>> {
  const useAIConversation: UseAIConversationHook<
    Extract<keyof T['conversations'], string>
  > = (routeName: keyof T['conversations'], input = {}) => {
    const clientRoute = (client.conversations as T['conversations'])[routeName];

    const { routeToConversationsMap, setRouteToConversationsMap } = useAIContext();
    const messagesFromAIContext = routeToConversationsMap[routeName as string]?.[input.id];
    const [localMessages, setLocalMessages] = React.useState<ConversationMessage[]>(messagesFromAIContext ?? []);
    const [localConversation, setLocalConversation] = React.useState<Conversation | undefined>(undefined);

    // On hook initialization get conversation and load all messages
    React.useEffect(() => {
      async function initialize() {
        const { data: conversation } = !!input.id ? await clientRoute.get({ id: input.id }) : await clientRoute.create();
        const { data: messages } = await conversation.listMessages();

        setLocalMessages(messages);
        setLocalConversation(conversation)
        console.log({ conversation })
        setRouteToConversationsMap({
          ...routeToConversationsMap, [routeName]: {
            ...routeToConversationsMap[routeName as string], [conversation.id]: messages
          }
        })
      }

      initialize();
    }, [])

    // Update messages to match what is in AIContext if they aren't equal
    React.useEffect(() => {
      if (!!messagesFromAIContext && messagesFromAIContext !== localMessages)
        setLocalMessages(messagesFromAIContext)
    }, [messagesFromAIContext])

    const sendMessage = (input: SendMesageParameters) => {
      const { content, aiContext, } = input;
      localConversation && localConversation.sendMessage({ content, aiContext })
        .then((value) => {
          const { data: sentMessage } = value;
          console.log('we just sent this message', sentMessage)
          setLocalMessages([...localMessages, sentMessage]);
          setRouteToConversationsMap({
            ...routeToConversationsMap, [routeName]: {
              ...routeToConversationsMap[routeName as string], [localConversation.id]: [...localMessages, sentMessage]
            }
          })
        })
        .catch((reason) => {
          console.error('ran into error', reason)
        });
    };

    const subscribe = React.useCallback((handleStoreChange: () => void) => {
      // Listen for messages on the WebSocket
      const subscription = localConversation && localConversation.onMessage((message) => {
        console.log('HEY WE GOT A MESSAGE')
        console.log({ message })
        setLocalMessages([...localMessages, message]);
        setRouteToConversationsMap({
          ...routeToConversationsMap, [routeName]: {
            ...routeToConversationsMap[routeName as string], [localConversation.id]: [...localMessages, message]
          }
        })
        handleStoreChange(); // should cause a re-render
      })
      return () => {
        subscription && subscription.unsubscribe();
      };
    }, [localConversation]);

    const getSnapshot = React.useCallback(() => localMessages, [localMessages]);

    // Using useSyncExternalStore to subscribe to external data updates
    // Have to provide third optional argument in next - https://github.com/vercel/next.js/issues/54685
    const messagesFromStore = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return [
      {
        data: { messages: messagesFromStore },
        isLoading: false,
        message: undefined,
      },
      sendMessage,
    ];
  };

  return useAIConversation;
}
