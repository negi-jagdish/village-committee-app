import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Sound from 'react-native-sound';
import { NOTIFICATION_TONES, Tone } from '../config/ToneConfig';
import { useTheme } from '../theme/ThemeContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    selectedTone: string;
    onSelect: (toneId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ToneSelectionModal: React.FC<Props> = ({ visible, onClose, selectedTone, onSelect }) => {
    const { colors } = useTheme();
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentSound, setCurrentSound] = useState<Sound | null>(null);

    const playPreview = (toneId: string) => {
        if (toneId === 'default') return;

        // Stop current if playing
        if (currentSound) {
            currentSound.stop();
            currentSound.release();
        }

        if (playingId === toneId) {
            setPlayingId(null);
            setCurrentSound(null);
            return;
        }

        setPlayingId(toneId);
        const sound = new Sound(`${toneId}.ogg`, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.log('failed to load the sound', error, `${toneId}.ogg`);
                setPlayingId(null);
                return;
            }
            setCurrentSound(sound);
            sound.play((success) => {
                setPlayingId(null);
                setCurrentSound(null);
                sound.release();
            });
        });
    };

    const renderItem = ({ item }: { item: Tone }) => (
        <TouchableOpacity
            style={[styles.toneItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => onSelect(item.id)}
        >
            <View style={styles.toneInfo}>
                <Icon
                    name={selectedTone === item.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={selectedTone === item.id ? colors.primary : colors.textSecondary}
                />
                <View style={{ marginLeft: 15 }}>
                    <Text style={[styles.toneName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.toneCategory, { color: colors.textSecondary }]}>{item.category}</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => playPreview(item.id)}
                disabled={item.id === 'default'}
                style={styles.playBtn}
            >
                <Icon
                    name={playingId === item.id ? 'stop-circle' : 'play-circle-outline'}
                    size={30}
                    color={item.id === 'default' ? colors.border : colors.primary}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: colors.surface }]}>
                    <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                        <Text style={[styles.title, { color: colors.text }]}>Notification Tone</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={NOTIFICATION_TONES}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        style={{ maxHeight: SCREEN_HEIGHT * 0.7 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    toneItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    toneInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    toneName: {
        fontSize: 16,
        fontWeight: '500',
    },
    toneCategory: {
        fontSize: 11,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    playBtn: {
        padding: 5,
    },
});

export default ToneSelectionModal;
