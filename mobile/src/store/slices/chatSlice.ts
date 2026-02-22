import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
    id: number;
    group_id: number;
    sender_id: number;
    sender_name: string;
    sender_avatar: string;
    type: string;
    content: string;
    metadata: string; // JSON string
    reply_to_id: number | null;
    reply_to_content: string | null;
    reply_to_type: string | null;
    reply_to_sender: string | null;
    is_forwarded: boolean | number;
    is_deleted: boolean | number;
    reactions: string | null; // JSON string
    created_at: string;
    status: 'pending' | 'sent' | 'delivered' | 'read';
}

interface ChatState {
    messages: ChatMessage[];
    activeGroupId: number | null;
    refreshTrigger: number; // Simple way to force UI to re-read from SQLite
}

const initialState: ChatState = {
    messages: [],
    activeGroupId: null,
    refreshTrigger: 0,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveGroup: (state, action: PayloadAction<number | null>) => {
            state.activeGroupId = action.payload;
            state.messages = []; // Clear on switch
        },
        setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
            state.messages = action.payload;
        },
        prependMessages: (state, action: PayloadAction<ChatMessage[]>) => {
            // Adds messages to the end of the array (older messages for inverted FlatList)
            state.messages = [...state.messages, ...action.payload];
        },
        appendMessage: (state, action: PayloadAction<ChatMessage>) => {
            // Only append if we are currently looking at this group
            if (state.activeGroupId === action.payload.group_id) {
                // Check for duplicates (just in case)
                if (!state.messages.some(m => m.id === action.payload.id)) {
                    state.messages.unshift(action.payload);
                }
            }
        },
        updateMessageStatus: (state, action: PayloadAction<{ id: number, status: 'sent' | 'delivered' }>) => {
            const index = state.messages.findIndex(m => m.id === action.payload.id);
            if (index !== -1) {
                state.messages[index].status = action.payload.status;
            }
        },
        updateChatSnippet: (state, action: PayloadAction<any>) => {
            // Unused currently, but reserved for future ChatList real-time updates without SQLite refetch
            state.refreshTrigger += 1;
        },
        triggerRefresh: (state) => {
            state.refreshTrigger += 1;
        }
    },
});

export const {
    setActiveGroup,
    setMessages,
    prependMessages,
    appendMessage,
    updateMessageStatus,
    updateChatSnippet,
    triggerRefresh
} = chatSlice.actions;

export default chatSlice.reducer;
