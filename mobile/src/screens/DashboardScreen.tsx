import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { dashboardAPI, pollsAPI } from '../api/client'; // Import pollsAPI
import PollCard from '../components/PollCard'; // Import PollCard
import Icon from 'react-native-vector-icons/MaterialIcons';

// ... existing interfaces ...
interface DashboardData {
    balances: { cash: number; bank: number };
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    pendingExpenses: number;
    activeDrives: number;
    totalMembers: number;
    recentTransactions: any[];
}

export default function DashboardScreen({ navigation }: any) {
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const language = useSelector((state: RootState) => state.app.language);
    const [data, setData] = useState<DashboardData | null>(null);
    const [polls, setPolls] = useState<any[]>([]); // Polls state
    const [refreshing, setRefreshing] = useState(false);

    // Check role
    const canCreatePoll = user?.role === 'president' || user?.role === 'secretary';

    const fetchData = async () => {
        try {
            const [summaryRes, pollsRes] = await Promise.all([
                dashboardAPI.getSummary(),
                pollsAPI.getActive()
            ]);
            setData(summaryRes.data);
            setPolls(pollsRes.data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        }
    };

    useEffect(() => {
        fetchData();

        // Add focus listener to refresh when returning
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // ... formatCurrency ...
    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Polls Widget */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Polls</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {canCreatePoll && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreatePoll')}
                            style={styles.createPollBtn}
                        >
                            <Icon name="add" size={20} color="#fff" />
                            <Text style={styles.createPollText}>New</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('PollHistory')}>
                        <Text style={styles.viewAllText}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {polls.length > 0 ? (
                <View>
                    {polls.slice(0, 3).map(poll => (
                        <PollCard key={poll.id} poll={poll} />
                    ))}
                </View>
            ) : (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No active polls.</Text>
                </View>
            )}

            {/* Existing Dashboard Content */}


            {/* Welcome Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>
                        {language === 'hi' ? 'नमस्ते' : 'Welcome'}, {user?.name}!
                    </Text>
                    <Text style={styles.roleText}>
                        {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                    </Text>
                </View>
            </View>

            {/* Balance Cards */}
            <View style={styles.balanceContainer}>
                <View style={styles.totalBalanceCard}>
                    <Text style={styles.totalBalanceLabel}>{t('dashboard.totalBalance')}</Text>
                    <Text style={styles.totalBalanceAmount}>
                        {data ? formatCurrency(data.totalBalance) : '---'}
                    </Text>
                </View>

                <View style={styles.balanceRow}>
                    <View style={[styles.balanceCard, { backgroundColor: '#e8f5e9' }]}>
                        <Text style={styles.balanceLabel}>{t('dashboard.cashBalance')}</Text>
                        <Text style={[styles.balanceAmount, { color: '#2e7d32' }]}>
                            {data ? formatCurrency(data.balances.cash) : '---'}
                        </Text>
                    </View>
                    <View style={[styles.balanceCard, { backgroundColor: '#e3f2fd' }]}>
                        <Text style={styles.balanceLabel}>{t('dashboard.bankBalance')}</Text>
                        <Text style={[styles.balanceAmount, { color: '#1565c0' }]}>
                            {data ? formatCurrency(data.balances.bank) : '---'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                        {data ? formatCurrency(data.totalIncome) : '---'}
                    </Text>
                    <Text style={styles.statLabel}>{t('dashboard.totalIncome')}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#d32f2f' }]}>
                        {data ? formatCurrency(data.totalExpenses) : '---'}
                    </Text>
                    <Text style={styles.statLabel}>{t('dashboard.totalExpenses')}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{data?.activeDrives ?? '---'}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.activeDrives')}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{data?.totalMembers ?? '---'}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.totalMembers')}</Text>
                </View>
            </View>

            {/* Pending Approvals (President only) */}
            {user?.role === 'president' && data?.pendingExpenses > 0 && (
                <TouchableOpacity
                    style={styles.pendingCard}
                    onPress={() => navigation.navigate('Approvals')}
                >
                    <Text style={styles.pendingText}>
                        {data.pendingExpenses} {t('dashboard.pendingApprovals')}
                    </Text>
                    <Text style={styles.pendingArrow}>→</Text>
                </TouchableOpacity>
            )}

            {/* View Cashbook Button */}
            <TouchableOpacity
                style={styles.cashbookButton}
                onPress={() => navigation.navigate('Cashbook')}
            >
                <Text style={styles.cashbookButtonText}>{t('dashboard.viewCashbook')}</Text>
            </TouchableOpacity>



            {/* Reports Button (Visible to All) */}
            <TouchableOpacity
                style={[styles.cashbookButton, { backgroundColor: '#455a64', marginTop: 8 }]}
                onPress={() => navigation.navigate('Reports')}
            >
                <Text style={styles.cashbookButtonText}>View Reports</Text>
            </TouchableOpacity>

            {/* Recent Transactions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions')}</Text>
                {data?.recentTransactions?.slice(0, 5).map((tx, index) => (
                    <View key={index} style={styles.transactionItem}>
                        <View style={styles.transactionLeft}>
                            <Text style={styles.transactionType}>
                                {tx.type === 'income' ? '↓' : '↑'} {tx.type === 'income' ? 'Income' : 'Expense'}
                            </Text>
                            <Text style={styles.transactionDesc}>
                                {tx.member_name || tx.description}
                            </Text>
                        </View>
                        <Text style={[
                            styles.transactionAmount,
                            { color: tx.type === 'income' ? '#2e7d32' : '#d32f2f' }
                        ]}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#1a5f2a',
        padding: 20,
        paddingTop: 40,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    roleText: {
        color: '#bfe6c8',
        fontSize: 14,
        marginTop: 4,
    },
    balanceContainer: {
        padding: 16,
    },
    totalBalanceCard: {
        backgroundColor: '#1a5f2a',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 12,
    },
    totalBalanceLabel: {
        color: '#bfe6c8',
        fontSize: 14,
    },
    totalBalanceAmount: {
        color: '#fff',
        fontSize: 36,
        fontWeight: 'bold',
        marginTop: 8,
    },
    balanceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    balanceCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 12,
        color: '#666',
    },
    balanceAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        gap: 8,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    pendingCard: {
        backgroundColor: '#fff3e0',
        margin: 16,
        marginTop: 8,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    pendingText: {
        color: '#e65100',
        fontWeight: '600',
    },
    pendingArrow: {
        color: '#e65100',
        fontSize: 20,
    },
    cashbookButton: {
        backgroundColor: '#1a5f2a',
        margin: 16,
        marginTop: 8,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    cashbookButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    transactionItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionLeft: {
        flex: 1,
    },
    transactionType: {
        fontSize: 12,
        color: '#666',
    },
    transactionDesc: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    createPollBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 12,
    },
    createPollText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 4,
        fontSize: 12,
    },
    viewAllText: {
        color: '#2196F3',
        fontWeight: 'bold',
        fontSize: 12,
    },
    emptyCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic',
    },
});
