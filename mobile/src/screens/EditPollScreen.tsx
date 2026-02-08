import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { pollsAPI } from '../api/client';
import DatePickerField from '../components/DatePickerField';
import { Switch } from 'react-native';

const EditPollScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { pollId } = route.params as { pollId: number };

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [status, setStatus] = useState('active');
    const [allowCustomAnswer, setAllowCustomAnswer] = useState(false);
    const [showResults, setShowResults] = useState(true);

    useEffect(() => {
        loadPollDetails();
    }, [pollId]);

    const loadPollDetails = async () => {
        try {
            const response = await pollsAPI.getDetails(pollId);
            const poll = response.data.poll;
            setTitle(poll.title);
            setDescription(poll.description || '');
            setStartDate(new Date(poll.start_at));
            setEndDate(new Date(poll.end_at));
            setStatus(poll.status || 'active');
            setAllowCustomAnswer(!!poll.allow_custom_answer);
            setShowResults(poll.show_results === undefined ? true : !!poll.show_results);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load poll details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        if (endDate <= startDate) {
            Alert.alert('Error', 'End time must be after start time');
            return;
        }

        try {
            setSubmitting(true);
            const data = {
                title,
                description,
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString(),
                status,
                allow_custom_answer: allowCustomAnswer,
                show_results: showResults
            };

            await pollsAPI.edit(pollId, data);
            Alert.alert('Success', 'Poll updated successfully');
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update poll');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Question / Topic</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Timing (IST)</Text>
                <DatePickerField
                    label="Start Time"
                    value={startDate}
                    onChange={setStartDate}
                    mode="datetime"
                />
                <DatePickerField
                    label="End Time"
                    value={endDate}
                    onChange={setEndDate}
                    mode="datetime"
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusContainer}>
                    {['active', 'closed', 'archived'].map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.statusButton, status === s && styles.statusButtonSelected]}
                            onPress={() => setStatus(s)}
                        >
                            <Text style={[styles.statusText, status === s && styles.statusTextSelected]}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Allow Custom Answer</Text>
                    <Switch value={allowCustomAnswer} onValueChange={setAllowCustomAnswer} />
                </View>

                <View style={[styles.row, { marginTop: 12 }]}>
                    <Text style={styles.label}>Show Real-time Results</Text>
                    <Switch value={showResults} onValueChange={setShowResults} />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitButton, submitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                <Text style={styles.submitText}>{submitting ? 'Updating...' : 'Update Poll'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { marginBottom: 20, backgroundColor: '#fff', padding: 16, borderRadius: 8 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },
    statusContainer: { flexDirection: 'row' },
    statusButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginHorizontal: 4, borderRadius: 20 },
    statusButtonSelected: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
    statusText: { color: '#666', fontWeight: 'bold' },
    statusTextSelected: { color: '#fff' },
    submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#B0BEC5' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default EditPollScreen;
