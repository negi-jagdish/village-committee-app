import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../api/client';
import { Picker } from '@react-native-picker/picker';

export default function AddOpeningBalanceScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'cash' | 'bank'>('cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [existingBalances, setExistingBalances] = useState<{ cash: any, bank: any }>({ cash: null, bank: null });
    const [isEdit, setIsEdit] = useState(false);

    useEffect(() => {
        fetchOpeningBalances();
    }, []);

    // When type changes, update form with existing data if present
    useEffect(() => {
        const existing = existingBalances[type];
        if (existing) {
            setAmount(existing.amount.toString());
            setDate(existing.payment_date ? existing.payment_date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setIsEdit(true);
        } else {
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setIsEdit(false);
        }
    }, [type, existingBalances]);

    const fetchOpeningBalances = async () => {
        try {
            const response = await transactionsAPI.getOpeningBalance();
            const balances: { cash: any, bank: any } = { cash: null, bank: null };

            if (Array.isArray(response.data)) {
                response.data.forEach((tx: any) => {
                    const type = tx.payment_method === 'cash' ? 'cash' : 'bank';
                    balances[type] = tx;
                });
            }

            setExistingBalances(balances);
        } catch (error) {
            console.error('Fetch Opening Balance error:', error);
        }
    };

    const handleSubmit = async () => {
        if (!amount) {
            Alert.alert('Error', 'Amount is required');
            return;
        }

        setLoading(true);
        try {
            if (isEdit) {
                // Update existing
                await transactionsAPI.updateOpeningBalance({
                    amount: parseFloat(amount),
                    payment_method: type === 'cash' ? 'cash' : 'bank_transfer',
                    payment_date: date,
                });
                Alert.alert('Success', 'Opening Balance updated successfully');
            } else {
                // Create new
                await transactionsAPI.createIncome({
                    amount: parseFloat(amount),
                    description: 'Opening Balance',
                    description_hi: 'प्रारंभिक शेष',
                    payment_method: type === 'cash' ? 'cash' : 'bank_transfer',
                    payment_date: date,
                    member_id: null,
                });
                Alert.alert('Success', 'Opening Balance added successfully');
            }
            // Refresh data
            await fetchOpeningBalances();
        } catch (error: any) {
            console.error('Save Opening Balance error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save opening balance';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    Use this form to set or update the initial Cash or Bank balance.
                    {isEdit ? '\n\nExisting balance found. Updating will adjust the current ledger.' : '\n\nThis will create a system transaction to adjust the ledger.'}
                </Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Account Type *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={type}
                        onValueChange={setType}
                    >
                        <Picker.Item label="Cash (Hand)" value="cash" />
                        <Picker.Item label="Bank Account" value="bank" />
                    </Picker>
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>{isEdit ? 'Update Opening Amount (₹) *' : 'Opening Amount (₹) *'}</Text>
                <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="e.g. 50000"
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                />
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>
                        {isEdit ? 'Update Opening Balance' : 'Add Opening Balance'}
                    </Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    infoBox: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    infoText: {
        color: '#0d47a1',
        fontSize: 14,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa',
    },
    submitBtn: {
        backgroundColor: '#1a5f2a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
