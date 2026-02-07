import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { galleryAPI } from '../api/client';

export default function AddEventScreen({ navigation }: any) {
    const [title, setTitle] = useState('');
    const [titleHi, setTitleHi] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePickImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to pick image');
            return;
        }

        if (result.assets && result.assets.length > 0) {
            setSelectedFile(result.assets[0]);
            setCoverImageUrl(''); // Clear URL if file is selected
        }
    };

    const handleSubmit = async () => {
        if (!title || !date) {
            Alert.alert('Error', 'Title and Date are required');
            return;
        }

        // Validate Date format YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            Alert.alert('Error', 'Date must be in YYYY-MM-DD format');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('title_hi', titleHi);
            formData.append('event_date', date);

            if (selectedFile) {
                // Append file
                const file: any = {
                    uri: Platform.OS === 'ios' ? selectedFile.uri?.replace('file://', '') : selectedFile.uri,
                    type: selectedFile.type || 'image/jpeg',
                    name: selectedFile.fileName || 'cover_image.jpg',
                };
                formData.append('cover_image', file);
            } else if (coverImageUrl) {
                // Append URL string
                formData.append('cover_image', coverImageUrl);
            }

            await galleryAPI.createEvent(formData);
            Alert.alert('Success', 'Event created successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Create event error:', error);
            Alert.alert('Error', 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Event Title (English) *</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Republic Day 2024"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Event Title (Hindi) - Optional</Text>
                <TextInput
                    style={styles.input}
                    value={titleHi}
                    onChangeText={setTitleHi}
                    placeholder="e.g. गणतंत्र दिवस 2024"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Cover Image</Text>

                <View style={styles.imagePickerContainer}>
                    <TouchableOpacity style={styles.pickBtn} onPress={handlePickImage}>
                        <Text style={styles.pickBtnText}>📷 Pick from Gallery</Text>
                    </TouchableOpacity>
                    <Text style={styles.orText}>- OR -</Text>
                    <TextInput
                        style={styles.input}
                        value={coverImageUrl}
                        onChangeText={(text) => {
                            setCoverImageUrl(text);
                            setSelectedFile(null); // Clear file if URL is typed
                        }}
                        placeholder="Paste Image URL"
                    />
                </View>

                {selectedFile && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} />
                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => setSelectedFile(null)}
                        >
                            <Text style={styles.removeBtnText}>✕ Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Create Event</Text>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    imagePickerContainer: {
        gap: 10,
    },
    pickBtn: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    pickBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    orText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
    },
    previewContainer: {
        marginTop: 10,
        position: 'relative',
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        resizeMode: 'cover',
    },
    removeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    removeBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    submitBtn: {
        backgroundColor: '#1a5f2a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
