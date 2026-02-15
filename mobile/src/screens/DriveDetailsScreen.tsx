import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { membersAPI } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { drivesAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

interface Drive {
    id: number;
    title: string;
    title_hi: string;
    description: string;
    description_hi: string;
    amount_per_member: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
}

interface MemberStatus {
    id: number;
    name: string;
    father_name: string;
    contact_1: string;
    amount_required: number;
    paid_amount: number;
    pending_amount: number;
    status: 'paid' | 'partial' | 'pending';
    is_waived: boolean;
}

export default function DriveDetailsScreen({ route }: any) {
    const { colors, isDark } = useTheme();
    const { driveId } = route.params;
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);

    const [drive, setDrive] = useState<Drive | null>(null);
    const [members, setMembers] = useState<MemberStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');

    const fetchDriveDetails = async () => {
        try {
            const response = await drivesAPI.getById(driveId);
            setDrive(response.data.drive);
            setMembers(response.data.members);
        } catch (error) {
            console.error('Fetch drive details error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDriveDetails();
    }, [driveId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDriveDetails();
        setRefreshing(false);
    };

    const handleWaive = (memberId: number, isWaived: boolean) => {
        const action = isWaived ? 'Un-Waive' : 'Waive';
        const message = isWaived
            ? 'Are you sure you want to remove the waiver for this member?'
            : 'Are you sure you want to waive the contribution for this member?';

        Alert.alert(
            `Confirm ${action}`,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            if (isWaived) {
                                await membersAPI.removeWaiver(memberId, driveId);
                            } else {
                                await membersAPI.waive(memberId, driveId, 'Waived by President');
                            }
                            fetchDriveDetails(); // Refresh list
                        } catch (error: any) {
                            console.error('Waive error:', error);
                            Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to update waiver status');
                        }
                    }
                }
            ]
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const getFilteredMembers = () => {
        if (filter === 'all') return members;
        return members.filter(m => m.status === filter);
    };

    const getStatusCounts = () => {
        return {
            all: members.length,
            paid: members.filter(m => m.status === 'paid').length,
            partial: members.filter(m => m.status === 'partial').length,
            pending: members.filter(m => m.status === 'pending').length,
        };
    };

    const renderMember = ({ item }: { item: MemberStatus }) => (
        <View style={styles.memberCard}>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberFather}>S/o {item.father_name}</Text>
                <Text style={styles.memberContact}>{item.contact_1}</Text>
            </View>
            <View style={styles.paymentInfo}>
                <View style={[
                    styles.statusBadge,
                    item.status === 'paid' && styles.statusPaid,
                    item.status === 'partial' && styles.statusPartial,
                    item.status === 'pending' && styles.statusPending,
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.status === 'paid' && styles.statusTextPaid,
                        item.status === 'partial' && styles.statusTextPartial,
                        item.status === 'pending' && styles.statusTextPending,
                    ]}>
                        {item.status === 'paid' ? '✓ Paid' :
                            item.status === 'partial' ? 'Partial' : 'Pending'}
                    </Text>
                </View>
                <Text style={styles.paidAmount}>
                    {formatCurrency(item.paid_amount)} / {formatCurrency(item.amount_required)}
                </Text>
                {item.pending_amount > 0 && !item.is_waived && (
                    <Text style={styles.pendingAmount}>
                        Due: {formatCurrency(item.pending_amount)}
                    </Text>
                )}
                {item.is_waived && (
                    <Text style={styles.waivedText}>WAIVED</Text>
                )}
                {user?.role === 'president' && (item.status !== 'paid' || item.is_waived) && (
                    <TouchableOpacity
                        style={styles.waiveButton}
                        onPress={() => handleWaive(item.id, item.is_waived)}
                    >
                        <Text style={styles.waiveButtonText}>
                            {item.is_waived ? 'Un-Waive' : 'Waive'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a5f2a" />
            </View>
        );
    }

    const statusCounts = getStatusCounts();
    const filteredMembers = getFilteredMembers();

    // Calculate totals
    const totalCollected = members.reduce((sum, m) => sum + m.paid_amount, 0);
    const totalTarget = members.reduce((sum, m) => sum + m.amount_required, 0);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Drive Summary */}
            {drive && (
                <View style={styles.summaryCard}>
                    <Text style={styles.driveTitle}>
                        {language === 'hi' && drive.title_hi ? drive.title_hi : drive.title}
                    </Text>
                    {drive.description && (
                        <Text style={styles.driveDescription}>
                            {language === 'hi' && drive.description_hi ? drive.description_hi : drive.description}
                        </Text>
                    )}
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Target</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(totalTarget)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Collected</Text>
                            <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>
                                {formatCurrency(totalCollected)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Pending</Text>
                            <Text style={[styles.summaryValue, { color: '#d32f2f' }]}>
                                {formatCurrency(totalTarget - totalCollected)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
                {(['all', 'paid', 'partial', 'pending'] as const).map((status) => (
                    <TouchableOpacity
                        key={status}
                        style={[
                            styles.filterTab,
                            filter === status && styles.filterTabActive,
                        ]}
                        onPress={() => setFilter(status)}
                    >
                        <Text style={[
                            styles.filterTabText,
                            filter === status && styles.filterTabTextActive,
                        ]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Members List */}
            <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMember}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No members in this category</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    driveTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    driveDescription: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#999',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    filterTabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    filterTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#1a5f2a',
    },
    filterTabText: {
        fontSize: 11,
        color: '#999',
        fontWeight: '500',
    },
    filterTabTextActive: {
        color: '#1a5f2a',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    memberCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    memberFather: {
        fontSize: 12,
        color: '#666',
    },
    memberContact: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    paymentInfo: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4,
    },
    statusPaid: {
        backgroundColor: '#e8f5e9',
    },
    statusPartial: {
        backgroundColor: '#fff3e0',
    },
    statusPending: {
        backgroundColor: '#ffebee',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusTextPaid: {
        color: '#2e7d32',
    },
    statusTextPartial: {
        color: '#e65100',
    },
    statusTextPending: {
        color: '#d32f2f',
    },
    paidAmount: {
        fontSize: 12,
        color: '#666',
    },
    pendingAmount: {
        fontSize: 11,
        color: '#d32f2f',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
    },
    waiveButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    waiveButtonText: {
        fontSize: 11,
        color: '#333',
        fontWeight: 'bold',
    },
    waivedText: {
        fontSize: 12,
        color: '#9c27b0', // Purple
        fontWeight: 'bold',
        marginTop: 2,
        marginBottom: 4,
    },
});
