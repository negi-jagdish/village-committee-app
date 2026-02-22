import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity } from 'react-native';

const getWeatherIcon = (code: number) => {
    if (code <= 3) return { icon: '☀️', condition: 'Sunny / Clear' };
    if (code <= 48) return { icon: '⛅', condition: 'Cloudy / Fog' };
    if (code <= 67) return { icon: '🌧️', condition: 'Rainy' };
    if (code <= 77) return { icon: '❄️', condition: 'Snow' };
    if (code <= 82) return { icon: '🌦️', condition: 'Showers' };
    return { icon: '⛈️', condition: 'Thunderstorm' };
};

const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
};

export default function WeatherWidget() {
    const [weatherData, setWeatherData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [location, setLocation] = useState({ name: 'Your Village', lat: 28.6139, lon: 77.2090 });

    useEffect(() => {
        setLoading(true);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=IST&past_days=0&forecast_days=7`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                const currentCode = data.current_weather.weathercode;
                const { icon, condition } = getWeatherIcon(currentCode);

                const forecast = data.daily.time.slice(0, 7).map((time: string, i: number) => {
                    const dailyCode = data.daily.weathercode[i];
                    return {
                        day: i === 0 ? 'Today' : getDayName(time),
                        icon: getWeatherIcon(dailyCode).icon,
                        high: Math.round(data.daily.temperature_2m_max[i]),
                        low: Math.round(data.daily.temperature_2m_min[i])
                    };
                });

                const startIndex = Math.max(0, data.hourly.time.findIndex((t: string) => t >= data.current_weather.time));
                const hourly = data.hourly.time.slice(startIndex, startIndex + 24).map((time: string, i: number) => {
                    const idx = startIndex + i;
                    const date = new Date(time);
                    const hours = date.getHours();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
                    return {
                        time: i === 0 ? 'Now' : `${displayHour} ${ampm}`,
                        icon: getWeatherIcon(data.hourly.weathercode[idx]).icon,
                        temp: Math.round(data.hourly.temperature_2m[idx])
                    };
                });

                setWeatherData({
                    temp: `${Math.round(data.current_weather.temperature)}°C`,
                    condition,
                    mainIcon: icon,
                    forecast,
                    hourly,
                    author: 'Open-Meteo',
                    time: 'Updated just now'
                });
            })
            .catch(err => console.error("Weather fetch failed", err))
            .finally(() => setLoading(false));
    }, [location]);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`;
        fetch(geoUrl)
            .then(res => res.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const place = data.results[0];
                    setLocation({ name: place.name, lat: place.latitude, lon: place.longitude });
                    setSearchQuery('');
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsSearching(false));
    };

    if (loading) {
        return (
            <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', height: 200 }]}>
                <ActivityIndicator color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.bubble1} />
            <View style={styles.bubble2} />

            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <View style={styles.tagWrap}>
                        <Text style={styles.tagText}>WEATHER INFO</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 20 }}>
                        <Text style={{ fontSize: 13, color: '#fff', opacity: 0.8, marginRight: 4 }}>📍</Text>
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={location.name}
                            placeholderTextColor="rgba(255,255,255,0.9)"
                            style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: '600', padding: 0, height: 32 }}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {isSearching && <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.6 }] }} />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                        <Text style={styles.tempText}>{weatherData.temp}</Text>
                        <Text style={styles.conditionText}>  •  {weatherData.condition}</Text>
                    </View>
                </View>
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.mainIcon}>{weatherData.mainIcon}</Text>
                    <Text style={styles.authorTimeText}>Open-Meteo</Text>
                </View>
            </View>

            <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionHeading}>HOURLY FORECAST</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {weatherData.hourly.map((h: any, i: number) => (
                        <View key={`h-${i}`} style={styles.hourlyItem}>
                            <Text style={styles.hourlyTime}>{h.time}</Text>
                            <Text style={styles.forecastIcon}>{h.icon}</Text>
                            <Text style={styles.hourlyTemp}>{h.temp}°</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionHeading}>7-DAY FORECAST</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {weatherData.forecast.map((f: any, i: number) => (
                        <View key={`d-${i}`} style={[styles.forecastItem, { minWidth: 55 }]}>
                            <Text style={styles.forecastDay}>{f.day}</Text>
                            <Text style={styles.forecastIcon}>{f.icon}</Text>
                            <Text style={styles.forecastHigh}>{f.high}°</Text>
                            <Text style={styles.forecastLow}>{f.low}°</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1a6eb5',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        marginHorizontal: 12,
        marginTop: 10,
        position: 'relative',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    bubble1: {
        position: 'absolute',
        top: -30, right: -30,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.06)'
    },
    bubble2: {
        position: 'absolute',
        top: 20, right: 20,
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tagWrap: {
        backgroundColor: '#FF4444',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    tagText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    tempText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
    },
    conditionText: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    mainIcon: {
        fontSize: 48,
    },
    authorTimeText: {
        marginTop: 2,
        fontSize: 10,
        color: '#fff',
        opacity: 0.7,
        fontWeight: '500'
    },
    forecastItem: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 2,
        alignItems: 'center',
    },
    forecastDay: {
        fontSize: 10, color: '#fff', opacity: 0.8, marginBottom: 4, fontWeight: '600'
    },
    forecastIcon: { fontSize: 18, marginBottom: 4 },
    forecastHigh: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
    forecastLow: { fontSize: 10, color: '#fff', opacity: 0.7 },
    sectionHeading: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
        opacity: 0.9,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    hourlyItem: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        minWidth: 55,
    },
    hourlyTime: {
        fontSize: 10, color: '#fff', opacity: 0.8, marginBottom: 4, fontWeight: '600'
    },
    hourlyTemp: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
});
