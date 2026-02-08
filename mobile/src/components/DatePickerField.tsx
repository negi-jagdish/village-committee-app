import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import DatePicker from 'react-native-date-picker';

interface DatePickerFieldProps {
    label?: string;
    value: string; // YYYY-MM-DD format
    onChange: (dateString: string) => void;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
}

export default function DatePickerField({
    label,
    value,
    onChange,
    placeholder = 'Select Date',
    minimumDate,
    maximumDate,
}: DatePickerFieldProps) {
    const [open, setOpen] = useState(false);

    // Parse the string value to Date object
    const getDateValue = (): Date => {
        if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date();
    };

    // Format Date to YYYY-MM-DD string
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format date for display (DD MMM YYYY)
    const formatDisplayDate = (): string => {
        if (!value) return placeholder;
        const date = getDateValue();
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-IN', options);
    };

    const handleConfirm = (date: Date) => {
        setOpen(false);
        onChange(formatDate(date));
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setOpen(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.inputText, !value && styles.placeholderText]}>
                    {formatDisplayDate()}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>

            <DatePicker
                modal
                open={open}
                date={getDateValue()}
                mode="date"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onConfirm={handleConfirm}
                onCancel={() => setOpen(false)}
                title="Select Date"
                confirmText="Confirm"
                cancelText="Cancel"
                theme="light"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    inputText: {
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
    },
    calendarIcon: {
        fontSize: 18,
        marginLeft: 8,
    },
});
