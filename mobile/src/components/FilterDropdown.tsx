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
import { useTheme } from '../theme/ThemeContext';

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
    const { colors, isDark } = useTheme();

    const selectedOption = options.find(opt => opt.id === selectedValue);
    const displayText = selectedOption?.label || placeholder;

    const handleSelect = (value: string) => {
        onValueChange(value);
        setModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.dropdownButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={1}>
                    {displayText}
                </Text>
                <Text style={[styles.dropdownArrow, { color: colors.textTertiary }]}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        { borderBottomColor: colors.borderLight },
                                        item.id === selectedValue && [styles.optionItemSelected, { backgroundColor: colors.primaryLight }],
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            { color: colors.text },
                                            item.id === selectedValue && { color: colors.primary, fontWeight: '600' },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.id === selectedValue && (
                                        <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>
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
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        minHeight: 40,
    },
    dropdownText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    dropdownArrow: {
        fontSize: 8,
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
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
    },
    optionItemSelected: {},
    optionText: {
        fontSize: 15,
    },
    checkMark: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
