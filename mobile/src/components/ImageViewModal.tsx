import React, { useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Image } from 'react-native';
// Actually, simple Image for now to avoid new deps if not needed, but zoom is "WhatsApp-like".
// I don't have react-native-image-zoom-viewer installed.
// I will use a simple Image with resizeMode="contain" for now.

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

interface ImageViewModalProps {
    visible: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

const ImageViewModal = ({ visible, imageUrl, onClose }: ImageViewModalProps) => {
    const [loading, setLoading] = useState(false);

    if (!imageUrl) return null;

    const handleShare = async () => {
        if (!imageUrl) return;
        setLoading(true);
        try {
            // Download to temporary file
            const filename = imageUrl.split('/').pop() || 'image.jpg';
            const localUri = `${RNFS.CachesDirectoryPath}/${filename}`;

            const options = {
                fromUrl: imageUrl,
                toFile: localUri,
            };

            await RNFS.downloadFile(options).promise;

            await Share.open({
                url: `file://${localUri}`,
                type: 'image/jpeg',
                title: 'Share Image'
            });
        } catch (error: any) {
            if (error && error.message && error.message.includes('User did not share')) {
                // Ignore user cancellation
                return;
            }
            console.error('Share error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Icon name="close" size={30} color="#fff" />
                </TouchableOpacity>

                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Icon name="share-variant" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        zIndex: 10,
        padding: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    image: {
        width: Dimensions.get('window').width,
        height: '100%',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        zIndex: 10
    },
    actionButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 30,
    }
});

export default ImageViewModal;
