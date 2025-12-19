/**
 * API Configuration for GRADUS Mobile App
 * Uses the same backend as the web application
 */

// Production API base URL
export const API_BASE_URL = 'https://api.gradusindia.in/api';

// Development API (for local testing)
export const DEV_API_BASE_URL = 'http://localhost:5000/api';

// Use production by default - localhost won't work on physical devices
// For local testing: replace localhost with your computer's IP (e.g., 192.168.x.x:5000)
const DEV_MODE = false; // Set to true only when using your machine's IP

export const getApiBaseUrl = (): string => {
    if (DEV_MODE) {
        // Replace with your computer's local IP for testing against local backend
        // Find IP: Windows: ipconfig | Mac/Linux: ifconfig
        return DEV_API_BASE_URL;
    }
    return API_BASE_URL;
};

export const config = {
    apiBaseUrl: getApiBaseUrl(),
    timeout: 30000, // 30 seconds
};
