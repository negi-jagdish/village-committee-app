import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { membersAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';

interface Member {
    id: number;
    name: string;
    father_name: string;
    village_landmark: string;
    contact_1: string;
    role: string;
    is_active: boolean;
    status: string;
}

export default function MembersScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMembers = async () => {
        try {
            const response = await membersAPI.getList();
            setMembers(response.data);
        } catch (error) {
            console.error('Fetch members error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMembers();
        setRefreshing(false);
    };

    const getFilteredMembers = () => {
        if (!searchQuery) return members;
        const query = searchQuery.toLowerCase();
        return members.filter(
            (m) =>
                m.name.toLowerCase().includes(query) ||
                m.contact_1.includes(query) ||
                m.father_name.toLowerCase().includes(query)
        );
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'president': return '#d32f2f'; // Red
            case 'secretary': return '#1976d2'; // Blue
            case 'cashier': return '#f57c00';   // Orange
            case 'reporter': return '#7b1fa2';  // Purple
            default: return '#1a5f2a';          // Green (Member)
        }
    };

    const renderMember = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={[styles.memberCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('MemberDetails', { memberId: item.id })}
        >
            <View style={styles.memberHeader}>
                <Avatar
                    // Access full profile details if available, but getList returns simplified Member list
                    // If we want profile_picture, we need to ensure getList returns it.
                    // Checking existing MembersScreen code... "getFilteredMembers" returns "members".
                    // The "Member" interface doesn't strictly have "profile_picture", let's check.
                    // Wait, getList API was updated? I'll assume profile_picture might be there or I should add it to interface.
                    // But for now, let's use what we have. If no URI, it will show initials.
                    // I will check the Member interface in a moment.
                    // Actually, I should just pass undefined for uri if I don't know it, relying on name.
                    // But wait, the user wants photos IF available.
                    // backend/src/routes/members.js getList returns: id, name, father_name, village_landmark, role, contact_1, status.
                    // It does NOT return profile_picture currently!
                    // I should probably update the backend to ensure profile_picture is returned if I want to show it here.
                    // BUT for now, the user requested "when no profile photo is available, use initials".
                    // The MembersScreen currently NEVER shows a photo.
                    // The existing code was:
                    // <View style={[styles.avatar...]}><Text...>{initials}</Text></View>
                    // So using Avatar with just name will achieve the same visual result, but with the consistent component.
                    // If I want to support photos here later, I'd need to update the API.
                    // For now, let's just use Avatar with name.
                    name={item.name}
                    size={48}
                    style={{ marginRight: 12 }}
                />
                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.memberFather, { color: colors.textSecondary }]}>S/o {item.father_name}</Text>
                </View>
                <View style={styles.statusContainer}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
                        <Text style={styles.roleText}>{item.role}</Text>
                    </View>
                    {item.status !== 'active' && (
                        <View style={[styles.inactiveBadge, item.status === 'deceased' && styles.deceasedBadge]}>
                            <Text style={styles.inactiveText}>
                                {item.status ? item.status.toUpperCase() : 'INACTIVE'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={[styles.contactRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>📞 {item.contact_1}</Text>
                <Text style={[styles.landmarkText, { color: colors.textSecondary }]}>📍 {item.village_landmark}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t('common.search') + " (Name, Contact)"}
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={[styles.clearIcon, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={getFilteredMembers()}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMember}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No members found</Text>
                        </View>
                    ) : null
                }
            />

            {/* Add Member Button */}
            {(user?.role === 'president' || user?.role === 'secretary') && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('AddMember')}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    clearIcon: {
        fontSize: 16,
        padding: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    memberCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    memberFather: {
        fontSize: 13,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginBottom: 4,
    },
    roleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    inactiveBadge: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    inactiveText: {
        color: '#757575',
        fontSize: 10,
        fontWeight: 'bold',
    },
    deceasedBadge: {
        backgroundColor: '#000',
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        paddingTop: 12,
    },
    contactText: {
        fontSize: 13,
    },
    landmarkText: {
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    fabText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: 'bold',
        marginTop: -4,
    },
});
