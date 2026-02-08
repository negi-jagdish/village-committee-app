import React, { useState, useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { membersAPI } from '../api/client';
import { Picker } from '@react-native-picker/picker';
import DatePickerField from '../components/DatePickerField';

export default function AddMemberScreen({ navigation, route }: any) {
    const { t } = useTranslation();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const { member, isEdit } = route.params || {};

    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        father_name: '',
        mother_name: '',
        date_of_birth: '',
        village_landmark: '',
        current_address: '',
        contact_1: '',
        contact_2: '',
        email: '',
        password: '', // Only for creation or password reset? Actually password change is separate usually.
        role: 'member',
        status: 'active',
        sex: 'male',
        legacy_due: '',
    });

    useEffect(() => {
        if (isEdit && member) {
            navigation.setOptions({ title: 'Edit Member' });
            setForm({
                name: member.name || '',
                father_name: member.father_name || '',
                mother_name: member.mother_name || '',
                date_of_birth: member.date_of_birth ? new Date(member.date_of_birth).toISOString().split('T')[0] : '',
                village_landmark: member.village_landmark || '',
                current_address: member.current_address || '',
                contact_1: member.contact_1 || '',
                contact_2: member.contact_2 || '',
                email: member.email || '',
                password: '', // Don't prefill password
                role: member.role || 'member',
                status: member.status || 'active',
                sex: member.sex || 'male',
                legacy_due: member.legacy_due ? String(member.legacy_due) : '',
            });
        }
    }, [isEdit, member]);

    const updateForm = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const isSelfEdit = isEdit && currentUser?.id === member?.id;
    // President can edit everything, even for self. Others are restricted on self-edit.
    const isRestrictedSelfEdit = isSelfEdit && currentUser?.role !== 'president';
    const isAdmin = currentUser?.role === 'president' || currentUser?.role === 'secretary';

    const handleSubmit = async () => {
        // Basic validation
        if (!form.name || !form.father_name || !form.village_landmark || !form.current_address || !form.contact_1) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!isEdit && !form.password) {
            Alert.alert('Error', 'Password is required for new members');
            return;
        }

        if (form.contact_1.length < 10) {
            Alert.alert('Error', 'Contact number must be at least 10 digits');
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                await membersAPI.update(member.id, form);
                Alert.alert('Success', 'Member updated successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await membersAPI.create(form);
                Alert.alert('Success', 'Member added successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to save member');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Personal Details</Text>

                <Text style={styles.label}>{t('members.name')} *</Text>
                <TextInput
                    style={[styles.input, isRestrictedSelfEdit && styles.disabledInput]}
                    value={form.name}
                    onChangeText={(text) => updateForm('name', text)}
                    placeholder="Enter full name"
                    editable={!isRestrictedSelfEdit}
                />

                <Text style={styles.label}>{t('members.fatherName')} *</Text>
                <TextInput
                    style={styles.input}
                    value={form.father_name}
                    onChangeText={(text) => updateForm('father_name', text)}
                    placeholder="Enter father's name"
                />

                <Text style={styles.label}>{t('members.motherName')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.mother_name}
                    onChangeText={(text) => updateForm('mother_name', text)}
                    placeholder="Enter mother's name"
                />

                <DatePickerField
                    label={t('members.dateOfBirth')}
                    value={form.date_of_birth}
                    onChange={(text) => updateForm('date_of_birth', text)}
                    placeholder="Select Date of Birth"
                    maximumDate={new Date()}
                />

                <Text style={styles.label}>Sex</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={form.sex}
                        onValueChange={(val) => updateForm('sex', val)}
                        style={{ height: 50 }}
                    >
                        <Picker.Item label="Male" value="male" />
                        <Picker.Item label="Female" value="female" />
                    </Picker>
                </View>

                <Text style={styles.sectionTitle}>Contact & Address</Text>

                <Text style={styles.label}>{t('members.villageLandmark')} *</Text>
                <TextInput
                    style={styles.input}
                    value={form.village_landmark}
                    onChangeText={(text) => updateForm('village_landmark', text)}
                    placeholder="e.g. Near Big Well, Main Street"
                />

                <Text style={styles.label}>{t('members.currentAddress')} *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.current_address}
                    onChangeText={(text) => updateForm('current_address', text)}
                    placeholder="Enter full current address"
                    multiline
                />

                <Text style={styles.label}>{t('members.contact1')} *</Text>
                <TextInput
                    style={[styles.input, isRestrictedSelfEdit && styles.disabledInput]}
                    value={form.contact_1}
                    onChangeText={(text) => updateForm('contact_1', text)}
                    placeholder="Primary mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!isRestrictedSelfEdit}
                />

                <Text style={styles.label}>{t('members.contact2')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.contact_2}
                    onChangeText={(text) => updateForm('contact_2', text)}
                    placeholder="Alternative mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                />

                <Text style={styles.label}>{t('members.email')}</Text>
                <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={(text) => updateForm('email', text)}
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.sectionTitle}>Account Setup</Text>

                {!isEdit && (
                    <>
                        <Text style={styles.label}>Initial Password *</Text>
                        <TextInput
                            style={styles.input}
                            value={form.password}
                            onChangeText={(text) => updateForm('password', text)}
                            placeholder="Set initial password"
                            secureTextEntry
                        />
                    </>
                )}

                {/* Role Selection - Only if Admin and NOT editing self (prevent locking oneself out) or if specific logic allows */}
                {/* Logic: Admin can change others roles. Self cannot change role. */}
                {isAdmin && !isSelfEdit && (
                    <>
                        <Text style={styles.label}>{t('members.role')}</Text>
                        <View style={styles.roleContainer}>
                            {['member', 'president', 'secretary', 'cashier', 'reporter'].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.roleButton, form.role === role && styles.roleButtonActive]}
                                    onPress={() => updateForm('role', role)}
                                >
                                    <Text style={[styles.roleButtonText, form.role === role && styles.roleButtonTextActive]}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* Status Selection - Only Admin */}
                {isAdmin && (
                    <>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={form.status}
                                onValueChange={(val) => updateForm('status', val)}
                                style={{ height: 50 }}
                            >
                                <Picker.Item label="Active" value="active" />
                                <Picker.Item label="Inactive" value="inactive" />
                                <Picker.Item label="Deceased" value="deceased" />
                            </Picker>
                        </View>
                    </>
                )}

                {/* Legacy Dues - President Only */}
                {currentUser?.role === 'president' && (
                    <>
                        <Text style={styles.label}>Legacy Dues (Opening Balance)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.legacy_due}
                            onChangeText={(text) => updateForm('legacy_due', text)}
                            placeholder="Enter past outstanding amount"
                            keyboardType="numeric"
                        />
                    </>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{t('common.save')}</Text>
                    )}
                </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    formCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a5f2a',
        marginBottom: 16,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    disabledInput: {
        backgroundColor: '#e0e0e0',
        color: '#666',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleButtonActive: {
        backgroundColor: '#e8f5e9',
        borderColor: '#1a5f2a',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#666',
    },
    roleButtonTextActive: {
        color: '#1a5f2a',
        fontWeight: 'bold',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
    },
    submitButton: {
        backgroundColor: '#1a5f2a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 10,
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
