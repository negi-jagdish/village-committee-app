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
    value: Date | string;
    onChange: (date: Date) => void;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
    mode?: 'date' | 'time' | 'datetime';
}

export default function DatePickerField({
    label,
    value,
    onChange,
    placeholder = 'Select Date',
    minimumDate,
    maximumDate,
    mode = 'date',
}: DatePickerFieldProps) {
    const [open, setOpen] = useState(false);

    // Helper to get Date object
    const getDateObj = (): Date => {
        if (!value) return new Date();
        return typeof value === 'string' ? new Date(value) : value;
    };

    // Format date for display
    const formatDisplayDate = (): string => {
        if (!value) return placeholder;
        const dateObj = typeof value === 'string' ? new Date(value) : value;
        // Check if date is valid
        if (isNaN(dateObj.getTime())) return placeholder;

        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: mode !== 'date' ? '2-digit' : undefined,
            minute: mode !== 'date' ? '2-digit' : undefined,
        };
        return dateObj.toLocaleDateString('en-IN', options);
    };

    const handleConfirm = (date: Date) => {
        setOpen(false);
        onChange(date);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setOpen(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.inputText}>
                    {formatDisplayDate()}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>

            <DatePicker
                modal
                open={open}
                date={getDateObj()}
                mode={mode}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onConfirm={handleConfirm}
                onCancel={() => setOpen(false)}
                title={label || "Select Date"}
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
