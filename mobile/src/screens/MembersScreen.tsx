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
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMembers = async () => {
        try {
            const response = await membersAPI.getAll();
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

    const renderMember = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={styles.memberCard}
            onPress={() => navigation.navigate('MemberDetails', { memberId: item.id })}
        >
            <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberFather}>S/o {item.father_name}</Text>
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
            <View style={styles.contactRow}>
                <Text style={styles.contactText}>📞 {item.contact_1}</Text>
                <Text style={styles.landmarkText}>📍 {item.village_landmark}</Text>
            </View>
        </TouchableOpacity>
    );

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'president': return '#d32f2f'; // Red
            case 'secretary': return '#1976d2'; // Blue
            case 'cashier': return '#f57c00';   // Orange
            case 'reporter': return '#7b1fa2';  // Purple
            default: return '#1a5f2a';          // Green (Member)
        }
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('common.search') + " (Name, Contact)"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={getFilteredMembers()}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMember}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No members found</Text>
                        </View>
                    ) : null
                }
            />

            {/* Add Member Button */}
            {(user?.role === 'president' || user?.role === 'secretary') && (
                <TouchableOpacity
                    style={styles.fab}
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
        backgroundColor: '#f5f5f5',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
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
        color: '#999',
        padding: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    memberCard: {
        backgroundColor: '#fff',
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
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    memberFather: {
        fontSize: 13,
        color: '#666',
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
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    contactText: {
        fontSize: 13,
        color: '#333',
    },
    landmarkText: {
        fontSize: 13,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1a5f2a',
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
