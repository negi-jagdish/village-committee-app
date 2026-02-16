import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

export default function AddExpenseScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionHi, setDescriptionHi] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [referenceId, setReferenceId] = useState('');

    const [isEditMode, setIsEditMode] = useState(false);
    const transaction = (navigation as any).getState().routes.find((r: any) => r.name === 'AddExpense')?.params?.transaction;

    useEffect(() => {
        if (transaction) {
            setIsEditMode(true);
            setAmount(transaction.amount.toString());
            setDescription(transaction.description);
            setDescriptionHi(transaction.description_hi || '');
            setPaymentMethod(transaction.payment_method);
            if (transaction.payment_date) {
                setPaymentDate(transaction.payment_date.split('T')[0]);
            }
            setReferenceId(transaction.reference_id || '');
            navigation.setOptions({ title: 'Edit Expense Entry' });
        }
    }, [transaction]);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('description', description);
            if (descriptionHi) formData.append('description_hi', descriptionHi);
            formData.append('payment_method', paymentMethod);
            formData.append('payment_date', paymentDate);
            if (referenceId) formData.append('reference_id', referenceId);

            if (isEditMode && transaction) {
                await transactionsAPI.update(transaction.id, formData);
                Alert.alert(
                    'Success',
                    'Expense entry updated successfully!',
                    [{ text: 'OK', onPress: () => navigation.navigate('TransactionDetails', { transactionId: transaction.id, refresh: true }) }]
                );
            } else {
                await transactionsAPI.createExpense(formData);
                Alert.alert(
                    'Success',
                    'Expense entry created! It will be visible after President approval.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error: any) {
            console.error('Save expense error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save expense entry');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.form}>
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: colors.warningBg, borderLeftColor: colors.warning }]}>
                    <Text style={[styles.infoText, { color: colors.warning }]}>
                        ⚠️ Expense entries require President approval before they are finalized.
                    </Text>
                </View>

                {/* Amount */}
                <Text style={[styles.label, { color: colors.text }]}>Amount (₹) *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="Enter expense amount"
                    placeholderTextColor={colors.inputPlaceholder}
                />

                {/* Description (English) */}
                <Text style={[styles.label, { color: colors.text }]}>Description (English) *</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What is this expense for?"
                    placeholderTextColor={colors.inputPlaceholder}
                    multiline
                    numberOfLines={3}
                />

                {/* Description (Hindi) */}
                <Text style={[styles.label, { color: colors.text }]}>Description (Hindi) - Optional</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    value={descriptionHi}
                    onChangeText={setDescriptionHi}
                    placeholder="खर्च का विवरण (हिंदी में)"
                    placeholderTextColor={colors.inputPlaceholder}
                    multiline
                    numberOfLines={3}
                />

                {/* Payment Date */}
                <Text style={[styles.label, { color: colors.text }]}>Payment Date</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    value={paymentDate}
                    onChangeText={setPaymentDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="numbers-and-punctuation"
                />

                {/* Payment Method */}
                {/* Payment Method */}
                <Text style={[styles.label, { color: colors.text }]}>Payment Method *</Text>
                <View style={styles.paymentMethods}>
                    {(['cash', 'upi', 'bank_transfer'] as const).map((method) => (
                        <TouchableOpacity
                            key={method}
                            style={[
                                styles.paymentButton,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                paymentMethod === method && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                            onPress={() => setPaymentMethod(method)}
                        >
                            <Text
                                style={[
                                    styles.paymentButtonText,
                                    { color: colors.textSecondary },
                                    paymentMethod === method && { color: colors.primaryText },
                                ]}
                            >
                                {method === 'bank_transfer' ? 'Bank' : method.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Reference ID */}
                {paymentMethod !== 'cash' && (
                    <>
                        <Text style={[styles.label, { color: colors.text }]}>Reference ID / UTR / Cheque No</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                            value={referenceId}
                            onChangeText={setReferenceId}
                            placeholder="Enter transaction reference..."
                            placeholderTextColor={colors.inputPlaceholder}
                        />
                    </>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>+ Submit for Approval</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    form: {
        padding: 16,
    },
    infoBanner: {
        backgroundColor: '#fff3e0',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    infoText: {
        color: '#e65100',
        fontSize: 13,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    paymentMethods: {
        flexDirection: 'row',
        gap: 8,
    },
    paymentButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    paymentButtonActive: {
        backgroundColor: '#d32f2f',
        borderColor: '#d32f2f',
    },
    paymentButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    paymentButtonTextActive: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: '#d32f2f',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
