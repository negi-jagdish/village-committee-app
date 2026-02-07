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
import { galleryAPI } from '../api/client';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, Asset } from 'react-native-image-picker';

export default function AddMediaScreen({ route, navigation }: any) {
    const { eventId } = route.params;
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const [type, setType] = useState<'image' | 'video'>('image');
    const [url, setUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePickMedia = async () => {
        const result = await launchImageLibrary({
            mediaType: 'mixed',
            selectionLimit: 1,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to pick media');
            return;
        }

        if (result.assets && result.assets.length > 0) {
            const file = result.assets[0];
            setSelectedFile(file);
            // Auto-detect type
            if (file.type?.startsWith('video')) {
                setType('video');
            } else {
                setType('image');
            }
        }
    };

    const handleSubmit = async () => {
        if (mode === 'url' && !url) {
            Alert.alert('Error', 'URL is required');
            return;
        }
        if (mode === 'upload' && !selectedFile) {
            Alert.alert('Error', 'Please select a file');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('event_id', String(eventId));
            formData.append('type', type);
            formData.append('caption', caption);

            if (mode === 'upload' && selectedFile) {
                const file: any = {
                    uri: Platform.OS === 'ios' ? selectedFile.uri?.replace('file://', '') : selectedFile.uri,
                    type: selectedFile.type || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
                    name: selectedFile.fileName || `media.${type === 'video' ? 'mp4' : 'jpg'}`,
                };
                formData.append('media_file', file);
            } else {
                formData.append('url', url);
            }

            await galleryAPI.addMedia(formData);
            Alert.alert('Success', 'Media added successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Add media error:', error);
            Alert.alert('Error', 'Failed to add media');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Source</Text>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'upload' && styles.activeTab]}
                        onPress={() => setMode('upload')}
                    >
                        <Text style={[styles.tabText, mode === 'upload' && styles.activeTabText]}>Upload File</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, mode === 'url' && styles.activeTab]}
                        onPress={() => setMode('url')}
                    >
                        <Text style={[styles.tabText, mode === 'url' && styles.activeTabText]}>External URL</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {mode === 'url' && (
                <>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Media Type</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={type}
                                onValueChange={setType}
                            >
                                <Picker.Item label="Image" value="image" />
                                <Picker.Item label="Video (YouTube)" value="video" />
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            {type === 'image' ? 'Image URL' : 'YouTube Video URL'} *
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={url}
                            onChangeText={setUrl}
                            placeholder={type === 'image' ? "https://example.com/photo.jpg" : "https://youtube.com/watch?v=..."}
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                    </View>
                </>
            )}

            {mode === 'upload' && (
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Select File</Text>
                    <TouchableOpacity style={styles.pickBtn} onPress={handlePickMedia}>
                        <Text style={styles.pickBtnText}>📁 Pick Image or Video from Gallery</Text>
                    </TouchableOpacity>

                    {selectedFile && (
                        <View style={styles.previewContainer}>
                            <Text style={styles.fileName}>{selectedFile.fileName || 'Selected File'}</Text>
                            <Text style={styles.fileType}>Type: {type.toUpperCase()}</Text>
                            {type === 'image' && (
                                <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} />
                            )}
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => setSelectedFile(null)}
                            >
                                <Text style={styles.removeBtnText}>✕ Remove</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.formGroup}>
                <Text style={styles.label}>Caption (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Brief description..."
                />
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Add Media</Text>
                )}
            </TouchableOpacity>
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
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    tabText: {
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#1a5f2a',
        fontWeight: 'bold',
    },
    pickBtn: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    pickBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    previewContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        position: 'relative',
    },
    fileName: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    fileType: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#ccc',
        resizeMode: 'contain',
    },
    removeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    removeBtnText: {
        color: '#d32f2f',
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
