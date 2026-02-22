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

    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        form: {
            padding: 16,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
            marginTop: 16,
        },
        input: {
            borderRadius: 8,
            borderWidth: 1,
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
            borderRadius: 8,
            padding: 12,
            marginTop: 20,
        },
        infoTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
        },
        infoText: {
            fontSize: 13,
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

    // Dynamic styles based on theme
    const themeStyles = {
        label: { color: colors.text },
        input: {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.inputText
        },
        infoBox: {
            backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#e3f2fd',
            borderWidth: isDark ? 1 : 0,
            borderColor: 'rgba(33, 150, 243, 0.3)'
        },
        infoTitle: { color: isDark ? '#64b5f6' : '#1565c0' }, // Light blue in dark mode
        infoText: { color: isDark ? '#bbdefb' : '#1976d2' }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.form}>
                {/* Title English */}
                <Text style={[styles.label, themeStyles.label]}>Drive Title (English) *</Text>
                <TextInput
                    style={[styles.input, themeStyles.input]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Temple Renovation Fund"
                    placeholderTextColor={colors.inputPlaceholder}
                />

                {/* Title Hindi */}
                <Text style={[styles.label, themeStyles.label]}>Drive Title (Hindi)</Text>
                <TextInput
                    style={[styles.input, themeStyles.input]}
                    value={titleHi}
                    onChangeText={setTitleHi}
                    placeholder="e.g., मंदिर नवीनीकरण निधि"
                    placeholderTextColor={colors.inputPlaceholder}
                />

                {/* Description English */}
                <Text style={[styles.label, themeStyles.label]}>Description (English)</Text>
                <TextInput
                    style={[styles.input, styles.textArea, themeStyles.input]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description of the contribution drive..."
                    placeholderTextColor={colors.inputPlaceholder}
                    multiline
                    numberOfLines={3}
                />

                {/* Description Hindi */}
                <Text style={[styles.label, themeStyles.label]}>Description (Hindi)</Text>
                <TextInput
                    style={[styles.input, styles.textArea, themeStyles.input]}
                    value={descriptionHi}
                    onChangeText={setDescriptionHi}
                    placeholder="योगदान अभियान का संक्षिप्त विवरण..."
                    placeholderTextColor={colors.inputPlaceholder}
                    multiline
                    numberOfLines={3}
                />

                {/* Amount per Member */}
                <Text style={[styles.label, themeStyles.label]}>Amount Per Member (₹) *</Text>
                <TextInput
                    style={[styles.input, themeStyles.input]}
                    value={amountPerMember}
                    onChangeText={setAmountPerMember}
                    keyboardType="numeric"
                    placeholder="e.g., 500"
                    placeholderTextColor={colors.inputPlaceholder}
                />

                {/* Date Range */}
                <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                        <DatePickerField
                            label="Start Date *"
                            value={startDate}
                            onChange={(date) => setStartDate(formatDateForInput(date))}
                            placeholder="Select Start Date"
                        />
                    </View>
                    <View style={styles.dateField}>
                        <DatePickerField
                            label="End Date (Optional)"
                            value={endDate}
                            onChange={(date) => setEndDate(formatDateForInput(date))}
                            placeholder="Select End Date"
                        />
                    </View>
                </View>

                {/* Info Box */}
                <View style={[styles.infoBox, themeStyles.infoBox]}>
                    <Text style={[styles.infoTitle, themeStyles.infoTitle]}>📢 Note</Text>
                    <Text style={[styles.infoText, themeStyles.infoText]}>
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
    },
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderRadius: 8,
        borderWidth: 1,
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
        borderRadius: 8,
        padding: 12,
        marginTop: 20,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
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

