import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { drivesAPI } from '../api/client';
import DatePickerField from '../components/DatePickerField';
import { useTheme } from '../theme/ThemeContext';

export default function CreateDriveScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const [title, setTitle] = useState('');
    const [titleHi, setTitleHi] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionHi, setDescriptionHi] = useState('');
    const [amountPerMember, setAmountPerMember] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Format date for display (YYYY-MM-DD)
    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Set default dates
    React.useEffect(() => {
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        setStartDate(formatDateForInput(today));
        setEndDate(formatDateForInput(nextMonth));
    }, []);

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter drive title in English');
            return;
        }
        if (!amountPerMember || parseFloat(amountPerMember) <= 0) {
            Alert.alert('Error', 'Please enter valid amount per member');
            return;
        }
        if (!startDate) {
            Alert.alert('Error', 'Please enter start date');
            return;
        }

        setSubmitting(true);
        try {
            await drivesAPI.create({
                title: title.trim(),
                title_hi: titleHi.trim() || title.trim(),
                description: description.trim(),
                description_hi: descriptionHi.trim() || description.trim(),
                amount_per_member: parseFloat(amountPerMember),
                start_date: startDate,
                end_date: endDate || null,
            });

            Alert.alert('Success', 'Contribution drive created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            console.error('Create drive error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to create drive');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.form}>
                {/* Title English */}
                <Text style={styles.label}>Drive Title (English) *</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Temple Renovation Fund"
                />

                {/* Title Hindi */}
                <Text style={styles.label}>Drive Title (Hindi)</Text>
                <TextInput
                    style={styles.input}
                    value={titleHi}
                    onChangeText={setTitleHi}
                    placeholder="e.g., मंदिर नवीनीकरण निधि"
                />

                {/* Description English */}
                <Text style={styles.label}>Description (English)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description of the contribution drive..."
                    multiline
                    numberOfLines={3}
                />

                {/* Description Hindi */}
                <Text style={styles.label}>Description (Hindi)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={descriptionHi}
                    onChangeText={setDescriptionHi}
                    placeholder="योगदान अभियान का संक्षिप्त विवरण..."
                    multiline
                    numberOfLines={3}
                />

                {/* Amount per Member */}
                <Text style={styles.label}>Amount Per Member (₹) *</Text>
                <TextInput
                    style={styles.input}
                    value={amountPerMember}
                    onChangeText={setAmountPerMember}
                    keyboardType="numeric"
                    placeholder="e.g., 500"
                />

                {/* Date Range */}
                <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                        <DatePickerField
                            label="Start Date *"
                            value={startDate}
                            onChange={setStartDate}
                            placeholder="Select Start Date"
                        />
                    </View>
                    <View style={styles.dateField}>
                        <DatePickerField
                            label="End Date (Optional)"
                            value={endDate}
                            onChange={setEndDate}
                            placeholder="Select End Date"
                        />
                    </View>
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>📢 Note</Text>
                    <Text style={styles.infoText}>
                        Once created, all active members will be expected to contribute the specified amount.
                        The drive will appear in the Contribution Drives list for everyone.
                    </Text>
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
                        <Text style={styles.submitButtonText}>+ Create Contribution Drive</Text>
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
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateField: {
        flex: 1,
    },
    infoBox: {
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        padding: 12,
        marginTop: 20,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1565c0',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#1976d2',
        lineHeight: 18,
    },
    submitButton: {
        backgroundColor: '#1a5f2a',
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
