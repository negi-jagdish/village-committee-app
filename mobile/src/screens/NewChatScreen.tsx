import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, SectionList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { membersAPI, chatAPI } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';

export default function NewChatScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const { mode, addMembersGroupId, existingMemberIds } = route.params || {};
    const isAddMembersMode = mode === 'add_members';

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [isGroupMode, setIsGroupMode] = useState(isAddMembersMode ? true : false);
    const [groupName, setGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [toastMessage, setToastMessage] = useState('');
    const groupNameRef = useRef<TextInput>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 2000);
    };

    const toggleSection = (title: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };

    const isSectionExpanded = (title: string) => {
        // Auto-expand all sections when searching
        if (searchQuery.trim().length > 0) return true;
        return expandedSections.has(title);
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await membersAPI.getList();
            let allMem = response.data;
            if (isAddMembersMode && existingMemberIds) {
                allMem = allMem.filter((m: any) => !existingMemberIds.includes(m.id));
            }
            setMembers(allMem);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter members based on search query
    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase();
        return members.filter(m =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.father_name || '').toLowerCase().includes(q) ||
            (m.contact_1 || '').includes(q) ||
            (m.village_landmark || '').toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    // Group members by village_landmark and sort
    const sectionedMembers = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        filteredMembers.forEach(m => {
            const landmark = m.village_landmark || 'Other';
            if (!groups[landmark]) groups[landmark] = [];
            groups[landmark].push(m);
        });

        // Sort sections alphabetically, "Other" at the end
        return Object.keys(groups)
            .sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return a.localeCompare(b);
            })
            .map(key => ({
                title: key,
                data: groups[key].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
            }));
    }, [filteredMembers]);

    // Flat sorted list (by village_landmark then name)
    const sortedMembersList = useMemo(() => {
        return [...filteredMembers].sort((a, b) => {
            const landmarkA = (a.village_landmark || 'zzz').toLowerCase();
            const landmarkB = (b.village_landmark || 'zzz').toLowerCase();
            if (landmarkA !== landmarkB) return landmarkA.localeCompare(landmarkB);
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [filteredMembers]);

    const toggleSelection = (id: number) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(prev => prev.filter(mid => mid !== id));
        } else {
            if (!isGroupMode) {
                createChat('private', [id]);
            } else {
                setSelectedMembers(prev => [...prev, id]);
            }
        }
    };

    const createChat = async (type: 'private' | 'group', memberIds: number[]) => {
        if (creating) return;
        setCreating(true);

        if (isAddMembersMode && addMembersGroupId) {
            try {
                await chatAPI.addGroupMembers(addMembersGroupId, memberIds);
                Alert.alert('Success', 'Members added successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } catch (error: any) {
                console.error('Add members error:', error);
                const errorMessage = error.response?.data?.message || 'Failed to add members';
                Alert.alert('Error', errorMessage);
            } finally {
                setCreating(false);
            }
            return;
        }

        try {
            const response = await chatAPI.createGroup({
                name: type === 'group' ? groupName : undefined,
                type,
                memberIds
            });

            const chat = response.data;
            let navName = chat.name;
            let navIcon = chat.icon_url;

            if (type === 'private') {
                const otherMember = members.find(m => m.id === memberIds[0]);
                if (otherMember) {
                    navName = otherMember.name;
                    navIcon = otherMember.profile_picture;
                }
            } else {
                navName = groupName;
            }

            navigation.replace('ChatScreen', {
                groupId: chat.id,
                name: navName,
                icon: navIcon
            });
        } catch (error: any) {
            console.error('Create chat error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to start chat';
            Alert.alert('Error', errorMessage);
        } finally {
            setCreating(false);
        }
    };

    // ---- LIST VIEW: row with name, father's name, village landmark ----
    const renderListItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.listItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => toggleSelection(item.id)}
        >
            <Avatar uri={item.profile_picture} name={item.name} size={44} style={styles.listAvatar} />
            <View style={styles.listInfo}>
                <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
                {item.father_name ? (
                    <Text style={[styles.listSub, { color: colors.textSecondary }]}>S/o {item.father_name}</Text>
                ) : null}
                {item.village_landmark ? (
                    <Text style={[styles.listLandmark, { color: colors.primary }]}>📍 {item.village_landmark}</Text>
                ) : null}
            </View>
            {isGroupMode && (
                <View style={[styles.checkbox, {
                    borderColor: colors.primary,
                    backgroundColor: selectedMembers.includes(item.id) ? colors.primary : 'transparent'
                }]}>
                    {selectedMembers.includes(item.id) && <Icon name="check" size={16} color="#fff" />}
                </View>
            )}
        </TouchableOpacity>
    );

    // ---- GRID VIEW: card with profile picture, name, father's name ----
    const renderGridItem = ({ item }: { item: any }) => {
        const isSelected = selectedMembers.includes(item.id);
        return (
            <TouchableOpacity
                style={[styles.gridCard, {
                    backgroundColor: isSelected ? (isDark ? '#1a3a1a' : '#e8f5e9') : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                }]}
                onPress={() => toggleSelection(item.id)}
            >
                {isGroupMode && isSelected && (
                    <View style={[styles.gridCheckBadge, { backgroundColor: colors.primary }]}>
                        <Icon name="check" size={14} color="#fff" />
                    </View>
                )}
                <Avatar uri={item.profile_picture} name={item.name} size={56} style={styles.gridAvatar} />
                <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {item.father_name ? (
                    <Text style={[styles.gridFather, { color: colors.textSecondary }]} numberOfLines={1}>S/o {item.father_name}</Text>
                ) : null}
            </TouchableOpacity>
        );
    };

    // ---- Section header for both views ----
    const renderSectionHeader = ({ section }: { section: { title: string; data: any[] } }) => {
        const expanded = isSectionExpanded(section.title);
        return (
            <TouchableOpacity
                style={[styles.sectionHeader, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}
                onPress={() => toggleSection(section.title)}
                activeOpacity={0.7}
            >
                <Icon name={expanded ? 'expand-more' : 'chevron-right'} size={20} color={colors.primary} />
                <Icon name="location-on" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title}</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({section.data.length})</Text>
            </TouchableOpacity>
        );
    };

    // ---- List item: only render if section is expanded ----
    const renderListItemIfExpanded = ({ item, section }: { item: any; section: { title: string } }) => {
        if (!isSectionExpanded(section.title)) return null;
        return renderListItem({ item });
    };

    // ---- Grid section rendering (grid items inside SectionList) ----
    const renderGridSection = ({ section }: { section: { title: string; data: any[] } }) => {
        if (!isSectionExpanded(section.title)) return null;
        return (
            <View style={styles.gridContainer}>
                {section.data.map((item: any) => (
                    <View key={item.id} style={styles.gridItemWrapper}>
                        {renderGridItem({ item })}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                    {isAddMembersMode ? 'Add Members' : isGroupMode ? 'New Group' : 'Select Member'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Expand/Collapse All */}
                    <TouchableOpacity onPress={() => {
                        if (expandedSections.size >= sectionedMembers.length) {
                            setExpandedSections(new Set());
                        } else {
                            setExpandedSections(new Set(sectionedMembers.map(s => s.title)));
                        }
                    }}>
                        <Icon name={expandedSections.size >= sectionedMembers.length ? 'unfold-less' : 'unfold-more'} size={24} color={colors.primary} />
                    </TouchableOpacity>
                    {/* Grid/List Toggle */}
                    <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                        <Icon name={viewMode === 'list' ? 'grid-view' : 'view-list'} size={24} color={colors.primary} />
                    </TouchableOpacity>
                    {!isAddMembersMode && (
                        <TouchableOpacity onPress={() => {
                            setIsGroupMode(!isGroupMode);
                            setSelectedMembers([]);
                        }}>
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>
                                {isGroupMode ? 'Cancel' : 'Group'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: isDark ? '#222' : '#f5f5f5' }]}>
                <Icon name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search name, father, phone, village..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Group Name Input */}
            {isGroupMode && !isAddMembersMode && (
                <View style={styles.groupInputContainer}>
                    <TextInput
                        ref={groupNameRef}
                        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                        placeholder="Group Name"
                        placeholderTextColor={colors.textSecondary}
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                    {selectedMembers.length > 0 && (
                        <Text style={[styles.selectedCount, { color: colors.primary }]}>
                            {selectedMembers.length} selected
                        </Text>
                    )}
                </View>
            )}

            {/* Content */}
            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
            ) : viewMode === 'list' ? (
                /* ---- LIST VIEW: SectionList sorted by village_landmark ---- */
                <SectionList
                    sections={sectionedMembers}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderListItemIfExpanded}
                    renderSectionHeader={renderSectionHeader}
                    stickySectionHeadersEnabled
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No members found</Text>
                    }
                />
            ) : (
                /* ---- GRID VIEW: SectionList with grid layout grouped by landmark ---- */
                <SectionList
                    sections={sectionedMembers}
                    keyExtractor={item => item.id.toString()}
                    renderItem={() => null}
                    renderSectionHeader={({ section }) => (
                        <>
                            {renderSectionHeader({ section })}
                            {renderGridSection({ section })}
                        </>
                    )}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No members found</Text>
                    }
                />
            )}

            {/* FAB for group creation / adding members */}
            {isGroupMode && selectedMembers.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (!isAddMembersMode && !groupName.trim()) {
                            showToast('Please enter a group name');
                            groupNameRef.current?.focus();
                            return;
                        }
                        createChat('group', selectedMembers);
                    }}
                    disabled={creating}
                >
                    {creating ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={28} color="#fff" />}
                </TouchableOpacity>
            )}

            {/* Self-destruct toast */}
            {toastMessage !== '' && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        justifyContent: 'space-between'
    },
    backBtn: { marginRight: 10 },
    title: { fontSize: 18, fontWeight: 'bold', flex: 1 },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginVertical: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        paddingVertical: 2,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCount: {
        fontSize: 12,
    },

    // List View
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
    },
    listAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#eee' },
    listInfo: { flex: 1 },
    listName: { fontSize: 15, fontWeight: '600' },
    listSub: { fontSize: 12, marginTop: 1 },
    listLandmark: { fontSize: 11, marginTop: 2 },

    // Grid View
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    gridItemWrapper: {
        width: '33.33%',
        padding: 4,
    },
    gridCard: {
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    gridCheckBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    gridAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 6, backgroundColor: '#eee' },
    gridName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    gridFather: { fontSize: 10, textAlign: 'center', marginTop: 1 },

    // Common
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        marginLeft: 'auto',
        justifyContent: 'center',
        alignItems: 'center'
    },
    groupInputContainer: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    selectedCount: {
        fontSize: 14,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 15,
    },
    toast: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    toastText: {
        color: '#fff',
        fontSize: 14,
    },
});
