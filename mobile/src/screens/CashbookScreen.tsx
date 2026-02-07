import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { dashboardAPI } from '../api/client';
import { Picker } from '@react-native-picker/picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface CashbookEntry {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    member_name: string;
    payment_method: string;
    created_at: string;
    running_balance: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CashbookScreen(props: any) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<CashbookEntry[]>([]);
    const [balances, setBalances] = useState({ cash: 0, bank: 0 });
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [filter, setFilter] = useState<'all' | 'cash' | 'bank'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [monthFilter, setMonthFilter] = useState<number | undefined>(undefined);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
    const [showFilters, setShowFilters] = useState(false);

    const fetchData = async () => {
        try {
            const response = await dashboardAPI.getCashbook({ limit: 100 });
            setEntries(response.data.entries || []);
            setBalances(response.data.balances || { cash: 0, bank: 0 });
        } catch (error) {
            console.error('Cashbook fetch error:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const clearFilters = () => {
        setTypeFilter('all');
        setMonthFilter(undefined);
        setYearFilter(new Date().getFullYear());
    };

    const hasActiveFilters = typeFilter !== 'all' || monthFilter !== undefined || yearFilter !== new Date().getFullYear();

    // Key fix: actually filter entries based on tabs and new filters
    const filteredEntries = entries.filter(e => {
        // 1. Tab Filter (Cash vs Bank)
        if (filter === 'cash' && e.payment_method !== 'cash') return false;
        if (filter === 'bank' && !['bank_transfer', 'upi', 'cheque'].includes(e.payment_method)) return false;

        // 2. Type Filter
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;

        // 3. Date Filter
        const date = new Date(e.created_at);
        if (yearFilter && date.getFullYear() !== yearFilter) return false;
        if (monthFilter !== undefined && date.getMonth() !== monthFilter) return false;

        return true;
    });

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderEntry = ({ item }: { item: CashbookEntry }) => (
        <View style={styles.entryCard}>
            <View style={styles.entryLeft}>
                <View style={[
                    styles.typeIndicator,
                    { backgroundColor: item.type === 'income' ? '#e8f5e9' : '#ffebee' }
                ]}>
                    <Text style={{ fontSize: 16 }}>
                        {item.type === 'income' ? '↓' : '↑'}
                    </Text>
                </View>
                <View style={styles.entryInfo}>
                    <Text style={styles.entryDesc}>
                        {item.member_name || item.description}
                    </Text>
                    <Text style={styles.entryMeta}>
                        {formatDate(item.created_at)} • {item.payment_method?.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.entryRight}>
                <Text style={[
                    styles.entryAmount,
                    { color: item.type === 'income' ? '#2e7d32' : '#d32f2f' }
                ]}>
                    {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
                <Text style={styles.runningBalance}>
                    Bal: {formatCurrency(item.running_balance)}
                </Text>
            </View>
        </View>
    );

    const user = useSelector((state: RootState) => state.auth.user);
    const isPresident = user?.role === 'president';

    return (
        <View style={styles.container}>
            {/* Balance Summary */}
            <View style={styles.balanceHeader}>
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Cash Balance</Text>
                    <Text style={[styles.balanceAmount, { color: '#2e7d32' }]}>
                        {formatCurrency(balances.cash)}
                    </Text>
                </View>
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Bank Balance</Text>
                    <Text style={[styles.balanceAmount, { color: '#1565c0' }]}>
                        {formatCurrency(balances.bank)}
                    </Text>
                </View>
            </View>

            {/* Admin Actions */}
            {isPresident && (
                <TouchableOpacity
                    style={styles.adminActionBtn}
                    onPress={() => (props.navigation as any).navigate('Transactions', { screen: 'AddOpeningBalance' })}
                >
                    <Text style={styles.adminActionText}>+ Set Opening Balance</Text>
                </TouchableOpacity>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'cash', 'bank'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
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
                        🔍 Filters {hasActiveFilters && `(${[typeFilter !== 'all', monthFilter !== undefined].filter(Boolean).length})`}
                    </Text>
                </TouchableOpacity>

                {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                        <Text style={styles.clearFiltersText}>✕ Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderEntry}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No entries found</Text>
                    </View>
                }
            />

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                animationType="slide"
                transparent
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Cashbook</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    balanceHeader: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
    },
    balanceCard: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 0,
        backgroundColor: '#fff',
        gap: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    filterTabActive: {
        backgroundColor: '#1a5f2a',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    entryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    entryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    entryInfo: {
        flex: 1,
    },
    entryDesc: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    entryMeta: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    entryRight: {
        alignItems: 'flex-end',
    },
    entryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    runningBalance: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    // Filter Styles
    filterBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
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
    // Modal Styles
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
    adminActionBtn: {
        backgroundColor: '#e8f5e9',
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#c8e6c9',
    },
    adminActionText: {
        color: '#1a5f2a',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
