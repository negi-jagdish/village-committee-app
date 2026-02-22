import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Modal, FlatList } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { chatAPI, membersAPI, API_BASE_URL } from '../api/client';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import Avatar from '../components/Avatar';

export default function GroupInfoScreen() {
    const { colors, isDark } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { groupId } = route.params;
    const userId = useSelector((state: RootState) => state.auth.user?.id);

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [updating, setUpdating] = useState(false);

    const [selectedMember, setSelectedMember] = useState<any>(null);

    const fetchGroupDetails = async () => {
        try {
            const response = await chatAPI.getGroupDetails(groupId);
            setGroup(response.data);
            setEditName(response.data.name);
            setEditDescription(response.data.description || '');
        } catch (error) {
            console.error('Fetch group details error:', error);
            Alert.alert('Error', 'Failed to load group details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchGroupDetails();
        }, [groupId])
    );




    const handleSave = async () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Group name cannot be empty');
            return;
        }
        setUpdating(true);
        try {
            await chatAPI.updateGroupDetails(groupId, {
                name: editName,
                description: editDescription
            });
            setIsEditing(false);
            fetchGroupDetails();
            Alert.alert('Success', 'Group info updated');
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update group info');
        } finally {
            setUpdating(false);
        }
    };

    const handleImageUpdate = async () => {
        if (group?.currentUserRole !== 'admin') return;

        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setUpdating(true);
            try {
                // Upload image first
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    type: asset.type,
                    name: asset.fileName || 'group_icon.jpg',
                });

                const uploadRes = await chatAPI.uploadMedia(formData);
                const { url } = uploadRes.data;

                // Update group icon
                await chatAPI.updateGroupDetails(groupId, { icon_url: url });
                fetchGroupDetails();
                Alert.alert('Success', 'Group icon updated');
            } catch (error) {
                console.error('Image update error:', error);
                Alert.alert('Error', 'Failed to update group icon');
            } finally {
                setUpdating(false);
            }
        }
    };

    const handleLeaveGroup = async () => {
        Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Leave',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await chatAPI.leaveGroup(groupId);
                        navigation.navigate('ChatList');
                    } catch (error) {
                        console.error('Leave error:', error);
                        Alert.alert('Error', 'Failed to leave group');
                    }
                }
            }
        ]);
    };

    const handleRemoveMember = async (memberId: number, memberName: string) => {
        Alert.alert('Remove Member', `Remove ${memberName} from group?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await chatAPI.removeGroupMember(groupId, memberId);
                        fetchGroupDetails();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to remove member');
                    }
                }
            }
        ]);
    };

    const handleToggleAdmin = async (memberId: number, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'member' : 'admin';
        const action = newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member';

        Alert.alert(action, `Are you sure?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                onPress: async () => {
                    try {
                        await chatAPI.updateMemberRole(groupId, memberId, newRole);
                        fetchGroupDetails();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to update role');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    if (!group) return null;

    const isAdmin = group.currentUserRole === 'admin';

    // Helper to format join date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Group Info</Text>
                {isAdmin && !isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Icon name="edit" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
                {isAdmin && isEditing && (
                    <TouchableOpacity onPress={handleSave} disabled={updating}>
                        {updating ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="check" size={24} color={colors.primary} />}
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Group Icon */}
                <View style={styles.iconContainer}>
                    <TouchableOpacity onPress={handleImageUpdate} disabled={!isAdmin}>
                        <Avatar uri={group.icon_url} name={group.name} size={120} style={styles.groupIcon} />
                        {isAdmin && (
                            <View style={[styles.editIconBadge, { backgroundColor: colors.primary }]}>
                                <Icon name="camera-alt" size={16} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Name & Desc */}
                <View style={styles.infoSection}>
                    {isEditing ? (
                        <>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#333' : '#f9f9f9' }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Group Name"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? '#333' : '#f9f9f9', height: 80, textAlignVertical: 'top' }]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder="Group Description"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                            />
                        </>
                    ) : (
                        <>
                            <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                            {group.description ? (
                                <Text style={[styles.groupDesc, { color: colors.textSecondary }]}>{group.description}</Text>
                            ) : (
                                <Text style={[styles.groupDesc, { color: colors.textSecondary, fontStyle: 'italic' }]}>No description</Text>
                            )}
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                Created: {formatDate(group.created_at)} • {group.members?.length} members
                            </Text>
                        </>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                    {isAdmin && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => {
                                const existingMemberIds = group?.members?.map((m: any) => m.id) || [];
                                navigation.navigate('NewChat', {
                                    mode: 'add_members',
                                    addMembersGroupId: groupId,
                                    existingMemberIds
                                });
                            }}
                        >
                            <Icon name="person-add" size={20} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Members</Text>
                        </TouchableOpacity>
                    )}
                </View>



                {/* Members List */}
                <View style={styles.membersSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{group.members?.length} Members</Text>
                    {group.members?.map((member: any) => (
                        <View key={member.id} style={[styles.memberItem, { borderBottomColor: colors.borderLight }]}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                onPress={() => navigation.navigate('ContactInfo', { memberId: member.id })}
                                onLongPress={() => setSelectedMember(member)}
                            >
                                <Avatar uri={member.profile_picture} name={member.name} size={40} style={styles.memberAvatar} />
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: colors.text }]}>
                                        {member.name} {member.id === userId && '(You)'}
                                    </Text>
                                    <Text style={[styles.memberRole, { color: member.role === 'admin' ? colors.primary : colors.textSecondary }]}>
                                        {member.role === 'admin' ? 'Group Admin' : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* WhatsApp-style Bottom Sheet */}
                    <Modal
                        visible={!!selectedMember}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setSelectedMember(null)}
                    >
                        <TouchableOpacity
                            style={styles.sheetOverlay}
                            activeOpacity={1}
                            onPress={() => setSelectedMember(null)}
                        >
                            <TouchableOpacity activeOpacity={1} style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
                                {/* Header */}
                                <View style={[styles.sheetHeader, { borderBottomColor: colors.borderLight }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Avatar uri={selectedMember?.profile_picture} name={selectedMember?.name || ''} size={40} style={{ marginRight: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.sheetName, { color: colors.text }]} numberOfLines={1}>{selectedMember?.name}</Text>
                                            {selectedMember?.role === 'admin' && (
                                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Group Admin</Text>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.sheetClose}>
                                        <Icon name="close" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Actions */}
                                <TouchableOpacity
                                    style={styles.sheetItem}
                                    onPress={async () => {
                                        setSelectedMember(null);
                                        try {
                                            const res = await chatAPI.createOrGetPrivateChat(selectedMember.id);
                                            const chat = res.data;
                                            navigation.navigate('ChatScreen', {
                                                groupId: chat.id || chat.group_id,
                                                name: selectedMember.name,
                                                icon: selectedMember.profile_picture,
                                            });
                                        } catch (err) {
                                            Alert.alert('Error', 'Failed to open chat');
                                        }
                                    }}
                                >
                                    <Text style={[styles.sheetItemText, { color: colors.text }]}>Message {selectedMember?.name}</Text>
                                    <Icon name="chat" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.sheetItem}
                                    onPress={() => {
                                        const id = selectedMember?.id;
                                        setSelectedMember(null);
                                        navigation.navigate('ContactInfo', { memberId: id });
                                    }}
                                >
                                    <Text style={[styles.sheetItemText, { color: colors.text }]}>View {selectedMember?.name}</Text>
                                    <Icon name="info-outline" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {isAdmin && selectedMember?.id !== userId && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.sheetItem}
                                            onPress={() => {
                                                const m = selectedMember;
                                                setSelectedMember(null);
                                                handleToggleAdmin(m.id, m.role);
                                            }}
                                        >
                                            <Text style={[styles.sheetItemText, { color: '#E53935' }]}>
                                                {selectedMember?.role === 'admin' ? 'Dismiss as admin' : 'Make group admin'}
                                            </Text>
                                            <Icon name="admin-panel-settings" size={22} color="#E53935" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.sheetItem}
                                            onPress={() => {
                                                const m = selectedMember;
                                                setSelectedMember(null);
                                                handleRemoveMember(m.id, m.name);
                                            }}
                                        >
                                            <Text style={[styles.sheetItemText, { color: '#E53935' }]}>Remove from group</Text>
                                            <Icon name="remove-circle-outline" size={22} color="#E53935" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Modal>
                </View>

                {/* Leave Group */}
                <TouchableOpacity style={[styles.leaveButton, { borderTopColor: colors.borderLight }]} onPress={handleLeaveGroup}>
                    <Icon name="exit-to-app" size={24} color="red" />
                    <Text style={styles.leaveText}>Exit Group</Text>
                </TouchableOpacity>

            </ScrollView>
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
        justifyContent: 'space-between',
        borderBottomWidth: 1
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { paddingBottom: 40 },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 20
    },
    groupIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#eee'
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },
    infoSection: {
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20
    },
    groupName: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5
    },
    groupDesc: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 22
    },
    metaText: {
        fontSize: 12,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        fontSize: 16
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 10
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        gap: 5
    },
    actionBtnText: { fontWeight: '600' },
    membersSection: {
        paddingHorizontal: 20
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10
    },
    memberInfo: {
        flex: 1
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500'
    },
    memberRole: {
        fontSize: 12
    },
    adminActions: {
        flexDirection: 'row',
        gap: 10
    },
    iconBtn: {
        padding: 5
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        marginTop: 20,
        borderTopWidth: 1,
        gap: 10
    },
    leaveText: {
        fontSize: 16,
        color: 'red',
        fontWeight: 'bold'
    },
    modalContainer: {
        flex: 1,
        paddingTop: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1
    },
    // Bottom Sheet Styles
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 30,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    sheetName: {
        fontSize: 17,
        fontWeight: '700',
    },
    sheetClose: {
        padding: 4,
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    sheetItemText: {
        fontSize: 16,
        flex: 1,
    },
    pickerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15
    },
    pickerName: {
        fontSize: 16,
        flex: 1
    },
    addButton: {
        margin: 20,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    }
});
