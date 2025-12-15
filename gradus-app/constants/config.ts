/**
 * API base resolution:
 * 1) If running on web localhost, default to local API (port 5000)
 * 2) EXPO_PUBLIC_API_BASE_URL (preferred override)
 * 3) Fallback to live API (https://api.gradusindia.in)
 *
 * For device testing against your LAN backend, set EXPO_PUBLIC_API_BASE_URL to
 * something like http://192.168.x.x:5000 in .env or your shell.
 */
const envBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
const envWebBase = (process.env.EXPO_PUBLIC_WEB_BASE_URL || '').trim();
const isLocalHost = (host: string | undefined) =>
  !!host && (host === 'localhost' || host.startsWith('127.') || host.endsWith('.local'));

const webLocalBase =
  typeof window !== 'undefined' && window.location && isLocalHost(window.location.hostname)
    ? 'http://localhost:5000'
    : null;

// const rawBase = webLocalBase || envBase || 'https://api.gradusindia.in';
const rawBase = 'https://api.gradusindia.in'; // Hardcoded for device testing

export const API_BASE_URL = rawBase.replace(/\/+$/, '');
export const WEB_BASE_URL = (envWebBase || 'https://gradusindia.in').replace(/\/+$/, '');
