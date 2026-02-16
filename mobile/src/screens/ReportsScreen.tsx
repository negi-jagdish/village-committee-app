import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

export default function ReportsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();

    const reports = [
        {
            id: 'pending-dues',
            title: 'Pending Dues Report',
            description: 'Member-wise pending contributions grouped by area.',
            target: 'PendingDuesReport'
        },
        {
            id: 'payments-received',
            title: 'Payments Received Report',
            description: 'Member-wise payments received for drives. Shows paid, waived, and partial amounts.',
            target: 'PaymentsReport'
        },
        // Future reports can go here
    ];

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.primary }]}>Available Reports</Text>
            </View>

            <View style={styles.list}>
                {reports.map((report) => (
                    <TouchableOpacity
                        key={report.id}
                        style={[styles.card, { backgroundColor: colors.card }]}
                        onPress={() => navigation.navigate(report.target)}
                    >
                        <View style={styles.cardContent}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{report.title}</Text>
                            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{report.description}</Text>
                        </View>
                        <Text style={[styles.arrow, { color: colors.textTertiary }]}>→</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
    },
    arrow: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});
