import { Amplify } from 'aws-amplify';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import outputs from "../../amplify_outputs.json";

import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import React from 'react';
import { ConversationMessage } from '@aws-amplify/data-schema/dist/esm/ai/ConversationType';
import { createAIHooks } from './hooks/createAIHooks';
import { AIContextProvider } from './hooks/AIContextProvider';

const client = generateClient<Schema>();
const { useAIConversation } = createAIHooks(client);

console.log(client);
Amplify.configure(outputs);

export default function App() {
    return (
        <AIContextProvider>
            <Foobar />
        </AIContextProvider>
    )
}

export function Foobar() {
    // React.useEffect(() => {
    //     async function fetchMyAPI() {
    //         // const conversation = await client.conversations.pirateChat.create();
    //         const getResult = await client.conversations.pirateChat.get({ id: 'a85bc54c-9d96-470f-a571-049519917e9a' });
    //         const { data: conversation } = getResult;
    //         const content = [{ text: 'foo' }, { text: 'bar' }]
    //         const aiContext = { userFullName: 'Bruce Parker' }
    //         // const sendMessageResult = await conversation.sendMessage({ content, aiContext });
    //         conversation.onMessage((message: ConversationMessage) => {
    //             console.log({ recievedMessage: message })
    //         })
    //         const listMessagesResult = await conversation.listMessages();
    //         console.log({ conversation, listMessagesResult })
    //     }

    //     fetchMyAPI()
    // }, [])
    const [{ data: { messages } }, sendMessage] = useAIConversation('pirateChat');
    console.log({ messagesFromHook: messages })
    return (
        <Authenticator>
            {({ signOut, user }) => {
                return (
                    <main>
                        <h1>Hello {user.username}</h1>
                        {messages.map((message) => {
                            return message.content.map((content) => <p key={`${message.id + content.text}`}>{content.text}</p>)
                        })}
                        {/* {otherMessages.map((message) => {
                            return message.content.map((content) => <p key={`${message.id + content.text}`}>{content.text}</p>)
                        })} */}
                        <button onClick={() => {
                            const content = [{ text: 'foo' }]
                            const aiContext = { userFullName: 'Bruce Parker' }
                            sendMessage({ content, aiContext });
                        }}>Send a message sir</button>
                    </main>
                );
            }}
        </Authenticator>
    );
}
