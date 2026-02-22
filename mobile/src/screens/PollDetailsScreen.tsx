import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { pollsAPI, API_BASE_URL } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useTheme } from '../theme/ThemeContext';

const PollDetailsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { colors, isDark } = useTheme();
    const { pollId } = route.params as { pollId: number };
    const [poll, setPoll] = useState<any>(null);
    const [options, setOptions] = useState<any[]>([]);
    const [userVote, setUserVote] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);

    // Form state
    const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
    const [textResponse, setTextResponse] = useState('');
    const [isCustomSelected, setIsCustomSelected] = useState(false); // For "Other" option

    const user = useSelector((state: RootState) => state.auth.user);
    const canEdit = user?.role === 'president' || user?.role === 'secretary';
    const isPresident = user?.role === 'president';

    useEffect(() => {
        loadPollDetails();
    }, [pollId]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadPollDetails();
        });
        return unsubscribe;
    }, [pollId]);

    const loadPollDetails = async () => {
        try {
            setLoading(true);
            const response = await pollsAPI.getDetails(pollId);
            setPoll(response.data.poll);
            setOptions(response.data.options);
            setUserVote(response.data.userVote || []);
            setResults(response.data.results || []);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load poll details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async () => {
        try {
            setVoting(true);
            let voteData: any = {};

            if (poll.poll_type === 'text') {
                if (!textResponse.trim()) {
                    Alert.alert('Error', 'Please enter your response');
                    setVoting(false);
                    return;
                }
                voteData = { text_response: textResponse };
            } else {
                // Choice based (Single/Multiple)
                if (isCustomSelected) {
                    if (!textResponse.trim()) {
                        Alert.alert('Error', 'Please enter your custom answer');
                        setVoting(false);
                        return;
                    }
                    voteData.text_response = textResponse;

                    // For single choice, we shouldn't send option_ids if custom is selected
                    // The backend checks for exclusive OR for single choice
                }

                if (selectedOptions.length > 0) {
                    voteData.option_ids = selectedOptions;
                }

                if (!isCustomSelected && selectedOptions.length === 0) {
                    Alert.alert('Error', 'Please select an option or provide a custom answer');
                    setVoting(false);
                    return;
                }
            }

            await pollsAPI.vote(pollId, voteData);
            Alert.alert('Success', 'Vote cast successfully');
            loadPollDetails(); // Refresh to show results
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to cast vote');
        } finally {
            setVoting(false);
        }
    };

    const toggleOption = (optionId: number) => {
        if (poll.poll_type === 'single') {
            setSelectedOptions([optionId]);
            setIsCustomSelected(false); // Deselect custom if standard option picked
        } else {
            // Multiple
            if (selectedOptions.includes(optionId)) {
                setSelectedOptions(selectedOptions.filter(id => id !== optionId));
            } else {
                setSelectedOptions([...selectedOptions, optionId]);
            }
        }
    };

    const toggleCustom = () => {
        if (poll.poll_type === 'single') {
            setIsCustomSelected(true);
            setSelectedOptions([]); // Clear options if custom selected
        } else {
            setIsCustomSelected(!isCustomSelected);
        }
    };

    const handleEdit = () => {
        navigation.navigate('EditPoll', { pollId: poll.id });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Poll',
            'Are you sure you want to delete this poll? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await pollsAPI.delete(pollId);
                            Alert.alert('Success', 'Poll deleted successfully');
                            navigation.goBack();
                        } catch (error: any) {
                            console.error(error);
                            Alert.alert('Error', error.response?.data?.message || 'Failed to delete poll');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const hasVoted = userVote && userVote.length > 0;
    const isExpired = poll ? new Date() > new Date(poll.end_at) : false;
    const isActive = !isExpired && (poll?.status === 'active' || !poll?.status || poll?.status === 'draft');
    // Allow changing votes - user can vote again before poll ends
    const canVote = !isExpired && isActive;

    if (loading || !poll) {
        return <View style={styles.center}><Text>Loading...</Text></View>;
    }

    // Calculate total votes for percentage
    const totalVotes = results.reduce((acc: number, curr: any) => acc + curr.count, 0);

    const hasMedia = poll.image_url && poll.image_url.length > 0;
    const heroImage = hasMedia
        ? (poll.image_url.startsWith('http')
            ? poll.image_url
            : `${API_BASE_URL.replace('/api', '')}/${poll.image_url}`)
        : null;

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {heroImage && (
                <Image source={{ uri: heroImage }} style={styles.banner} resizeMode="cover" />
            )}

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.title, { flex: 1 }]}>{poll.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {canEdit && (
                            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                                <Icon name="edit" size={24} color="#1a5f2a" />
                            </TouchableOpacity>
                        )}
                        {isPresident && (
                            <TouchableOpacity onPress={handleDelete} style={styles.editButton}>
                                <Icon name="delete" size={24} color="#d32f2f" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                {poll.description && <Text style={styles.description}>{poll.description}</Text>}

                <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>
                        Ends: {new Date(poll.end_at).toLocaleString()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {!poll.is_anonymous && (
                            <TouchableOpacity
                                style={[styles.badge, { backgroundColor: '#2196F3' }]}
                                onPress={() => navigation.navigate('PollVotes', { pollId })}
                            >
                                <Text style={styles.badgeText}>View Votes</Text>
                            </TouchableOpacity>
                        )}
                        <View style={[styles.badge, { backgroundColor: isExpired ? '#999' : '#4CAF50' }]}>
                            <Text style={styles.badgeText}>{isExpired ? 'Closed' : 'Active'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                {poll.poll_type === 'text' ? (
                    <View>
                        {hasVoted ? (
                            <View style={styles.votedContainer}>
                                <Text style={styles.votedTitle}>Your Response:</Text>
                                <Text style={styles.votedText}>{userVote[0].text_response}</Text>
                            </View>
                        ) : canVote ? (
                            <View>
                                <Text style={styles.label}>Write your response:</Text>
                                <TextInput
                                    style={styles.input}
                                    multiline
                                    numberOfLines={4}
                                    value={textResponse}
                                    onChangeText={setTextResponse}
                                    placeholder="Type here..."
                                />
                            </View>
                        ) : (
                            <Text>Voting is closed.</Text>
                        )}
                    </View>
                ) : (
                    <View>
                        {options.map((opt) => {
                            const result = results.find((r: any) => r.option_id === opt.id);
                            const count = result ? result.count : 0;
                            const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                            const isSelected = selectedOptions.includes(opt.id);
                            const isUserChoice = userVote.some((v: any) => v.option_id === opt.id);

                            // Only show results if enabled or expired or admin
                            const showStats = (poll.show_results || isExpired || canEdit) && (hasVoted || isExpired);

                            const hasOptMedia = opt.image_url && opt.image_url.length > 0;
                            const optHeroImage = hasOptMedia
                                ? (opt.image_url.startsWith('http')
                                    ? opt.image_url
                                    : `${API_BASE_URL.replace('/api', '')}/${opt.image_url}`)
                                : null;

                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.optionCard,
                                        isSelected && styles.optionSelected,
                                        isUserChoice && styles.userChoiceCard
                                    ]}
                                    onPress={() => canVote && toggleOption(opt.id)}
                                    disabled={!canVote}
                                >
                                    <View style={styles.optionContent}>
                                        {optHeroImage && (
                                            <Image source={{ uri: optHeroImage }} style={styles.optionImage} />
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.optionRow}>
                                                <Text style={styles.optionText}>{opt.text}</Text>
                                                {showStats && (
                                                    <Text style={styles.percentage}>{percentage.toFixed(1)}%</Text>
                                                )}
                                            </View>

                                            {showStats && (
                                                <View style={styles.progressBarBg}>
                                                    <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                                                </View>
                                            )}

                                            {isUserChoice && <Text style={styles.votedBadge}>You voted for this</Text>}
                                        </View>

                                        {canVote && (
                                            <Icon
                                                name={poll.poll_type === 'multiple'
                                                    ? (isSelected ? 'check-box' : 'check-box-outline-blank')
                                                    : (isSelected ? 'radio-button-checked' : 'radio-button-unchecked')
                                                }
                                                size={24}
                                                color={isSelected ? '#2196F3' : '#757575'}
                                            />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Custom Answer Option */}
                        {!!poll.allow_custom_answer && (
                            <View>
                                <TouchableOpacity
                                    style={[
                                        styles.optionCard,
                                        isCustomSelected && styles.optionSelected,
                                        // Check if user voted with custom text
                                        userVote.some(v => v.text_response) && styles.userChoiceCard
                                    ]}
                                    onPress={() => canVote && toggleCustom()}
                                    disabled={!canVote}
                                >
                                    <View style={styles.optionContent}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.optionText}>Other (Type your answer)</Text>
                                            {userVote.some(v => v.text_response) && <Text style={styles.votedBadge}>You voted: "{userVote[0].text_response}"</Text>}
                                        </View>
                                        <Icon
                                            name={poll.poll_type === 'multiple'
                                                ? (isCustomSelected ? 'check-box' : 'check-box-outline-blank')
                                                : (isCustomSelected ? 'radio-button-checked' : 'radio-button-unchecked')
                                            }
                                            size={24}
                                            color={isCustomSelected ? '#2196F3' : '#757575'}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {isCustomSelected && (
                                    <TextInput
                                        style={[styles.input, { height: 60, marginTop: -8, marginBottom: 12 }]}
                                        placeholder="Type your answer here..."
                                        value={textResponse}
                                        onChangeText={setTextResponse}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                )}

                {canVote && (
                    <TouchableOpacity
                        style={[styles.voteButton, (voting || (poll.poll_type !== 'text' && selectedOptions.length === 0 && !isCustomSelected)) && styles.disabledButton]}
                        onPress={handleVote}
                        disabled={voting || (poll.poll_type !== 'text' && selectedOptions.length === 0 && !isCustomSelected)}
                    >
                        <Text style={styles.voteButtonText}>
                            {voting ? 'Submitting...' : (hasVoted ? 'Change Vote' : 'Vote')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    banner: { width: '100%', height: 200 },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    description: { fontSize: 16, color: '#666', marginTop: 8 },
    metaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    metaText: { fontSize: 14, color: '#888' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    content: { padding: 16 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 100, textAlignVertical: 'top' },
    optionCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
    optionSelected: { borderColor: '#2196F3', backgroundColor: '#e3f2fd' },
    userChoiceCard: { borderColor: '#4CAF50', borderWidth: 2 },
    optionContent: { flexDirection: 'row', alignItems: 'center' },
    optionImage: { width: 50, height: 50, borderRadius: 4, marginRight: 12 },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    optionText: { fontSize: 16, fontWeight: '500', color: '#333' },
    percentage: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    progressBarBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#2196F3' },
    votedBadge: { fontSize: 12, color: '#4CAF50', marginTop: 4, fontWeight: 'bold' },
    voteButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
    disabledButton: { backgroundColor: '#B0BEC5' },
    voteButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    votedContainer: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 8 },
    votedTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 },
    votedText: { fontSize: 16, color: '#333' },
    editButton: { padding: 8 },
});

export default PollDetailsScreen;
