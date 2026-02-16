import { API_BASE_URL } from '../api/client';

export const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;

    // If it's already a full URL
    if (url.startsWith('http')) {
        // If the URL contains localhost or 10.0.2.2, but the current API_BASE_URL is different,
        // we might want to replace the host to match the current environment.
        // This helps when DB has 'http://10.0.2.2:3000/...' but we are on a device using 'http://192.168.1.5:3000/...'

        const currentBase = API_BASE_URL.replace('/api', '');

        if (url.includes('10.0.2.2') || url.includes('localhost')) {
            // Extract the path part
            const matches = url.match(/http:\/\/[^\/]+(\/.*)/);
            if (matches && matches[1]) {
                const path = matches[1];
                return `${currentBase}${path}`;
            }
        }

        return url;
    }

    // Relative path
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
