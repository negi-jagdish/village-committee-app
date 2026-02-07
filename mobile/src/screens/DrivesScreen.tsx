import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { drivesAPI } from '../api/client';

interface Drive {
    id: number;
    title: string;
    title_hi: string;
    amount_per_member: number;
    collected_amount: number;
    target_amount: number;
    collection_percentage: number;
    contributors_count: number;
    total_members: number;
    is_active: boolean;
}

export default function DrivesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const language = useSelector((state: RootState) => state.app.language);
    const user = useSelector((state: RootState) => state.auth.user);
    const [drives, setDrives] = useState<Drive[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDrives = async () => {
        try {
            const response = await drivesAPI.getAll();
            setDrives(response.data);
        } catch (error) {
            console.error('Fetch drives error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrives();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDrives();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const renderDrive = ({ item }: { item: Drive }) => (
        <TouchableOpacity
            style={styles.driveCard}
            onPress={() => navigation.navigate('DriveDetails', { driveId: item.id })}
        >
            <View style={styles.driveHeader}>
                <Text style={styles.driveTitle}>
                    {language === 'hi' && item.title_hi ? item.title_hi : item.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#e8f5e9' : '#eeeeee' }]}>
                    <Text style={[styles.statusText, { color: item.is_active ? '#2e7d32' : '#757575' }]}>
                        {item.is_active ? 'Active' : 'Closed'}
                    </Text>
                </View>
            </View>

            <Text style={styles.amountPerMember}>
                {formatCurrency(item.amount_per_member)} {t('drives.amountPerMember')}
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${Math.min(item.collection_percentage, 100)}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>{item.collection_percentage}%</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('drives.collected')}</Text>
                    <Text style={styles.statValue}>{formatCurrency(item.collected_amount)}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('drives.target')}</Text>
                    <Text style={styles.statValue}>{formatCurrency(item.target_amount)}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('drives.contributors')}</Text>
                    <Text style={styles.statValue}>{item.contributors_count}/{item.total_members}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={drives}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderDrive}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No contribution drives yet</Text>
                        </View>
                    ) : null
                }
            />

            {/* Create Drive Button */}
            {user?.role === 'president' && (
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('CreateDrive')}
                >
                    <Text style={styles.createButtonText}>+ {t('drives.createDrive')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    driveCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    driveHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    driveTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    amountPerMember: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1a5f2a',
        borderRadius: 4,
    },
    progressText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stat: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    createButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#1a5f2a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
