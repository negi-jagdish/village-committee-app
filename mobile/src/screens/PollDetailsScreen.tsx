import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { pollsAPI } from '../api/client';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PollDetailsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
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

    useEffect(() => {
        loadPollDetails();
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
                if (selectedOptions.length === 0) {
                    Alert.alert('Error', 'Please select an option');
                    setVoting(false);
                    return;
                }
                voteData = { option_ids: selectedOptions };
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
        } else {
            // Multiple
            if (selectedOptions.includes(optionId)) {
                setSelectedOptions(selectedOptions.filter(id => id !== optionId));
            } else {
                setSelectedOptions([...selectedOptions, optionId]);
            }
        }
    };

    const hasVoted = userVote && userVote.length > 0;
    const isExpired = poll ? new Date() > new Date(poll.end_at) : false;
    const canVote = !hasVoted && !isExpired && poll?.status === 'active';

    if (loading || !poll) {
        return <View style={styles.center}><Text>Loading...</Text></View>;
    }

    // Calculate total votes for percentage
    const totalVotes = results.reduce((acc: number, curr: any) => acc + curr.count, 0);

    return (
        <ScrollView style={styles.container}>
            {poll.image_url && (
                <Image source={{ uri: poll.image_url }} style={styles.banner} resizeMode="cover" />
            )}

            <View style={styles.header}>
                <Text style={styles.title}>{poll.title}</Text>
                {poll.description && <Text style={styles.description}>{poll.description}</Text>}

                <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>
                        Ends: {new Date(poll.end_at).toLocaleString()}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: isExpired ? '#999' : '#4CAF50' }]}>
                        <Text style={styles.badgeText}>{isExpired ? 'Closed' : 'Active'}</Text>
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
                                        {opt.image_url && (
                                            <Image source={{ uri: opt.image_url }} style={styles.optionImage} />
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.optionRow}>
                                                <Text style={styles.optionText}>{opt.text}</Text>
                                                {(hasVoted || isExpired) && (
                                                    <Text style={styles.percentage}>{percentage.toFixed(1)}%</Text>
                                                )}
                                            </View>

                                            {(hasVoted || isExpired) && (
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
                    </View>
                )}

                {canVote && (
                    <TouchableOpacity
                        style={[styles.voteButton, (voting || (poll.poll_type !== 'text' && selectedOptions.length === 0)) && styles.disabledButton]}
                        onPress={handleVote}
                        disabled={voting || (poll.poll_type !== 'text' && selectedOptions.length === 0)}
                    >
                        <Text style={styles.voteButtonText}>{voting ? 'Submitting...' : 'Vote'}</Text>
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
});

export default PollDetailsScreen;
