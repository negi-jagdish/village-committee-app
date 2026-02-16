import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { dashboardAPI } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import { getImageUrl } from '../utils/imageHelper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const { width } = Dimensions.get('window');




export default function DashboardScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const language = useSelector((state: RootState) => state.app.language);
    const [data, setData] = useState<DashboardData | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const summaryRes = await dashboardAPI.getSummary();
            setData(summaryRes.data);
        } catch (error) {
            console.error('Dashboard summary fetch error:', error);
        }
    };

    useEffect(() => {
        fetchData();
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

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const QuickActionButton = ({ icon, label, onPress, color }: any) => (
        <TouchableOpacity style={styles.quickActionBtn} onPress={onPress}>
            <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
                <Icon name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
    );

    const StatCard = ({ label, value, icon, color, bgColor }: any) => (
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
                <Icon name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );


    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>
                        {language === 'hi' ? 'नमस्ते' : 'Welcome'},
                    </Text>
                    <Text style={styles.userNameText}>{user?.name}!</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    {/* @ts-ignore: user might have profile_picture_url from some responses, but typed as profile_picture */}
                    {(user?.profile_picture || user?.profile_picture_url) ? (
                        <Image
                            /* @ts-ignore: image helper returns string | undefined which is valid */
                            source={{ uri: getImageUrl(user?.profile_picture || user?.profile_picture_url) }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={[styles.profileImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Icon name="person" size={24} color="#757575" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Total Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: isDark ? '#1b3a20' : '#1a5f2a' }]}>
                <View>
                    <Text style={styles.balanceLabel}>{t('dashboard.netWorth')}</Text>
                    <Text style={styles.balanceAmount}>
                        {data ? formatCurrency(data.totalBalance) : '---'}
                    </Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceDetailsRow}>
                    <View style={styles.balanceDetailItem}>
                        <Icon name="attach-money" size={16} color="#bfe6c8" />
                        <Text style={styles.balanceDetailLabel}>{t('dashboard.cash')}</Text>
                        <Text style={styles.balanceDetailValue}>
                            {data ? formatCurrency(data.balances.cash) : '-'}
                        </Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.balanceDetailItem}>
                        <Icon name="account-balance" size={16} color="#bfe6c8" />
                        <Text style={styles.balanceDetailLabel}>{t('dashboard.bank')}</Text>
                        <Text style={styles.balanceDetailValue}>
                            {data ? formatCurrency(data.balances.bank) : '-'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                <QuickActionButton
                    icon="menu-book"
                    label={t('dashboard.viewCashbook')}
                    color="#4caf50"
                    onPress={() => navigation.navigate('Cashbook')}
                />
                <QuickActionButton
                    icon="bar-chart"
                    label={t('dashboard.viewReports')}
                    color="#2196f3"
                    onPress={() => navigation.navigate('Reports')}
                />
                {user?.role === 'president' && (
                    <QuickActionButton
                        icon="people"
                        label={t('dashboard.viewMembers')}
                        color="#ff9800"
                        onPress={() => navigation.navigate('MembersList')}
                    />
                )}
                {(user?.role === 'president' || user?.role === 'cashier') && (
                    <QuickActionButton
                        icon="volunteer-activism"
                        label={t('dashboard.viewDrives')}
                        color="#9c27b0"
                        onPress={() => navigation.navigate('Drives')}
                    />
                )}
            </View>

            {/* Pending Approvals Banner */}
            {user?.role === 'president' && (data?.pendingExpenses ?? 0) > 0 && (
                <TouchableOpacity
                    style={[styles.warningCard, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
                    onPress={() => navigation.navigate('Approvals')}
                >
                    <Icon name="warning" size={20} color={colors.warning} />
                    <Text style={[styles.warningText, { color: colors.warning }]}>
                        {data?.pendingExpenses} requests waiting for approval
                    </Text>
                    <Icon name="chevron-right" size={20} color={colors.warning} />
                </TouchableOpacity>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <StatCard
                    label={t('dashboard.totalIncome')}
                    value={data ? formatCurrency(data.totalIncome) : '---'}
                    icon="arrow-downward"
                    color="#2e7d32"
                    bgColor="#e8f5e9"
                />
                <StatCard
                    label={t('dashboard.totalExpenses')}
                    value={data ? formatCurrency(data.totalExpenses) : '---'}
                    icon="arrow-upward"
                    color="#c62828"
                    bgColor="#ffebee"
                />
                <StatCard
                    label={t('dashboard.activeDrives')}
                    value={data?.activeDrives ?? '-'}
                    icon="flag"
                    color="#f57f17"
                    bgColor="#fff3e0"
                />
                <StatCard
                    label={t('dashboard.totalMembers')}
                    value={data?.totalMembers ?? '-'}
                    icon="group"
                    color="#1a5f2a"
                    bgColor="#e8f5e9"
                />
            </View>

            {/* Recent Transactions */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.recentTransactions')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>View All</Text>
                    </TouchableOpacity>
                </View>

                {data?.recentTransactions?.map((tx) => (
                    <TouchableOpacity
                        key={tx.id}
                        style={[styles.transactionItem, { backgroundColor: colors.card }]}
                        onPress={() => navigation.navigate('TransactionDetails', { transactionId: tx.id })}
                    >
                        {/* Avatar / Icon */}
                        <View style={styles.txIconContainer}>
                            {tx.type === 'income' && tx.profile_picture_url ? (
                                <Image
                                    source={{ uri: getImageUrl(tx.profile_picture_url) }}
                                    style={styles.txAvatar}
                                />
                            ) : (
                                <View style={[
                                    styles.txIconPlaceholder,
                                    { backgroundColor: tx.type === 'income' ? '#e8f5e9' : '#ffebee' }
                                ]}>
                                    <Icon
                                        name={tx.type === 'income' ? 'arrow-downward' : 'arrow-upward'}
                                        size={18}
                                        color={tx.type === 'income' ? '#2e7d32' : '#c62828'}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Details */}
                        <View style={styles.txDetails}>
                            <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                                {tx.type === 'income'
                                    ? (tx.member_name || 'Income')
                                    : (language === 'hi' && tx.description_hi ? tx.description_hi : tx.description)
                                }
                            </Text>
                            <Text style={[styles.txSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                {tx.type === 'income' ? (tx.drive_title || 'Contribution') : 'Expense'} • {new Date(tx.created_at).toLocaleDateString()}
                            </Text>
                        </View>

                        {/* Amount */}
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[
                                styles.txAmount,
                                { color: tx.type === 'income' ? '#2e7d32' : '#c62828' }
                            ]}>
                                {tx.type === 'income' ? '+' : '-'}₹{tx.amount}
                            </Text>
                            {tx.status === 'pending' && (
                                <Text style={{ fontSize: 10, color: '#f57f17', fontWeight: 'bold' }}>PENDING</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 14,
        color: '#666', // Adjust based on theme in component? No, use textSecondary
        // Wait, Header is outside colored card now? Yes.
    },
    userNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333', // Need dynamic
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
    },
    balanceCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    balanceLabel: {
        color: '#bfe6c8',
        fontSize: 14,
        fontWeight: '500',
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 4,
    },
    balanceDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 16,
    },
    balanceDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceDetailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    balanceDetailLabel: {
        color: '#bfe6c8',
        fontSize: 12,
    },
    balanceDetailValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 'auto',
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 12,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // or space-evenly
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    quickActionBtn: {
        alignItems: 'center',
        width: width / 4 - 20,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        width: (width - 36) / 2, // (width - padding*2 - gap) / 2
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 1, // subtle shadow
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
    },
    section: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    txIconContainer: {
        marginRight: 12,
    },
    txAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    txIconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txDetails: {
        flex: 1,
    },
    txTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    txSubtitle: {
        fontSize: 12,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 24,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
});
