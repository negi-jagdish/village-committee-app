import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api, { transactionsAPI } from '../api/client';

interface TransactionDetail {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    description_hi: string;
    member_name: string;
    drive_title: string;
    drive_title_hi: string;
    payment_method: string;
    screenshot_url: string | null;
    status: string;
    created_at: string;
    approved_at: string | null;
    created_by_name: string;
    approved_by_name: string | null;
    edit_allowed: boolean;
    payment_date: string | null;
    reference_id: string | null;
    payment_id?: number | null;
}

export default function TransactionDetailsScreen({ route, navigation }: any) {
    const { transactionId } = route.params;
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);
    const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransaction();
    }, [transactionId]);

    const fetchTransaction = async () => {
        try {
            const response = await api.get(`/transactions/${transactionId}`);
            setTransaction(response.data);
        } catch (error) {
            console.error('Fetch transaction error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await transactionsAPI.delete(transactionId);
                            Alert.alert('Success', 'Transaction deleted successfully', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete transaction');
                        }
                    }
                }
            ]
        );
    };

    const handleAllowEdit = async () => {
        try {
            await transactionsAPI.allowEdit(transactionId);
            Alert.alert('Success', 'Edit allowed for cashier');
            fetchTransaction();
        } catch (error) {
            Alert.alert('Error', 'Failed to allow edit');
        }
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#2e7d32';
            case 'pending': return '#e65100';
            case 'rejected': return '#c62828';
            default: return '#666';
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            cash: 'Cash',
            bank_transfer: 'Bank Transfer',
            upi: 'UPI',
            cheque: 'Cheque',
        };
        return labels[method] || method;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a5f2a" />
            </View>
        );
    }

    if (!transaction) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Transaction not found</Text>
            </View>
        );
    }

    const isIncome = transaction.type === 'income';

    return (
        <ScrollView style={styles.container}>
            {/* Header Card */}
            <View style={[styles.headerCard, { backgroundColor: isIncome ? '#e8f5e9' : '#ffebee' }]}>
                <Text style={styles.typeLabel}>
                    {isIncome ? '↓ INCOME' : '↑ EXPENSE'}
                </Text>
                <Text style={[styles.amount, { color: isIncome ? '#2e7d32' : '#d32f2f' }]}>
                    {isIncome ? '+' : '-'}{formatCurrency(route.params.groupedTotal || transaction.amount)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                    <Text style={styles.statusText}>{transaction.status.toUpperCase()}</Text>
                </View>
            </View>

            {/* Details Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Details</Text>

                {/* Member (for income) */}
                {isIncome && !!transaction.member_name && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Member</Text>
                        <Text style={styles.detailValue}>{transaction.member_name}</Text>
                    </View>
                )}

                {/* Drives (for income) */}
                {isIncome && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                            Contribution Drive{route.params?.isBulk ? 's' : ''}
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            {route.params?.isBulk && Array.isArray(route.params?.groupedDrives) ? (
                                route.params.groupedDrives.map((d: any, index: number) => (
                                    <Text key={index} style={styles.detailValue}>
                                        {d.title}
                                    </Text>
                                ))
                            ) : (
                                <Text style={styles.detailValue}>
                                    {language === 'hi' && transaction.drive_title_hi
                                        ? transaction.drive_title_hi
                                        : transaction.drive_title}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Description (for expense) */}
                {!isIncome && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>
                            {language === 'hi' && transaction.description_hi
                                ? transaction.description_hi
                                : transaction.description}
                        </Text>
                    </View>
                )}

                {/* Payment Method */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>
                        {getPaymentMethodLabel(transaction.payment_method)}
                    </Text>
                </View>

                {/* Reference ID */}
                {!!transaction.reference_id && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reference ID / Ref</Text>
                        <Text style={styles.detailValue}>{transaction.reference_id}</Text>
                    </View>
                )}

                {/* Payment Date */}
                {!!transaction.payment_date && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Date</Text>
                        <Text style={styles.detailValue}>{formatDate(transaction.payment_date)}</Text>
                    </View>
                )}

                {/* Created By */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recorded By</Text>
                    <Text style={styles.detailValue}>{transaction.created_by_name}</Text>
                </View>

                {/* Created At */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recorded On</Text>
                    <Text style={styles.detailValue}>{formatDate(transaction.created_at)}</Text>
                </View>

                {/* Approved By (if approved) */}
                {!!transaction.approved_by_name && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Approved By</Text>
                        <Text style={styles.detailValue}>{transaction.approved_by_name}</Text>
                    </View>
                )}

                {/* Approved At */}
                {!!transaction.approved_at && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Approved On</Text>
                        <Text style={styles.detailValue}>{formatDate(transaction.approved_at)}</Text>
                    </View>
                )}
            </View>

            {/* Screenshot (if available) */}
            {!!transaction.screenshot_url && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Proof</Text>
                    <Image
                        source={{ uri: `http://10.0.2.2:3000${transaction.screenshot_url}` }}
                        style={styles.screenshot}
                        resizeMode="contain"
                    />
                </View>
            )}

            {/* Transaction ID */}
            <View style={styles.footer}>
                <Text style={styles.transactionId}>Transaction ID: #{transaction.id}</Text>
            </View>

            {/* Actions for President */}
            {user?.role === 'president' && transaction.status !== 'rejected' && (
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDelete}
                    >
                        <Text style={styles.deleteButtonText}>Delete Entry</Text>
                    </TouchableOpacity>

                    {!transaction.edit_allowed && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={handleAllowEdit}
                        >
                            <Text style={styles.editButtonText}>Allow Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Actions for Cashier */}
            {user?.role === 'cashier' && (
                <View style={styles.actionContainer}>
                    {/* Allow deleting rejected transactions */}
                    {transaction.status === 'rejected' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleDelete}
                        >
                            <Text style={styles.deleteButtonText}>Delete Rejected Entry</Text>
                        </TouchableOpacity>
                    )}

                    {/* Show edit button if allowed */}
                    {!!transaction.edit_allowed && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => {
                                if (transaction.type === 'income') {
                                    navigation.navigate('AddIncome', {
                                        transaction: {
                                            ...transaction,
                                            // Ensure payment_id is passed if it exists
                                            payment_id: transaction.payment_id || (route.params.isBulk ? 'bulk' : undefined)
                                        },
                                        isBulkEdit: route.params.isBulk,
                                        paymentId: transaction.payment_id,
                                        groupedDrives: route.params.groupedDrives
                                    });
                                } else {
                                    navigation.navigate('AddExpense', { transaction });
                                }
                            }}
                        >
                            <Text style={styles.editButtonText}>Edit Transaction</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
    headerCard: {
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    amount: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        flex: 1,
        textAlign: 'right',
    },
    screenshot: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    footer: {
        alignItems: 'center',
        padding: 20,
    },
    transactionId: {
        fontSize: 12,
        color: '#999',
    },
    actionContainer: {
        padding: 16,
        gap: 12,
    },
    actionButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
    },
    deleteButton: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
    },
    deleteButtonText: {
        color: '#ef4444',
        fontWeight: 'bold',
    },
    editButton: {
        backgroundColor: '#e0f2f1',
        borderColor: '#009688',
    },
    editButtonText: {
        color: '#009688',
        fontWeight: 'bold',
    },
});
