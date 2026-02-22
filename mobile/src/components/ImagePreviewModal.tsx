import React, { useState } from 'react';
import { View, Text, Modal, Image, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

interface ImagePreviewModalProps {
    visible: boolean;
    images: any[]; // Array of assets from image picker
    onClose: () => void;
    onSend: (captions: { [key: number]: string }) => void;
}

export default function ImagePreviewModal({ visible, images, onClose, onSend }: ImagePreviewModalProps) {
    const [captions, setCaptions] = useState<{ [key: number]: string }>({});
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleSend = () => {
        onSend(captions);
        setCaptions({});
        setCurrentIndex(0);
    };

    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
        );
    };

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / width);
        setCurrentIndex(index);
    };

    if (!visible || images.length === 0) {
        console.log('ImagePreviewModal visible=false or no images');
        return null;
    }

    console.log('Rendering ImagePreviewModal with', images.length, 'images');

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {images.length > 1 ? `${currentIndex + 1} / ${images.length}` : 'Preview'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    <FlatList
                        data={images}
                        renderItem={renderItem}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                        onMomentumScrollEnd={handleScroll}
                    />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.footer}
                >
                    <TextInput
                        style={styles.input}
                        placeholder="Add a caption..."
                        placeholderTextColor="#aaa"
                        value={captions[currentIndex] || ''}
                        onChangeText={(text) => setCaptions({ ...captions, [currentIndex]: text })}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Icon name="send" size={24} color="#fff" />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        zIndex: 10,
    },
    closeButton: {
        padding: 5,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: width,
        height: height * 0.7, // Occupy 70% of screen height
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
