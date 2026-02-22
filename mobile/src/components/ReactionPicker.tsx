import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';

const REACTIONS = ['👍', '❤️', '😂', '😯', '😢', '🙏'];

interface ReactionPickerProps {
    visible: boolean;
    onSelect: (reaction: string) => void;
    onClose: () => void;
    position?: { top: number, left: number } | null; // Placeholder for positioning logic
}

const ReactionPicker = ({ visible, onSelect, onClose }: ReactionPickerProps) => {
    if (!visible) return null;

    if (!visible) return null;

    return (
        <View style={styles.absoluteContainer}>
            <View style={styles.container}>
                {REACTIONS.map(reaction => (
                    <TouchableOpacity key={reaction} onPress={() => onSelect(reaction)} style={styles.reaction}>
                        <Text style={styles.emoji}>{reaction}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={{ fontSize: 18, color: '#666' }}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    absoluteContainer: {
        position: 'absolute',
        bottom: 80, // Above input
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        alignItems: 'center'
    },
    reaction: {
        padding: 5,
        marginHorizontal: 5
    },
    emoji: {
        fontSize: 24
    },
    closeButton: {
        marginLeft: 10,
        padding: 5
    }
});

export default ReactionPicker;
