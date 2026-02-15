import React, { useEffect, useState } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import api, { transactionsAPI } from '../api/client';
import DatePickerField from '../components/DatePickerField';

interface Member {
    id: number;
    name: string;
    contact_1: string;
}

interface DriveWithStatus {
    id: number;
    title: string;
    title_hi: string;
    amount_per_member: number;
    paid_amount: number;
    pending_amount: number;
    is_paid: boolean;
    // For multi-select
    selected?: boolean;
    customAmount?: string;
}

export default function AddIncomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [members, setMembers] = useState<Member[]>([]);
    const [drives, setDrives] = useState<DriveWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingDrives, setLoadingDrives] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedMember, setSelectedMember] = useState<number | undefined>(undefined);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [referenceId, setReferenceId] = useState('');
    const [description, setDescription] = useState('');

    const [isEditMode, setIsEditMode] = useState(false);
    const transaction = (navigation as any).getState().routes.find((r: any) => r.name === 'AddIncome')?.params?.transaction;

    useEffect(() => {
        if (transaction) {
            setIsEditMode(true);
            setSelectedMember(transaction.member_id);
            setPaymentMethod(transaction.payment_method);
            if (transaction.payment_date) {
                setPaymentDate(transaction.payment_date.split('T')[0]);
            }
            setReferenceId(transaction.reference_id || '');
            setDescription(transaction.description || '');
            navigation.setOptions({ title: 'Edit Income Entry' });
        }
    }, [transaction]);

    useEffect(() => {
        fetchMembers();
    }, []);

    useEffect(() => {
        if (selectedMember) {
            fetchDrivesForMember(selectedMember);
        } else {
            setDrives([]);
        }
    }, [selectedMember]);

    const fetchMembers = async () => {
        try {
            const response = await api.get('/members/list');
            setMembers(response.data);
        } catch (error) {
            console.error('Fetch members error:', error);
            Alert.alert('Error', 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const fetchDrivesForMember = async (memberId: number) => {
        setLoadingDrives(true);
        try {
            const response = await api.get(`/members/${memberId}/drive-status`);
            const params = (navigation as any).getState().routes.find((r: any) => r.name === 'AddIncome')?.params;
            const groupedDrives = params?.groupedDrives || [];
            const isBulkEdit = params?.isBulkEdit;

            const drivesData = response.data.map((d: DriveWithStatus) => {
                let isTargetDrive = false;
                let customAmt = '';

                if (isBulkEdit) {
                    // Check if this drive exists in the groupedDrives list
                    const found = groupedDrives.find((gd: any) => gd.id === d.id);
                    if (found) {
                        isTargetDrive = true;
                        customAmt = found.amount.toString();
                    }
                } else {
                    isTargetDrive = isEditMode && transaction?.drive_id === d.id;
                    customAmt = isTargetDrive ? transaction.amount.toString() : '';
                }

                // If not editing this specific drive, default to pending amount or empty
                if (!customAmt) {
                    customAmt = d.pending_amount > 0 ? d.pending_amount.toString() : '';
                }

                return {
                    ...d,
                    selected: isTargetDrive,
                    customAmount: customAmt,
                };
            });

            setDrives(drivesData);

        } catch (error) {
            console.error('Fetch drives error:', error);
            Alert.alert('Error', 'Failed to load contribution drives');
        } finally {
            setLoadingDrives(false);
        }
    };

    const toggleDrive = (driveId: number) => {
        if (isEditMode) return; // Disable changing drives in edit mode
        setDrives(prev => prev.map(d =>
            d.id === driveId ? { ...d, selected: !d.selected } : d
        ));
    };

    const updateDriveAmount = (driveId: number, amount: string) => {
        setDrives(prev => prev.map(d =>
            d.id === driveId ? { ...d, customAmount: amount } : d
        ));
    };

    const getSelectedDrives = () => drives.filter(d => d.selected);

    const getTotalAmount = () => {
        return getSelectedDrives().reduce((sum, d) => {
            return sum + (parseFloat(d.customAmount || '0') || 0);
        }, 0);
    };

    const handleSubmit = async () => {
        if (!selectedMember) {
            Alert.alert('Error', 'Please select a member');
            return;
        }

        const selectedDrives = getSelectedDrives();
        if (selectedDrives.length === 0) {
            Alert.alert('Error', 'Please select at least one contribution drive');
            return;
        }

        const totalAmount = getTotalAmount();
        if (totalAmount <= 0) {
            Alert.alert('Error', 'Total amount must be greater than 0');
            return;
        }

        // Validate individual amounts
        for (const drive of selectedDrives) {
            const amount = parseFloat(drive.customAmount || '0');
            if (amount <= 0) {
                Alert.alert('Error', `Please enter a valid amount for ${drive.title}`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const params = (navigation as any).getState().routes.find((r: any) => r.name === 'AddIncome')?.params;
            const isBulkEdit = params?.isBulkEdit;
            const paymentId = params?.paymentId || transaction?.payment_id;

            if (isEditMode && transaction) {
                // Update existing transaction
                if (isBulkEdit && paymentId) {
                    // Bulk Update
                    const allocations = selectedDrives.map(d => ({
                        drive_id: d.id === 0 ? null : d.id, // Handle Legacy Due
                        amount: parseFloat(d.customAmount || '0'),
                    }));

                    const formData = new FormData();
                    formData.append('member_id', selectedMember.toString());
                    formData.append('total_amount', totalAmount.toString());
                    formData.append('payment_method', paymentMethod);
                    formData.append('payment_date', paymentDate);
                    if (referenceId) formData.append('reference_id', referenceId);
                    formData.append('allocations', JSON.stringify(allocations));
                    if (description) formData.append('remarks', description);

                    await transactionsAPI.updateBulk(paymentId, formData);
                    Alert.alert('Success', 'Transactions updated successfully!', [
                        { text: 'OK', onPress: () => navigation.navigate('TransactionDetails', { transactionId: transaction.id, refresh: true }) }, // Ideally go back to list
                    ]);

                } else {
                    // Single Update
                    const drive = selectedDrives[0];
                    const formData = new FormData();
                    formData.append('amount', drive.customAmount || '0');
                    formData.append('payment_method', paymentMethod);
                    formData.append('payment_date', paymentDate);
                    if (referenceId) formData.append('reference_id', referenceId);
                    if (description) formData.append('description', description);

                    await transactionsAPI.update(transaction.id, formData);
                    Alert.alert('Success', 'Transaction updated successfully!', [
                        { text: 'OK', onPress: () => navigation.navigate('TransactionDetails', { transactionId: transaction.id, refresh: true }) },
                    ]);
                }

            } else {
                // Create New
                if (selectedDrives.length === 1) {
                    // Single drive - use regular income endpoint
                    const drive = selectedDrives[0];
                    const jsonData: any = {
                        member_id: selectedMember,
                        amount: parseFloat(drive.customAmount || '0'),
                        payment_method: paymentMethod,
                        payment_date: paymentDate,
                    };

                    // Handle Legacy Due (ID 0)
                    if (drive.id !== 0) {
                        jsonData.drive_id = drive.id;
                    }

                    if (referenceId) jsonData.reference_id = referenceId;
                    if (description) jsonData.description = description;

                    await transactionsAPI.createIncome(jsonData);
                } else {
                    // Multi-drive - use bulk income endpoint
                    const allocations = selectedDrives.map(d => ({
                        drive_id: d.id === 0 ? null : d.id,
                        amount: parseFloat(d.customAmount || '0'),
                    }));

                    const jsonData = {
                        member_id: selectedMember,
                        total_amount: totalAmount,
                        payment_method: paymentMethod,
                        payment_date: paymentDate,
                        allocations,
                        remarks: description || undefined,
                    };

                    await transactionsAPI.createBulkIncome(jsonData as any);
                }

                Alert.alert('Success', 'Income entry recorded successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (error: any) {
            console.error('Save income error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save income entry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a5f2a" />
            </View>
        );
    }

    const selectedDrives = getSelectedDrives();
    const totalAmount = getTotalAmount();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                {/* Member Selection */}
                <Text style={styles.label}>Select Member *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedMember}
                        onValueChange={(value) => setSelectedMember(value)}
                        style={styles.picker}
                    >
                        <Picker.Item label="-- Select Member --" value={undefined} />
                        {members.map((member) => (
                            <Picker.Item
                                key={member.id}
                                label={`${member.name} (${member.contact_1})`}
                                value={member.id}
                            />
                        ))}
                    </Picker>
                </View>

                {/* Drive Selection with Status */}
                {selectedMember && (
                    <>
                        <Text style={styles.label}>Select Contribution Drive(s) *</Text>
                        <Text style={styles.helperText}>
                            Tap to select multiple drives. Paid drives are shown in green.
                        </Text>

                        {loadingDrives ? (
                            <ActivityIndicator color="#1a5f2a" style={{ marginVertical: 20 }} />
                        ) : (
                            <View style={styles.drivesContainer}>
                                {drives.map((drive) => (
                                    <View key={drive.id} style={styles.driveItem}>
                                        <TouchableOpacity
                                            style={[
                                                styles.driveCard,
                                                drive.is_paid && styles.driveCardPaid,
                                                drive.selected && styles.driveCardSelected,
                                            ]}
                                            onPress={() => toggleDrive(drive.id)}
                                            disabled={!!drive.is_paid}
                                        >
                                            <View style={styles.driveInfo}>
                                                <Text style={[
                                                    styles.driveTitle,
                                                    drive.is_paid && styles.driveTitlePaid,
                                                ]}>
                                                    {drive.title}
                                                    {drive.is_paid && ' ✓ PAID'}
                                                </Text>
                                                <Text style={styles.driveAmount}>
                                                    Required: ₹{drive.amount_per_member.toLocaleString('en-IN')}
                                                </Text>
                                                {drive.paid_amount > 0 && !drive.is_paid && (
                                                    <Text style={styles.drivePaidInfo}>
                                                        Already paid: ₹{drive.paid_amount.toLocaleString('en-IN')} |
                                                        Pending: ₹{drive.pending_amount.toLocaleString('en-IN')}
                                                    </Text>
                                                )}
                                            </View>
                                            {drive.selected && (
                                                <Text style={styles.checkmark}>✓</Text>
                                            )}
                                        </TouchableOpacity>

                                        {/* Amount input for selected drives */}
                                        {drive.selected && (
                                            <View style={styles.amountInputContainer}>
                                                <Text style={styles.amountLabel}>Amount (₹):</Text>
                                                <TextInput
                                                    style={styles.amountInput}
                                                    value={drive.customAmount}
                                                    onChangeText={(val) => updateDriveAmount(drive.id, val)}
                                                    keyboardType="numeric"
                                                    placeholder={drive.pending_amount.toString()}
                                                />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Payment Method */}
                {selectedDrives.length > 0 && (
                    <>
                        {/* Payment Date */}
                        <DatePickerField
                            label="Payment Date"
                            value={paymentDate}
                            onChange={(date) => setPaymentDate(date.toISOString().split('T')[0])}
                            placeholder="Select Payment Date"
                            maximumDate={new Date()}
                        />

                        <Text style={styles.label}>Payment Method *</Text>
                        <View style={styles.paymentMethods}>
                            {(['cash', 'upi', 'bank_transfer'] as const).map((method) => (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.paymentButton,
                                        paymentMethod === method && styles.paymentButtonActive,
                                    ]}
                                    onPress={() => setPaymentMethod(method)}
                                >
                                    <Text
                                        style={[
                                            styles.paymentButtonText,
                                            paymentMethod === method && styles.paymentButtonTextActive,
                                        ]}
                                    >
                                        {method === 'bank_transfer' ? 'Bank' : method.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Reference ID (for non-cash) */}
                        {paymentMethod !== 'cash' && (
                            <>
                                <Text style={styles.label}>Reference ID / UTR / Cheque No</Text>
                                <TextInput
                                    style={styles.input}
                                    value={referenceId}
                                    onChangeText={setReferenceId}
                                    placeholder="Enter transaction reference..."
                                />
                            </>
                        )}

                        {/* Notes */}
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Any additional notes..."
                            multiline
                            numberOfLines={2}
                        />

                        {/* Total Summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Payment Summary</Text>
                            {selectedDrives.map(d => (
                                <View key={d.id} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{d.title}</Text>
                                    <Text style={styles.summaryValue}>
                                        ₹{(parseFloat(d.customAmount || '0') || 0).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ))}
                            <View style={[styles.summaryRow, styles.summaryTotal]}>
                                <Text style={styles.summaryTotalLabel}>Total</Text>
                                <Text style={styles.summaryTotalValue}>
                                    ₹{totalAmount.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    + Record Income (₹{totalAmount.toLocaleString('en-IN')})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
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
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    drivesContainer: {
        gap: 8,
    },
    driveItem: {
        marginBottom: 4,
    },
    driveCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        flexDirection: 'row',
        alignItems: 'center',
    },
    driveCardPaid: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4caf50',
    },
    driveCardSelected: {
        borderColor: '#1a5f2a',
        backgroundColor: '#f0f7f1',
    },
    driveInfo: {
        flex: 1,
    },
    driveTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    driveTitlePaid: {
        color: '#2e7d32',
    },
    driveAmount: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    drivePaidInfo: {
        fontSize: 11,
        color: '#e65100',
        marginTop: 2,
    },
    checkmark: {
        fontSize: 20,
        color: '#1a5f2a',
        fontWeight: 'bold',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f7f1',
        padding: 8,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        marginTop: -4,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#1a5f2a',
    },
    amountLabel: {
        fontSize: 12,
        color: '#333',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 4,
        padding: 8,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#ddd',
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
        height: 60,
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
        backgroundColor: '#1a5f2a',
        borderColor: '#1a5f2a',
    },
    paymentButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    paymentButtonTextActive: {
        color: '#fff',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#666',
    },
    summaryValue: {
        fontSize: 13,
        color: '#333',
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 8,
        paddingTop: 12,
    },
    summaryTotalLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    submitButton: {
        backgroundColor: '#2e7d32',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
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
