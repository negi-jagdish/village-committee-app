import React, { useEffect, useState } from 'react';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { reportsAPI } from '../api/client';

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

export default function PaymentsReportScreen() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const response = await reportsAPI.getPaymentsReceived();
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

            // Build HTML Table
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
                        .zero { color: #d32f2f; }
                        .partial { color: #f57c00; font-weight: bold; }
                        .paid { color: #2e7d32; font-weight: bold; }
                        .waived { color: #1976d2; font-style: italic; }
                    </style>
                </head>
                <body>
                    <h1>Payments Received Report</h1>
                    <p style="text-align:center; color:#666;">Generated on ${new Date().toLocaleDateString()}</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                ${columns.map((c: any) => `<th>${c.title}<br/><span style="font-size:8px">(₹${c.amount_per_member})</span></th>`).join('')}
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
                        const paid = member.paid[col.id] || 0;
                        const isWaived = member.is_waived[col.id];
                        const required = col.amount_per_member;

                        let cssClass = 'zero';
                        let display = paid === 0 ? '-' : Math.round(paid);

                        if (isWaived) {
                            cssClass = 'waived';
                            display = 'Waived';
                        } else if (paid >= required && required > 0) {
                            cssClass = 'paid';
                        } else if (paid > 0 && paid < required) {
                            cssClass = 'partial';
                        } else if (col.id === 'legacy' && paid > 0) {
                            cssClass = 'paid';
                        }

                        html += `<td class="${cssClass}">${display}</td>`;
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

    const formatCurrency = (amount: number) => {
        return amount === 0 ? '-' : Math.round(amount).toString();
    };

    // Calculate total layout width
    const totalWidth = NAME_COL_WIDTH + (columns.length * DATA_COL_WIDTH) + TOTAL_COL_WIDTH;

    return (
        <View style={styles.container}>
            <View style={styles.screenHeader}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.title}>Payments Received Report</Text>
                        <Text style={styles.subtitle}>
                            Green: Paid | Blue: Waived | Orange: Partial | Red: Zero
                        </Text>
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
                                    {'\n'}(₹{col.amount_per_member})
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.cell, styles.totalCell, styles.headerCell]}>
                            <Text style={styles.headerText}>Total Paid</Text>
                        </View>
                    </View>

                    {/* Table Body */}
                    <ScrollView style={styles.verticalScroll}>
                        {groups.map((group: any) => (
                            <View key={group.landmark}>
                                {/* Group Header */}
                                <View style={[styles.groupRow, { width: totalWidth }]}>
                                    <Text style={styles.groupTitle}>📍 {group.landmark}</Text>
                                </View>

                                {/* Rows */}
                                {group.members.map((member: any) => (
                                    <View key={member.id} style={styles.row}>
                                        <View style={[styles.cell, styles.nameCell]}>
                                            <Text style={styles.nameText} numberOfLines={1}>{member.name}</Text>
                                            <Text style={styles.subText} numberOfLines={1}>{member.father_name}</Text>
                                        </View>

                                        {columns.map((col: any) => {
                                            const paid = member.paid[col.id] || 0;
                                            const isWaived = member.is_waived[col.id];
                                            const required = col.amount_per_member;

                                            let cellStyle = styles.zeroText; // Default Red
                                            let displayText = formatCurrency(paid);

                                            if (isWaived) {
                                                cellStyle = styles.waivedText;
                                                displayText = "Waived";
                                            } else if (paid >= required && required > 0) {
                                                cellStyle = styles.paidText; // Green
                                            } else if (paid > 0 && paid < required) {
                                                cellStyle = styles.partialText; // Orange
                                            } else if (col.id === 'legacy' && paid > 0) {
                                                cellStyle = styles.paidText; // Green for any legacy payment
                                            }

                                            return (
                                                <View key={col.id} style={[styles.cell, styles.dataCell]}>
                                                    <Text style={[styles.amountText, cellStyle]}>
                                                        {displayText}
                                                    </Text>
                                                </View>
                                            );
                                        })}

                                        <View style={[styles.cell, styles.totalCell]}>
                                            <Text style={[styles.amountText, styles.rowTotalText]}>
                                                {formatCurrency(member.row_total)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}

                        {/* Grand Totals Row */}
                        <View style={[styles.row, styles.grandTotalRow, { marginBottom: 40 }]}>
                            <View style={[styles.cell, styles.nameCell, styles.grandTotalCell]}>
                                <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                            </View>
                            {columns.map((col: any) => (
                                <View key={col.id} style={[styles.cell, styles.dataCell, styles.grandTotalCell]}>
                                    <Text style={styles.grandTotalValue}>
                                        {formatCurrency(grand_totals[col.id])}
                                    </Text>
                                </View>
                            ))}
                            <View style={[styles.cell, styles.totalCell, styles.grandTotalCell]}>
                                <Text style={styles.grandTotalValue}>
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
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
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
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    groupRow: {
        backgroundColor: '#e8f5e9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#c8e6c9',
    },
    groupTitle: {
        fontWeight: 'bold',
        color: '#2e7d32',
        fontSize: 14,
    },
    cell: {
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    headerCell: {
        backgroundColor: '#1a5f2a',
        alignItems: 'center',
        borderRightColor: '#2e7d32',
    },
    nameCell: {
        width: NAME_COL_WIDTH,
        backgroundColor: '#fafafa',
    },
    dataCell: {
        width: DATA_COL_WIDTH,
        alignItems: 'center',
    },
    totalCell: {
        width: TOTAL_COL_WIDTH,
        alignItems: 'center',
        backgroundColor: '#fafafa',
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
    paidText: {
        color: '#2e7d32', // Green
        fontWeight: 'bold',
    },
    partialText: {
        color: '#f57c00', // Orange
        fontWeight: 'bold',
    },
    zeroText: {
        color: '#d32f2f', // Red (or default greyish if preferred, but red highlights missing payments)
    },
    waivedText: {
        color: '#1976d2', // Blue
        fontWeight: 'bold',
        fontSize: 11,
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
