export interface Tone {
    id: string;
    name: string;
    category: 'iOS' | 'Android' | 'Modern';
}

export const NOTIFICATION_TONES: Tone[] = [
    { id: 'default', name: 'System Default', category: 'Modern' },
    { id: 'Altair', name: 'Altair (Soft)', category: 'Modern' },
    { id: 'Alya', name: 'Alya (Subtle)', category: 'Android' },
    { id: 'Antares', name: 'Antares (Clear)', category: 'Android' },
    { id: 'Arcturus', name: 'Arcturus (Ping)', category: 'Android' },
    { id: 'Canopus', name: 'Canopus (Bell)', category: 'Modern' },
    { id: 'Capella', name: 'Capella (Ding)', category: 'Modern' },
    { id: 'Castor', name: 'Castor (Classic)', category: 'Modern' },
    { id: 'Deneb', name: 'Deneb (Modern)', category: 'Modern' },
    { id: 'Fomalhaut', name: 'Fomalhaut (Sparkle)', category: 'iOS' },
    { id: 'Mira', name: 'Mira (Chime)', category: 'iOS' },
    { id: 'Pollux', name: 'Pollux (Bold)', category: 'Android' },
    { id: 'Procyon', name: 'Procyon (Echo)', category: 'iOS' },
    { id: 'Spica', name: 'Spica (Short)', category: 'Modern' },
    { id: 'Talitha', name: 'Talitha (Twinkle)', category: 'iOS' },
    { id: 'Vega', name: 'Vega (Bright)', category: 'Modern' },
];
