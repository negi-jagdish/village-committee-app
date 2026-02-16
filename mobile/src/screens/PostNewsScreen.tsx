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
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { newsAPI, API_BASE_URL } from '../api/client';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../theme/ThemeContext';

const CATEGORIES = [
    { id: 'general', label: 'General' },
    { id: 'sports', label: 'Sports' },
    { id: 'political', label: 'Political' },
    { id: 'cultural', label: 'Cultural' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'talent', label: 'Talent' },
    { id: 'education', label: 'Education' },
    { id: 'health', label: 'Health' },
    { id: 'science', label: 'Science' },
];

const SCOPES = [
    { id: 'village', label: 'Village' },
    { id: 'district', label: 'District' },
    { id: 'state', label: 'State' },
    { id: 'country', label: 'Country' },
    { id: 'international', label: 'International' },
];

export default function PostNewsScreen({ navigation, route }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    // Edit mode support
    const editMode = route?.params?.editMode || false;
    const newsItem = route?.params?.newsItem;

    const [title, setTitle] = useState('');
    const [titleHi, setTitleHi] = useState('');
    const [content, setContent] = useState('');
    const [contentHi, setContentHi] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [category, setCategory] = useState('general');
    const [scope, setScope] = useState('village');

    const [images, setImages] = useState<any[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>([]);
    const [removeMediaIds, setRemoveMediaIds] = useState<number[]>([]);

    // Pre-fill data in edit mode
    useEffect(() => {
        if (editMode && newsItem) {
            setTitle(newsItem.title || '');
            setTitleHi(newsItem.title_hi || '');
            setContent(newsItem.content || '');
            setContentHi(newsItem.content_hi || '');
            setYoutubeUrl(newsItem.youtube_url || '');
            setCategory(newsItem.category || 'general');
            setScope(newsItem.scope || 'village');
            navigation.setOptions({ title: 'Edit News' });

            // Load existing images
            if (newsItem.media && newsItem.media.length > 0) {
                setExistingImages(newsItem.media.map((m: any) => ({
                    id: m.id,
                    uri: m.media_url.startsWith('http')
                        ? m.media_url
                        : `${API_BASE_URL.replace('/api', '')}${m.media_url}`,
                })));
            }
        }
    }, [editMode, newsItem]);

    const totalImages = existingImages.length + images.length;

    const handlePickImage = async () => {
        if (totalImages >= 5) {
            Alert.alert('Limit', 'Maximum 5 images allowed');
            return;
        }
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 5 - totalImages,
                quality: 0.8,
            });

            if (result.assets) {
                setImages([...images, ...result.assets]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleRemoveExistingImage = (mediaId: number) => {
        setExistingImages(existingImages.filter((img) => img.id !== mediaId));
        setRemoveMediaIds([...removeMediaIds, mediaId]);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter title in English');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter content in English');
            return;
        }

        setSubmitting(true);
        try {
            // Build FormData for both create and edit
            const formData = new FormData();
            formData.append('title', title.trim());
            if (titleHi.trim()) formData.append('title_hi', titleHi.trim());
            formData.append('content', content.trim());
            if (contentHi.trim()) formData.append('content_hi', contentHi.trim());
            if (youtubeUrl.trim()) formData.append('youtube_url', youtubeUrl.trim());
            formData.append('category', category);
            formData.append('scope', scope);

            // Append new images
            images.forEach((img, index) => {
                formData.append('images', {
                    uri: img.uri,
                    type: img.type,
                    name: img.fileName || `image_${index}.jpg`,
                } as any);
            });

            if (editMode && newsItem) {
                // Send IDs of images to remove
                if (removeMediaIds.length > 0) {
                    formData.append('remove_media_ids', JSON.stringify(removeMediaIds));
                }
                await newsAPI.update(newsItem.id, formData);
                Alert.alert('Success', 'News updated successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                await newsAPI.create(formData);
                Alert.alert('Success', 'News posted successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (error: any) {
            console.error('Post/Edit news error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save news');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.form}>
                {/* Title */}
                <Text style={[styles.label, { color: colors.text }]}>Title (English) *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                    placeholderTextColor={colors.inputPlaceholder}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="News headline"
                />

                <Text style={[styles.label, { color: colors.text }]}>Title (Hindi)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                    placeholderTextColor={colors.inputPlaceholder}
                    value={titleHi}
                    onChangeText={setTitleHi}
                    placeholder="Optional Hindi headline"
                />

                {/* Content */}
                <Text style={[styles.label, { color: colors.text }]}>Content (English) *</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                    placeholderTextColor={colors.inputPlaceholder}
                    value={content}
                    onChangeText={setContent}
                    placeholder="News details..."
                    multiline
                    numberOfLines={4}
                />

                <Text style={[styles.label, { color: colors.text }]}>Content (Hindi)</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                    placeholderTextColor={colors.inputPlaceholder}
                    value={contentHi}
                    onChangeText={setContentHi}
                    placeholder="Optional Hindi details..."
                    multiline
                    numberOfLines={4}
                />

                {/* YouTube Link */}
                <Text style={[styles.label, { color: colors.text }]}>YouTube Video URL</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.inputBorder }]}
                    placeholderTextColor={colors.inputPlaceholder}
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    placeholder="https://youtube.com/..."
                    autoCapitalize="none"
                />

                {/* Category Picker */}
                <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Picker
                        selectedValue={category}
                        onValueChange={setCategory}
                        style={[styles.picker, { color: colors.inputText }]}
                        dropdownIconColor={colors.text}
                    >
                        {CATEGORIES.map((cat) => (
                            <Picker.Item key={cat.id} label={cat.label} value={cat.id} color={colors.text} style={{ backgroundColor: colors.background }} />
                        ))}
                    </Picker>
                </View>

                {/* Scope Picker */}
                <Text style={[styles.label, { color: colors.text }]}>Related To *</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Picker
                        selectedValue={scope}
                        onValueChange={setScope}
                        style={[styles.picker, { color: colors.inputText }]}
                        dropdownIconColor={colors.text}
                    >
                        {SCOPES.map((s) => (
                            <Picker.Item key={s.id} label={s.label} value={s.id} color={colors.text} style={{ backgroundColor: colors.background }} />
                        ))}
                    </Picker>
                </View>

                {/* Image Upload */}
                <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
                    <Text style={styles.imageButtonText}>+ Add Images</Text>
                </TouchableOpacity>
                <ScrollView horizontal style={styles.imageList}>
                    {/* Existing images (edit mode) */}
                    {existingImages.map((img) => (
                        <View key={`existing-${img.id}`} style={{ position: 'relative', marginRight: 8 }}>
                            <Image source={{ uri: img.uri }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(200,0,0,0.7)', borderRadius: 10 }}
                                onPress={() => handleRemoveExistingImage(img.id)}
                            >
                                <Text style={{ color: '#fff', fontSize: 16, paddingHorizontal: 6 }}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {/* New images */}
                    {images.map((img, index) => (
                        <View key={`new-${index}`} style={{ position: 'relative', marginRight: 8 }}>
                            <Image source={{ uri: img.uri }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 }}
                                onPress={() => setImages(images.filter((_, i) => i !== index))}
                            >
                                <Text style={{ color: '#fff', fontSize: 16, paddingHorizontal: 6 }}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{editMode ? 'Update News' : 'Post News'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    imageButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#1a5f2a',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 20,
        borderStyle: 'dashed',
    },
    imageButtonText: {
        color: '#1a5f2a',
        fontWeight: '600',
    },
    imageList: {
        marginTop: 12,
        flexDirection: 'row',
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 8,
    },
    note: {
        fontSize: 12,
        color: '#666',
        marginTop: 12,
        fontStyle: 'italic',
    },
    submitButton: {
        backgroundColor: '#1a5f2a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
});
