import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { chatAPI, membersAPI, API_BASE_URL } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function ForwardMessageScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { messageId, content, type, metadata } = route.params;
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [allData, setAllData] = useState<{ recent: any[], contacts: any[] }>({ recent: [], contacts: [] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [chatsRes, membersRes] = await Promise.all([
                chatAPI.getList(),
                membersAPI.getList()
            ]);

            const recentChats = chatsRes.data;
            const allMembers = membersRes.data;

            // Filter out current user from members
            const otherMembers = allMembers.filter((m: any) => m.id !== currentUserId);

            // Identify members we already have a PRIVATE chat with
            // Note: In real app, we should check `group.members` or `group.metadata` to know associated memberId.
            // For now, simply list them. If we forward to a member, we'll ensure a chat exists.

            setAllData({ recent: recentChats, contacts: otherMembers });
            updateSections(recentChats, otherMembers, '');

        } catch (error) {
            console.error('Fetch data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSections = (recent: any[], contacts: any[], query: string) => {
        let filteredRecent = recent;
        let filteredContacts = contacts;

        if (query) {
            const lowerQ = query.toLowerCase();
            filteredRecent = recent.filter(c => c.name.toLowerCase().includes(lowerQ));
            filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(lowerQ));
        }

        const newSections = [];
        if (filteredRecent.length > 0) {
            newSections.push({ title: 'Recent Chats', data: filteredRecent.map((c: any) => ({ ...c, isChat: true })) });
        }
        if (filteredContacts.length > 0) {
            newSections.push({ title: 'Contacts', data: filteredContacts.map((c: any) => ({ ...c, isChat: false })) });
        }
        setSections(newSections);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        updateSections(allData.recent, allData.contacts, text);
    };

    const handleForward = async (item: any) => {
        Alert.alert(
            'Forward Message',
            `Forward to ${item.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        try {
                            let targetGroupId = item.id;
                            let targetGroup = item;

                            // If it's a contact (not an existing chat), create/get private chat first
                            if (!item.isChat) {
                                const res = await chatAPI.createGroup({
                                    type: 'private',
                                    memberIds: [item.id]
                                });
                                targetGroupId = res.data.id;
                                targetGroup = res.data;
                            }

                            // Handle Bulk Forwarding
                            const forwardList = route.params.forwardList || [{ content, type, metadata }];

                            for (const msg of forwardList) {
                                await chatAPI.forwardMessage(targetGroupId, msg.content, msg.type, msg.metadata);
                            }

                            // Navigate to that chat
                            // Fix: Pass correct name/icon. If it was a contact, use item.name/profile_picture.
                            // If it was a group, use targetGroup properties.

                            const chatName = item.isChat ? item.name : item.name;
                            const chatIcon = item.isChat ? item.icon : item.profile_picture;

                            (navigation as any).replace('ChatScreen', {
                                groupId: targetGroupId,
                                name: chatName,
                                icon: chatIcon ? (chatIcon.startsWith('http') ? chatIcon : `${API_BASE_URL.replace('/api', '')}${chatIcon}`) : null
                            });
                        } catch (error) {
                            console.error('Forward failed:', error);
                            Alert.alert('Error', 'Failed to forward message');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const imageUri = item.isChat
            ? (item.icon ? `${API_BASE_URL.replace('/api', '')}${item.icon}` : 'https://via.placeholder.com/50')
            : (item.profile_picture || 'https://via.placeholder.com/50');

        const subtitle = item.isChat
            ? (item.type === 'private' ? 'Private Chat' : 'Group Chat')
            : 'Contact';

        return (
            <TouchableOpacity style={[styles.itemCallback, { borderBottomColor: colors.borderLight }]} onPress={() => handleForward(item)}>
                <Image
                    source={{ uri: imageUri }}
                    style={styles.avatar}
                />
                <View style={styles.chatInfo}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.lastMessage, { color: colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }: any) => (
        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{title}</Text>
        </View>
    );

    if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>Forward to...</Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                <Icon name="magnify" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item, index) => item.id.toString() + (item.isChat ? '_chat' : '_contact') + index}
                stickySectionHeadersEnabled={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        elevation: 2
    },
    backButton: { margin: 10, marginRight: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        margin: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    searchInput: { flex: 1, padding: 0 },
    itemCallback: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 1
    },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    chatInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold' },
    lastMessage: { fontSize: 14 },
    sectionHeader: {
        paddingVertical: 8,
        paddingHorizontal: 15,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    }
});
