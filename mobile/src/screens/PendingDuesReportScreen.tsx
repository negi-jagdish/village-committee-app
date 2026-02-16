import React, { useEffect, useState } from 'react';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { reportsAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

const NAME_COL_WIDTH = 160;
const DATA_COL_WIDTH = 100;
const TOTAL_COL_WIDTH = 100;

// Transform title - replace Legacy Due with Op Balance
const transformTitle = (title: string) => {
    if (title.toLowerCase().includes('legacy')) {
        return 'Op Balance';
    }
    return title;
};

export default function PendingDuesReportScreen() {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const response = await reportsAPI.getPendingDues();
            setData(response.data);
        } catch (error) {
            console.error('Fetch report error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async () => {
        if (!data) return;
        setGeneratingPdf(true);
        try {
            const { columns, groups, grand_totals } = data;

            // Build HTML Table (HTML content generation logic same as before)
            let html = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { color: #1a5f2a; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                        th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
                        th { background-color: #1a5f2a; color: white; }
                        .group-header { background-color: #e8f5e9; text-align: left; font-weight: bold; color: #2e7d32; }
                        .name-col { text-align: left; font-weight: bold; }
                        .total-col { background-color: #f5f5f5; font-weight: bold; }
                        .grand-total { background-color: #e0e0e0; font-weight: bold; }
                        .pending { color: #d32f2f; font-weight: bold; }
                        .paid { color: #2e7d32; }
                    </style>
                </head>
                <body>
                    <h1>Pending Dues Report</h1>
                    <p style="text-align:center; color:#666;">Generated on ${new Date().toLocaleDateString()}</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                ${columns.map((c: any) => `<th>${c.title}</th>`).join('')}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            groups.forEach((group: any) => {
                html += `
                    <tr>
                        <td colspan="${columns.length + 2}" class="group-header">📍 ${group.landmark}</td>
                    </tr>
                `;
                group.members.forEach((member: any) => {
                    html += `
                        <tr>
                            <td class="name-col">
                                ${member.name}<br/>
                                <span style="font-size:8px; color:#666;">${member.father_name}</span>
                            </td>
                    `;
                    columns.forEach((col: any) => {
                        const pending = member.pending[col.id] || 0;
                        const colorClass = pending > 0 ? 'pending' : 'paid';
                        const display = pending === 0 ? '-' : Math.round(pending);
                        html += `<td class="${colorClass}">${display}</td>`;
                    });
                    html += `<td class="total-col">${Math.round(member.row_total)}</td></tr>`;
                });
            });

            // Grand Total
            html += `
                <tr class="grand-total">
                    <td>GRAND TOTAL</td>
                    ${columns.map((col: any) => `<td>${Math.round(grand_totals[col.id] || 0)}</td>`).join('')}
                    <td>${Math.round(grand_totals.total)}</td>
                </tr>
            `;

            html += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            // Use react-native-print to generate and share PDF
            await RNPrint.print({ html });

        } catch (error: any) {
            console.error('PDF Error:', error);
            Alert.alert('Error', 'Failed to generate PDF: ' + (error.message || 'Unknown error'));
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a5f2a" />
            </View>
        );
    }

    if (!data) return null;

    const { columns, groups, grand_totals } = data;

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return amount === 0 ? '-' : Math.round(amount).toString();
    };

    // Calculate total layout width
    const totalWidth = NAME_COL_WIDTH + (columns.length * DATA_COL_WIDTH) + TOTAL_COL_WIDTH;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.screenHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={[styles.title, { color: colors.primary }]}>Pending Dues Report</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Red: Pending Amount | Green: Paid/No Due</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.pdfButton}
                        onPress={generatePDF}
                        disabled={generatingPdf}
                    >
                        {generatingPdf ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.pdfButtonText}>📄 PDF</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView horizontal style={styles.horizontalScroll}>
                <View>
                    {/* Table Header */}
                    <View style={styles.headerRow}>
                        <View style={[styles.cell, styles.nameCell, styles.headerCell]}>
                            <Text style={styles.headerText}>Member</Text>
                        </View>
                        {columns.map((col: any) => (
                            <View key={col.id} style={[styles.cell, styles.dataCell, styles.headerCell]}>
                                <Text style={styles.headerText} numberOfLines={2}>
                                    {transformTitle(i18n.language === 'hi' && col.title_hi ? col.title_hi : col.title)}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.cell, styles.totalCell, styles.headerCell]}>
                            <Text style={styles.headerText}>Total</Text>
                        </View>
                    </View>

                    {/* Table Body */}
                    <ScrollView style={styles.verticalScroll}>
                        {groups.map((group: any) => (
                            <View key={group.landmark}>
                                {/* Group Header */}
                                <View style={[styles.groupRow, { width: totalWidth, backgroundColor: isDark ? '#1b3a20' : '#e8f5e9', borderBottomColor: isDark ? '#2e7d32' : '#c8e6c9' }]}>
                                    <Text style={[styles.groupTitle, { color: isDark ? '#a5d6a7' : '#2e7d32' }]}>📍 {group.landmark}</Text>
                                </View>

                                {/* Rows */}
                                {group.members.map((member: any) => (
                                    <View key={member.id} style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
                                        <View style={[styles.cell, styles.nameCell, { backgroundColor: isDark ? colors.surface : '#fafafa', borderRightColor: colors.borderLight }]}>
                                            <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
                                            <Text style={[styles.subText, { color: colors.textSecondary }]} numberOfLines={1}>{member.father_name}</Text>
                                        </View>

                                        {columns.map((col: any) => {
                                            const pending = member.pending[col.id] || 0;
                                            const amountColor = pending > 0
                                                ? (isDark ? '#ef5350' : '#d32f2f')
                                                : (isDark ? '#81c784' : '#2e7d32');

                                            return (
                                                <View key={col.id} style={[styles.cell, styles.dataCell, { borderRightColor: colors.borderLight }]}>
                                                    <Text style={[
                                                        styles.amountText,
                                                        { color: amountColor, fontWeight: pending > 0 ? 'bold' : 'normal' }
                                                    ]}>
                                                        {formatCurrency(pending)}
                                                    </Text>
                                                </View>
                                            );
                                        })}

                                        <View style={[styles.cell, styles.totalCell, { backgroundColor: isDark ? colors.surface : '#fafafa' }]}>
                                            <Text style={[styles.amountText, styles.rowTotalText, { color: colors.text }]}>
                                                {formatCurrency(member.row_total)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}

                        {/* Grand Totals Row */}
                        <View style={[styles.row, styles.grandTotalRow, {
                            marginBottom: 40,
                            backgroundColor: isDark ? colors.surface : '#e0e0e0',
                            borderTopColor: colors.textTertiary
                        }]}>
                            <View style={[styles.cell, styles.nameCell, styles.grandTotalCell, {
                                backgroundColor: isDark ? colors.surface : '#e0e0e0',
                                borderRightColor: colors.border
                            }]}>
                                <Text style={[styles.grandTotalLabel, { color: colors.text }]}>GRAND TOTAL</Text>
                            </View>
                            {columns.map((col: any) => (
                                <View key={col.id} style={[styles.cell, styles.dataCell, styles.grandTotalCell, {
                                    backgroundColor: isDark ? colors.surface : '#e0e0e0',
                                    borderRightColor: colors.border
                                }]}>
                                    <Text style={[styles.grandTotalValue, { color: colors.text }]}>
                                        {formatCurrency(grand_totals[col.id])}
                                    </Text>
                                </View>
                            ))}
                            <View style={[styles.cell, styles.totalCell, styles.grandTotalCell, {
                                backgroundColor: isDark ? colors.surface : '#e0e0e0'
                            }]}>
                                <Text style={[styles.grandTotalValue, { color: colors.text }]}>
                                    {formatCurrency(grand_totals.total)}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenHeader: {
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 4,
    },
    horizontalScroll: {
        flex: 1,
    },
    verticalScroll: {
        flexGrow: 1,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#1a5f2a',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    groupRow: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
    },
    groupTitle: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    cell: {
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRightWidth: 1,
    },
    headerCell: {
        alignItems: 'center',
    },
    nameCell: {
        width: NAME_COL_WIDTH,
    },
    dataCell: {
        width: DATA_COL_WIDTH,
        alignItems: 'center',
    },
    totalCell: {
        width: TOTAL_COL_WIDTH,
        alignItems: 'center',
    },
    headerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    nameText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    subText: {
        fontSize: 11,
        color: '#888',
    },
    amountText: {
        fontSize: 13,
        fontWeight: '500',
    },
    pendingText: {
        color: '#d32f2f', // Red for pending
        fontWeight: 'bold',
    },
    paidText: {
        color: '#2e7d32', // Green for done (or dash)
    },
    rowTotalText: {
        fontWeight: 'bold',
        color: '#000',
    },
    grandTotalRow: {
        backgroundColor: '#e0e0e0',
        borderTopWidth: 2,
        borderTopColor: '#999',
    },
    grandTotalCell: {
        backgroundColor: '#e0e0e0',
        borderRightColor: '#ccc',
    },
    grandTotalLabel: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    grandTotalValue: {
        fontWeight: 'bold',
        fontSize: 13,
    },
    pdfButton: {
        backgroundColor: '#d32f2f', // PDF red color
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    pdfButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
