export interface Tone {
    id: string;
    name: string;
    category: 'iOS' | 'Android' | 'Modern';
}

export const NOTIFICATION_TONES: Tone[] = [
    { id: 'default', name: 'System Default', category: 'Modern' },
    { id: 'altair', name: 'Altair (Soft)', category: 'Modern' },
    { id: 'alya', name: 'Alya (Subtle)', category: 'Android' },
    { id: 'antares', name: 'Antares (Clear)', category: 'Android' },
    { id: 'arcturus', name: 'Arcturus (Ping)', category: 'Android' },
    { id: 'canopus', name: 'Canopus (Bell)', category: 'Modern' },
    { id: 'capella', name: 'Capella (Ding)', category: 'Modern' },
    { id: 'castor', name: 'Castor (Classic)', category: 'Modern' },
    { id: 'deneb', name: 'Deneb (Modern)', category: 'Modern' },
    { id: 'fomalhaut', name: 'Fomalhaut (Sparkle)', category: 'iOS' },
    { id: 'mira', name: 'Mira (Chime)', category: 'iOS' },
    { id: 'pollux', name: 'Pollux (Bold)', category: 'Android' },
    { id: 'procyon', name: 'Procyon (Echo)', category: 'iOS' },
    { id: 'spica', name: 'Spica (Short)', category: 'Modern' },
    { id: 'talitha', name: 'Talitha (Twinkle)', category: 'iOS' },
    { id: 'vega', name: 'Vega (Bright)', category: 'Modern' },
];
