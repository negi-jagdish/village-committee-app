import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Picker } from '@react-native-picker/picker';
import { RootState } from '../store';
import api, { transactionsAPI, drivesAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

interface Transaction {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    description_hi: string;
    member_id: number;
    member_name: string;
    drive_id: number;
    drive_title: string;
    drive_title_hi: string;
    payment_id: number | null;
    payment_method: string;
    status: string;
    created_at: string;
    created_by_name: string;
}

interface GroupedTransaction {
    key: string;
    type: 'income' | 'expense';
    totalAmount: number;
    member_name: string;
    drives: { id: number; title: string; amount: number }[];
    payment_method: string;
    status: string;
    created_at: string;
    created_by_name: string;
    transactions: Transaction[];
    isBulk: boolean;
}

interface Member {
    id: number;
    name: string;
    contact_1: string;
}

interface Drive {
    id: number;
    title: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TransactionsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [memberFilter, setMemberFilter] = useState<number | undefined>(undefined);
    const [driveFilter, setDriveFilter] = useState<number | undefined>(undefined);
    const [monthFilter, setMonthFilter] = useState<number | undefined>(undefined);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

    // Filter options
    const [members, setMembers] = useState<Member[]>([]);
    const [drives, setDrives] = useState<Drive[]>([]);

    const isCashier = user?.role === 'cashier';

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [typeFilter, memberFilter, driveFilter, monthFilter, yearFilter])
    );

    const fetchFilterOptions = async () => {
        try {
            const [membersRes, drivesRes] = await Promise.all([
                api.get('/members/list'),
                drivesAPI.getAll(),
            ]);
            setMembers(membersRes.data);
            setDrives(drivesRes.data);
        } catch (error) {
            console.log('Filter options not available');
        }
    };

    const fetchTransactions = async () => {
        try {
            const params: any = { limit: 100 };
            if (typeFilter !== 'all') params.type = typeFilter;
            if (memberFilter) params.member_id = memberFilter;
            if (driveFilter) params.drive_id = driveFilter;

            const response = await transactionsAPI.getAll(params);
            let data = response.data;

            // Apply date filter on client side
            if (monthFilter !== undefined) {
                data = data.filter((t: Transaction) => {
                    const date = new Date(t.created_at);
                    return date.getMonth() === monthFilter && date.getFullYear() === yearFilter;
                });
            }

            setTransactions(data);
            groupTransactions(data);
        } catch (error) {
            console.error('Fetch transactions error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Group transactions by payment_id (bulk payments) or individual
    const groupTransactions = (txns: Transaction[]) => {
        const grouped: Map<string, GroupedTransaction> = new Map();

        txns.forEach(t => {
            // Key: payment_id for bulk, or individual transaction id
            const key = t.payment_id ? `payment_${t.payment_id}` : `single_${t.id}`;

            if (grouped.has(key)) {
                const existing = grouped.get(key)!;
                existing.totalAmount += parseFloat(String(t.amount));
                if (t.drive_title) {
                    existing.drives.push({
                        id: t.drive_id,
                        title: language === 'hi' && t.drive_title_hi ? t.drive_title_hi : t.drive_title,
                        amount: parseFloat(String(t.amount)),
                    });
                }
                existing.transactions.push(t);
            } else {
                grouped.set(key, {
                    key,
                    type: t.type,
                    totalAmount: parseFloat(String(t.amount)),
                    member_name: t.member_name,
                    drives: t.drive_title ? [{
                        id: t.drive_id,
                        title: language === 'hi' && t.drive_title_hi ? t.drive_title_hi : t.drive_title,
                        amount: parseFloat(String(t.amount)),
                    }] : [],
                    payment_method: t.payment_method,
                    status: t.status,
                    created_at: t.created_at,
                    created_by_name: t.created_by_name,
                    transactions: [t],
                    isBulk: !!t.payment_id,
                });
            }
        });

        const sorted = Array.from(grouped.values()).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setGroupedTransactions(sorted);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTransactions();
        setRefreshing(false);
    };

    const clearFilters = () => {
        setTypeFilter('all');
        setMemberFilter(undefined);
        setDriveFilter(undefined);
        setMonthFilter(undefined);
        setYearFilter(new Date().getFullYear());
    };

    const hasActiveFilters = typeFilter !== 'all' || memberFilter !== undefined || driveFilter !== undefined || monthFilter !== undefined;

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        });
    };

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            cash: t('transactions.cash'),
            bank_transfer: t('transactions.bankTransfer'),
            upi: t('transactions.upi'),
            cheque: t('transactions.cheque'),
        };
        return labels[method] || method;
    };

    const renderTransaction = ({ item }: { item: GroupedTransaction }) => (
        <TouchableOpacity
            style={styles.transactionCard}
            onPress={() => {
                navigation.navigate('TransactionDetails', {
                    transactionId: item.transactions[0].id,
                    isBulk: item.isBulk,
                    groupedTotal: item.totalAmount,
                    groupedDrives: item.drives
                });
            }}
        >
            <View style={styles.transactionIcon}>
                <Text style={styles.transactionIconText}>
                    {item.type === 'income' ? '↓' : '↑'}
                </Text>
            </View>

            <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                    <Text style={styles.transactionTitle}>
                        {item.type === 'income'
                            ? item.member_name
                            : (item.transactions[0]?.description || 'Expense')}
                        {item.isBulk && (
                            <Text style={styles.bulkBadge}> ({item.drives.length} drives)</Text>
                        )}
                    </Text>
                    <Text style={[
                        styles.transactionAmount,
                        { color: item.type === 'income' ? '#2e7d32' : '#d32f2f' }
                    ]}>
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.totalAmount)}
                    </Text>
                </View>

                {/* Show drives for income */}
                {item.type === 'income' && item.drives.length > 0 && (
                    <Text style={styles.transactionDrives} numberOfLines={2}>
                        {item.drives.map(d => d.title).join(', ')}
                    </Text>
                )}

                <View style={styles.transactionMeta}>
                    <Text style={styles.transactionSubtitle}>
                        {getPaymentMethodLabel(item.payment_method)} • {formatDate(item.created_at)}
                    </Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === 'approved' ? '#e8f5e9' : '#fff3e0' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: item.status === 'approved' ? '#2e7d32' : '#e65100' }
                        ]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Filter Modal
    const renderFilterModal = () => (
        <Modal
            visible={showFilters}
            animationType="slide"
            transparent
            onRequestClose={() => setShowFilters(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Transactions</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {/* Type Filter */}
                        <Text style={styles.filterLabel}>Transaction Type</Text>
                        <View style={styles.typeFilters}>
                            {(['all', 'income', 'expense'] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.typeButton,
                                        typeFilter === type && styles.typeButtonActive,
                                    ]}
                                    onPress={() => setTypeFilter(type)}
                                >
                                    <Text style={[
                                        styles.typeButtonText,
                                        typeFilter === type && styles.typeButtonTextActive,
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Member Filter */}
                        <Text style={styles.filterLabel}>Member</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={memberFilter}
                                onValueChange={setMemberFilter}
                                style={styles.picker}
                            >
                                <Picker.Item label="All Members" value={undefined} />
                                {members.map(m => (
                                    <Picker.Item key={m.id} label={m.name} value={m.id} />
                                ))}
                            </Picker>
                        </View>

                        {/* Drive Filter */}
                        <Text style={styles.filterLabel}>Contribution Drive</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={driveFilter}
                                onValueChange={setDriveFilter}
                                style={styles.picker}
                            >
                                <Picker.Item label="All Drives" value={undefined} />
                                {drives.map(d => (
                                    <Picker.Item key={d.id} label={d.title} value={d.id} />
                                ))}
                            </Picker>
                        </View>

                        {/* Month/Year Filter */}
                        <Text style={styles.filterLabel}>Month</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={monthFilter}
                                onValueChange={setMonthFilter}
                                style={styles.picker}
                            >
                                <Picker.Item label="All Months" value={undefined} />
                                {MONTHS.map((month, index) => (
                                    <Picker.Item key={index} label={month} value={index} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.filterLabel}>Year</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={yearFilter}
                                onValueChange={setYearFilter}
                                style={styles.picker}
                            >
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <Picker.Item key={year} label={year.toString()} value={year} />
                                ))}
                            </Picker>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                            <Text style={styles.clearButtonText}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Transaction Type Tabs */}
            <View style={styles.tabBar}>
                {(['all', 'income', 'expense'] as const).map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.tab,
                            typeFilter === type && styles.tabActive,
                        ]}
                        onPress={() => setTypeFilter(type)}
                    >
                        <Text style={[
                            styles.tabText,
                            typeFilter === type && styles.tabTextActive,
                        ]}>
                            {type === 'all' ? 'All' : type === 'income' ? '↓ Income' : '↑ Expenses'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                <TouchableOpacity
                    style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                    onPress={() => setShowFilters(true)}
                >
                    <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
                        🔍 More Filters {hasActiveFilters && `(${[memberFilter, driveFilter, monthFilter !== undefined].filter(Boolean).length})`}
                    </Text>
                </TouchableOpacity>

                {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                        <Text style={styles.clearFiltersText}>✕ Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1a5f2a" />
                </View>
            ) : (
                <FlatList
                    data={groupedTransactions}
                    keyExtractor={(item) => item.key}
                    renderItem={renderTransaction}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📊</Text>
                            <Text style={styles.emptyText}>No transactions found</Text>
                        </View>
                    }
                />
            )}

            {/* Cashier Action Buttons */}
            {isCashier && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#2e7d32' }]}
                        onPress={() => navigation.navigate('AddIncome')}
                    >
                        <Text style={styles.actionButtonText}>+ {t('transactions.addIncome')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#d32f2f' }]}
                        onPress={() => navigation.navigate('AddExpense')}
                    >
                        <Text style={styles.actionButtonText}>+ {t('transactions.addExpense')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {renderFilterModal()}
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#1a5f2a',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#999',
    },
    tabTextActive: {
        color: '#1a5f2a',
        fontWeight: '600',
    },
    filterBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    filterButtonActive: {
        backgroundColor: '#1a5f2a',
    },
    filterButtonText: {
        color: '#666',
        fontSize: 14,
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    clearFiltersBtn: {
        marginLeft: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    clearFiltersText: {
        color: '#d32f2f',
        fontSize: 13,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        elevation: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionIconText: {
        fontSize: 18,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    bulkBadge: {
        fontSize: 11,
        color: '#1a5f2a',
        fontWeight: 'normal',
    },
    transactionDrives: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    transactionMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    transactionSubtitle: {
        fontSize: 12,
        color: '#999',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    actionButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalClose: {
        fontSize: 20,
        color: '#999',
        padding: 4,
    },
    modalBody: {
        padding: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
    },
    typeFilters: {
        flexDirection: 'row',
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: '#1a5f2a',
    },
    typeButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    pickerContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    clearButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#1a5f2a',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
