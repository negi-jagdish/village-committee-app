import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

interface PendingExpense {
    id: number;
    amount: number;
    description: string;
    description_hi: string;
    payment_method: string;
    created_at: string;
    created_by_name: string;
}

export default function ApprovalsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [expenses, setExpenses] = useState<PendingExpense[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            const response = await transactionsAPI.getAll({ type: 'expense', status: 'pending' });
            setExpenses(response.data);
        } catch (error) {
            console.error('Fetch approvals error:', error);
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

    const handleApprove = async (id: number) => {
        Alert.alert(
            'Approve Expense',
            'Are you sure you want to approve this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        setProcessing(id);
                        try {
                            await transactionsAPI.approve(id, 'approved');
                            fetchData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to approve expense');
                        } finally {
                            setProcessing(null);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (id: number) => {
        Alert.alert(
            'Reject Expense',
            'Are you sure you want to reject this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(id);
                        try {
                            await transactionsAPI.approve(id, 'rejected');
                            fetchData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reject expense');
                        } finally {
                            setProcessing(null);
                        }
                    },
                },
            ]
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderExpense = ({ item }: { item: PendingExpense }) => (
        <View style={[styles.expenseCard, { backgroundColor: colors.card }]}>
            <View style={styles.expenseHeader}>
                <Text style={[styles.expenseAmount, { color: colors.error }]}>{formatCurrency(item.amount)}</Text>
                <Text style={[styles.expenseDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
            </View>

            <Text style={[styles.expenseDesc, { color: colors.text }]}>{item.description}</Text>
            <Text style={[styles.expenseMeta, { color: colors.textSecondary }]}>
                By: {item.created_by_name} • {item.payment_method?.toUpperCase()}
            </Text>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleReject(item.id)}
                    disabled={processing === item.id}
                >
                    <Text style={[styles.rejectButtonText, { color: colors.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleApprove(item.id)}
                    disabled={processing === item.id}
                >
                    <Text style={[styles.approveButtonText, { color: '#fff' }]}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={expenses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderExpense}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>✓</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending approvals</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    expenseCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
        elevation: 2,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    expenseAmount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    expenseDate: {
        fontSize: 12,
    },
    expenseDesc: {
        fontSize: 16,
        marginBottom: 4,
    },
    expenseMeta: {
        fontSize: 12,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    rejectButton: {
        // backgroundColor set in render
    },
    rejectButtonText: {
        fontWeight: '600',
    },
    approveButton: {
        // backgroundColor set in render
    },
    approveButtonText: {
        fontWeight: '600',
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
    },
});
