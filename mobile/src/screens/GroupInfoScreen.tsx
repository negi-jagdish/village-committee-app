import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Modal, FlatList, Switch } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { chatAPI, API_BASE_URL } from '../api/client';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import Avatar from '../components/Avatar';
import { getDB } from '../db/database';
import { format } from 'date-fns';
import Slider from '@react-native-community/slider';
import ToneSelectionModal from '../components/ToneSelectionModal';
import { NOTIFICATION_TONES } from '../config/ToneConfig';

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

    const [vibrationEnabled, setVibrationEnabled] = useState(true);
    const [vibrationIntensity, setVibrationIntensity] = useState(100);
    const [customTone, setCustomTone] = useState('default');
    const [muteUntil, setMuteUntil] = useState<string | null>(null);
    const [showToneModal, setShowToneModal] = useState(false);

    const loadChatSettings = async () => {
        try {
            const db = await getDB();
            db.transaction((tx: any) => {
                tx.executeSql('SELECT * FROM local_chats WHERE id = ?', [groupId], (_: any, result: any) => {
                    if (result.rows.length > 0) {
                        const chat = result.rows.item(0);
                        setCustomTone(chat.notification_tone || 'default');
                        setVibrationEnabled(chat.vibration_enabled !== 0);
                        setVibrationIntensity(chat.vibration_intensity ?? 100);
                        setMuteUntil(chat.mute_until);
                    }
                });
            });
        } catch (e) {
            console.error('Loader error', e);
        }
    };

    const updateChatSetting = async (key: string, value: any) => {
        try {
            const db = await getDB();
            db.transaction((tx: any) => {
                tx.executeSql(`UPDATE local_chats SET ${key} = ? WHERE id = ?`, [value, groupId]);
            });
            if (key === 'notification_tone') setCustomTone(value);
            if (key === 'vibration_enabled') setVibrationEnabled(value === 1);
            if (key === 'vibration_intensity') setVibrationIntensity(value);
            if (key === 'mute_until') setMuteUntil(value);
        } catch (e) {
            console.error('Update error', e);
        }
    };

    const isMuted = () => {
        if (!muteUntil) return false;
        if (muteUntil === 'always') return true;
        return new Date(muteUntil) > new Date();
    };

    const handleClearChat = () => {
        Alert.alert('Clear Chat', 'Are you sure you want to delete all messages in this chat locally?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: async () => {
                    const db = await getDB();
                    db.transaction((tx: any) => {
                        tx.executeSql('DELETE FROM local_messages WHERE group_id = ?', [groupId]);
                        tx.executeSql('UPDATE local_chats SET last_message = NULL, unread_count = 0 WHERE id = ?', [groupId]);
                    }, (err: any) => console.error(err), () => {
                        navigation.goBack();
                    });
                }
            }
        ]);
    };

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
            loadChatSettings();
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
                const formData = new FormData();
                formData.append('file', {
                    uri: asset.uri,
                    type: asset.type,
                    name: asset.fileName || 'group_icon.jpg',
                } as any);

                const uploadRes = await chatAPI.uploadMedia(formData);
                const { url } = uploadRes.data;

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
    const formatDateStr = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy');
        } catch (e) {
            return dateString;
        }
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
                                Created: {formatDateStr(group.created_at)} • {group.members?.length} members
                            </Text>
                        </>
                    )}
                </View>

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

                {/* Notifications Section */}
                <View style={{ marginTop: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginLeft: 20, marginBottom: 8, textTransform: 'uppercase' }}>🔔 Notifications</Text>
                    <View style={{ backgroundColor: colors.card, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.borderLight }}>
                        <TouchableOpacity
                            style={styles.listItem}
                            onPress={() => {
                                if (isMuted()) {
                                    updateChatSetting('mute_until', null);
                                } else {
                                    Alert.alert('Mute Chat', 'Notifications will be silenced for:', [
                                        {
                                            text: '1 Hour', onPress: () => {
                                                const date = new Date();
                                                date.setHours(date.getHours() + 1);
                                                updateChatSetting('mute_until', date.toISOString());
                                            }
                                        },
                                        {
                                            text: '12 Hours', onPress: () => {
                                                const date = new Date();
                                                date.setHours(date.getHours() + 12);
                                                updateChatSetting('mute_until', date.toISOString());
                                            }
                                        },
                                        { text: 'Always', onPress: () => updateChatSetting('mute_until', 'always') },
                                        { text: 'Cancel', style: 'cancel' }
                                    ]);
                                }
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name={isMuted() ? 'notifications-off' : 'notifications'} size={24} color={colors.textSecondary} />
                                <Text style={{ fontSize: 16, color: colors.text, marginLeft: 15 }}>{isMuted() ? 'Unmute' : 'Mute Notifications'}</Text>
                            </View>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                {isMuted() ? (muteUntil === 'always' ? 'Always' : 'Active') : 'Off'} ›
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 54 }} />

                        <TouchableOpacity
                            style={styles.listItem}
                            onPress={() => setShowToneModal(true)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="music-note" size={24} color={colors.textSecondary} />
                                <Text style={{ fontSize: 16, color: colors.text, marginLeft: 15 }}>Custom Tone</Text>
                            </View>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                {NOTIFICATION_TONES.find(t => t.id === customTone)?.name || 'Default'} ›
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 54 }} />

                        <View style={styles.listItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="vibrate" size={24} color={colors.textSecondary} />
                                <Text style={{ fontSize: 16, color: colors.text, marginLeft: 15 }}>Vibration</Text>
                            </View>
                            <Switch
                                value={vibrationEnabled}
                                onValueChange={(val) => updateChatSetting('vibration_enabled', val ? 1 : 0)}
                                trackColor={{ false: '#e0e0e0', true: '#bfe6c8' }}
                                thumbColor={vibrationEnabled ? colors.primary : '#999'}
                            />
                        </View>

                        {vibrationEnabled && (
                            <View style={{ paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.card }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Intensity</Text>
                                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>{vibrationIntensity}%</Text>
                                </View>
                                <Slider
                                    style={{ width: '100%', height: 40 }}
                                    minimumValue={0}
                                    maximumValue={100}
                                    step={1}
                                    value={vibrationIntensity}
                                    onSlidingComplete={(val) => updateChatSetting('vibration_intensity', val)}
                                    minimumTrackTintColor={colors.primary}
                                    maximumTrackTintColor={colors.border}
                                    thumbTintColor={colors.primary}
                                />
                            </View>
                        )}
                    </View>
                </View>

                {/* Clear Chat Section */}
                <View style={{ marginTop: 20 }}>
                    <TouchableOpacity
                        style={[styles.listItem, { backgroundColor: colors.card, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.borderLight }]}
                        onPress={handleClearChat}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="delete-sweep" size={24} color="#E53935" />
                            <Text style={{ fontSize: 16, color: '#E53935', marginLeft: 15 }}>Clear Chat History</Text>
                        </View>
                    </TouchableOpacity>
                </View>

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
                </View>

                <TouchableOpacity style={[styles.leaveButton, { borderTopColor: colors.borderLight }]} onPress={handleLeaveGroup}>
                    <Icon name="exit-to-app" size={24} color="red" />
                    <Text style={styles.leaveText}>Exit Group</Text>
                </TouchableOpacity>

            </ScrollView>

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

            <ToneSelectionModal
                visible={showToneModal}
                selectedTone={customTone}
                onSelect={(toneId) => {
                    updateChatSetting('notification_tone', toneId);
                    setShowToneModal(false);
                }}
                onClose={() => setShowToneModal(false)}
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
        marginTop: 5
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
        paddingHorizontal: 20,
        marginTop: 20
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
        borderBottomWidth: StyleSheet.hairlineWidth
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
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15
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
    }
});
