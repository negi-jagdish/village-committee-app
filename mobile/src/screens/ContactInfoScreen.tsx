import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
    TouchableOpacity, TextInput, Alert, Linking, Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { membersAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Avatar from '../components/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BASE_URL = 'http://178.16.138.41:3000';

export default function ContactInfoScreen() {
    const { colors, isDark } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { memberId } = route.params;
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

    const [member, setMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editingBio, setEditingBio] = useState(false);
    const [bioText, setBioText] = useState('');
    const [savingBio, setSavingBio] = useState(false);

    const isOwnProfile = currentUserId === memberId;

    useEffect(() => {
        fetchMember();
    }, [memberId]);

    const fetchMember = async () => {
        try {
            const res = await membersAPI.getById(memberId);
            setMember(res.data);
            setBioText(res.data.bio || '');
        } catch (error) {
            console.error('Failed to fetch member:', error);
            Alert.alert('Error', 'Failed to load contact info');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBio = async () => {
        setSavingBio(true);
        try {
            await membersAPI.updateBio(memberId, bioText);
            setMember({ ...member, bio: bioText });
            setEditingBio(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to update bio');
        } finally {
            setSavingBio(false);
        }
    };

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const getProfileUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE_URL}${url}`;
    };

    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, { bg: string; text: string; label: string }> = {
            president: { bg: '#FFD700', text: '#000', label: '🏆 President' },
            secretary: { bg: '#4FC3F7', text: '#000', label: '📋 Secretary' },
            cashier: { bg: '#81C784', text: '#000', label: '💰 Cashier' },
            reporter: { bg: '#FF8A65', text: '#000', label: '📰 Reporter' },
            member: { bg: colors.borderLight, text: colors.textSecondary, label: 'Member' },
        };
        return roleColors[role] || roleColors.member;
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!member) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textSecondary }}>Contact not found</Text>
            </View>
        );
    }

    const profileUrl = getProfileUrl(member.profile_picture);
    const roleBadge = getRoleBadge(member.role);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Info</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={[styles.profileSection, { backgroundColor: colors.surface }]}>
                    {profileUrl ? (
                        <Image source={{ uri: profileUrl }} style={styles.profileImage} />
                    ) : (
                        <Avatar uri={null} name={member.name} size={120} style={styles.profileImage} />
                    )}
                    <Text style={[styles.profileName, { color: colors.text }]}>{member.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>{roleBadge.label}</Text>
                    </View>
                </View>

                {/* Bio Section */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                        <Icon name="info-outline" size={20} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>About</Text>
                        {isOwnProfile && !editingBio && (
                            <TouchableOpacity onPress={() => setEditingBio(true)} style={styles.editButton}>
                                <Icon name="edit" size={18} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {editingBio ? (
                        <View style={styles.bioEditContainer}>
                            <TextInput
                                style={[styles.bioInput, {
                                    color: colors.text,
                                    borderColor: colors.primary,
                                    backgroundColor: isDark ? colors.background : '#F5F5F5',
                                }]}
                                value={bioText}
                                onChangeText={setBioText}
                                placeholder="Write something about yourself..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                maxLength={200}
                                autoFocus
                            />
                            <View style={styles.bioActions}>
                                <TouchableOpacity
                                    onPress={() => { setEditingBio(false); setBioText(member.bio || ''); }}
                                    style={[styles.bioButton, { borderColor: colors.borderLight }]}
                                >
                                    <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveBio}
                                    style={[styles.bioButton, styles.bioSaveButton, { backgroundColor: colors.primary }]}
                                    disabled={savingBio}
                                >
                                    {savingBio ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={[styles.bioText, { color: member.bio ? colors.text : colors.textSecondary }]}>
                            {member.bio || (isOwnProfile ? 'Tap edit to add a description about yourself' : 'No description available')}
                        </Text>
                    )}
                </View>

                {/* Personal Details */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                        <Icon name="person" size={20} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Details</Text>
                    </View>

                    <DetailRow
                        icon="person-outline"
                        label="Father's Name"
                        value={member.father_name}
                        colors={colors}
                    />
                    {member.mother_name && (
                        <DetailRow
                            icon="person-outline"
                            label="Mother's Name"
                            value={member.mother_name}
                            colors={colors}
                        />
                    )}
                    {member.date_of_birth && (
                        <DetailRow
                            icon="cake"
                            label="Date of Birth"
                            value={new Date(member.date_of_birth).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric'
                            })}
                            colors={colors}
                        />
                    )}
                    <DetailRow
                        icon="wc"
                        label="Gender"
                        value={member.sex === 'male' ? 'Male' : 'Female'}
                        colors={colors}
                    />
                </View>

                {/* Location */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                        <Icon name="location-on" size={20} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Location</Text>
                    </View>

                    <DetailRow
                        icon="home"
                        label="Village Landmark"
                        value={member.village_landmark}
                        colors={colors}
                    />
                    <DetailRow
                        icon="location-city"
                        label="Current Address"
                        value={member.current_address}
                        colors={colors}
                    />
                </View>

                {/* Contact Details */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                        <Icon name="phone" size={20} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Contact</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => handleCall(member.contact_1)}
                        style={styles.contactRow}
                    >
                        <View style={styles.contactInfo}>
                            <Icon name="phone" size={18} color={colors.primary} />
                            <View style={styles.contactTextGroup}>
                                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Primary</Text>
                                <Text style={[styles.contactValue, { color: colors.primary }]}>{member.contact_1}</Text>
                            </View>
                        </View>
                        <View style={[styles.callButton, { backgroundColor: colors.primary + '15' }]}>
                            <Icon name="call" size={20} color={colors.primary} />
                        </View>
                    </TouchableOpacity>

                    {member.contact_2 && (
                        <TouchableOpacity
                            onPress={() => handleCall(member.contact_2)}
                            style={styles.contactRow}
                        >
                            <View style={styles.contactInfo}>
                                <Icon name="phone" size={18} color={colors.primary} />
                                <View style={styles.contactTextGroup}>
                                    <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Secondary</Text>
                                    <Text style={[styles.contactValue, { color: colors.primary }]}>{member.contact_2}</Text>
                                </View>
                            </View>
                            <View style={[styles.callButton, { backgroundColor: colors.primary + '15' }]}>
                                <Icon name="call" size={20} color={colors.primary} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {member.email && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(`mailto:${member.email}`)}
                            style={styles.contactRow}
                        >
                            <View style={styles.contactInfo}>
                                <Icon name="email" size={18} color={colors.primary} />
                                <View style={styles.contactTextGroup}>
                                    <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
                                    <Text style={[styles.contactValue, { color: colors.primary }]}>{member.email}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// Reusable detail row component
function DetailRow({ icon, label, value, colors }: {
    icon: string; label: string; value: string; colors: any;
}) {
    return (
        <View style={styles.detailRow}>
            <Icon name={icon} size={18} color={colors.textSecondary} style={styles.detailIcon} />
            <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{value || '—'}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: { marginRight: 16, padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingBottom: 20 },

    // Profile
    profileSection: {
        alignItems: 'center',
        paddingVertical: 28,
        marginBottom: 8,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
    },
    profileName: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    roleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roleBadgeText: { fontSize: 13, fontWeight: '600' },

    // Cards
    card: {
        marginHorizontal: 12,
        marginTop: 8,
        borderRadius: 12,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
        flex: 1,
    },
    editButton: { padding: 4 },

    // Bio
    bioText: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
    bioEditContainer: { marginTop: 4 },
    bioInput: {
        fontSize: 15,
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    bioActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    bioButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    bioSaveButton: { borderWidth: 0 },

    // Detail rows
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    detailIcon: { marginTop: 2, marginRight: 12 },
    detailContent: { flex: 1 },
    detailLabel: { fontSize: 12, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 15, fontWeight: '500' },

    // Contact rows
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    },
    contactInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    contactTextGroup: { marginLeft: 12 },
    contactLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    contactValue: { fontSize: 15, fontWeight: '600' },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
