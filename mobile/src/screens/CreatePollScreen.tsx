import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { pollsAPI } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePickerField from '../components/DatePickerField'; // Reused component

const CreatePollScreen = () => {
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [pollType, setPollType] = useState<'single' | 'multiple' | 'text'>('single');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [allowCustomAnswer, setAllowCustomAnswer] = useState(false);
    const [showResults, setShowResults] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
    const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleOptionChange = (text: string, index: number) => {
        const newOptions = [...options];
        newOptions[index] = text;
        setOptions(newOptions);
    };

    const selectImage = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
        if (result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri || null);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        if (pollType !== 'text') {
            const validOptions = options.filter(opt => opt.trim().length > 0);
            if (validOptions.length < 2) {
                Alert.alert('Error', 'Please provide at least 2 options');
                return;
            }
        }

        if (endDate <= startDate) {
            Alert.alert('Error', 'End time must be after start time');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('poll_type', pollType);
            formData.append('is_anonymous', isAnonymous.toString());
            formData.append('allow_custom_answer', allowCustomAnswer.toString());
            formData.append('show_results', showResults.toString());
            formData.append('start_at', startDate.toISOString());
            formData.append('end_at', endDate.toISOString());

            if (pollType !== 'text') {
                const validOptions = options.filter(opt => opt.trim().length > 0).map(text => ({ text }));
                formData.append('options', JSON.stringify(validOptions));
            }

            if (imageUri) {
                formData.append('image', {
                    uri: imageUri,
                    type: 'image/jpeg',
                    name: 'poll_banner.jpg',
                } as any);
            }

            await pollsAPI.create(formData);
            Alert.alert('Success', 'Poll created successfully');
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create poll');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Question / Topic</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Planning for Annual Function"
                />

                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Provide more context..."
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Poll Type</Text>
                <View style={styles.typeContainer}>
                    {['single', 'multiple', 'text'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeButton, pollType === type && styles.typeButtonSelected]}
                            onPress={() => setPollType(type as any)}
                        >
                            <Text style={[styles.typeText, pollType === type && styles.typeTextSelected]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>
                    {pollType === 'single' && 'Members can pick only one option.'}
                    {pollType === 'multiple' && 'Members can pick multiple options.'}
                    {pollType === 'text' && 'Members can write their own response.'}
                </Text>
            </View>

            {pollType !== 'text' && (
                <View style={styles.section}>
                    <Text style={styles.label}>Options</Text>
                    {options.map((opt, index) => (
                        <View key={index} style={styles.optionRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={opt}
                                onChangeText={(text) => handleOptionChange(text, index)}
                                placeholder={`Option ${index + 1}`}
                            />
                            {options.length > 2 && (
                                <TouchableOpacity onPress={() => handleRemoveOption(index)} style={styles.removeBtn}>
                                    <Icon name="close" size={24} color="#f44336" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption}>
                        <Icon name="add" size={20} color="#2196F3" />
                        <Text style={styles.addOptionText}>Add Option</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                <View style={styles.row}>
                    <Text style={styles.label}>Anonymous Voting</Text>
                    <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
                </View>
                <Text style={styles.hint}>{isAnonymous ? 'Voter names will be hidden.' : 'Voter names will be visible to Admins.'}</Text>

                <View style={[styles.row, { marginTop: 12 }]}>
                    <Text style={styles.label}>Allow Custom Answer</Text>
                    <Switch value={allowCustomAnswer} onValueChange={setAllowCustomAnswer} />
                </View>
                <Text style={styles.hint}>Allow voters to type their own answer in choice polls.</Text>

                <View style={[styles.row, { marginTop: 12 }]}>
                    <Text style={styles.label}>Show Real-time Results</Text>
                    <Switch value={showResults} onValueChange={setShowResults} />
                </View>
                <Text style={styles.hint}>If disabled, results are hidden until the poll ends.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Banner Image</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={selectImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Icon name="image" size={40} color="#ccc" />
                            <Text>Tap to select image</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading}
            >
                <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Poll'}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    section: { marginBottom: 20, backgroundColor: '#fff', padding: 16, borderRadius: 8 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
    textArea: { height: 80, textAlignVertical: 'top' },
    typeContainer: { flexDirection: 'row', marginBottom: 8 },
    typeButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#2196F3', alignItems: 'center', marginHorizontal: 4, borderRadius: 20 },
    typeButtonSelected: { backgroundColor: '#2196F3' },
    typeText: { color: '#2196F3', fontWeight: 'bold' },
    typeTextSelected: { color: '#fff' },
    hint: { color: '#666', fontSize: 12, fontStyle: 'italic' },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    removeBtn: { marginLeft: 8, padding: 4 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    addOptionText: { color: '#2196F3', fontWeight: 'bold', marginLeft: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    imagePicker: { height: 150, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
    previewImage: { width: '100%', height: '100%' },
    submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#B0BEC5' },
});

export default CreatePollScreen;
