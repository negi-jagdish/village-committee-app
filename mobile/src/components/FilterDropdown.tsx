import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';

interface DropdownOption {
    id: string;
    label: string;
}

interface FilterDropdownProps {
    options: DropdownOption[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
}

export default function FilterDropdown({
    options,
    selectedValue,
    onValueChange,
    placeholder = 'Select',
}: FilterDropdownProps) {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedOption = options.find(opt => opt.id === selectedValue);
    const displayText = selectedOption?.label || placeholder;

    const handleSelect = (value: string) => {
        onValueChange(value);
        setModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.dropdownText} numberOfLines={1}>
                    {displayText}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        item.id === selectedValue && styles.optionItemSelected,
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            item.id === selectedValue && styles.optionTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.id === selectedValue && (
                                        <Text style={styles.checkMark}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minHeight: 40,
    },
    dropdownText: {
        flex: 1,
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
    dropdownArrow: {
        fontSize: 8,
        color: '#666',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '90%',
        maxHeight: '60%',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionItemSelected: {
        backgroundColor: '#e8f5e9',
    },
    optionText: {
        fontSize: 15,
        color: '#333',
    },
    optionTextSelected: {
        color: '#1a5f2a',
        fontWeight: '600',
    },
    checkMark: {
        fontSize: 16,
        color: '#1a5f2a',
        fontWeight: 'bold',
    },
});
