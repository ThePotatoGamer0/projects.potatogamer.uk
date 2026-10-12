import { fromPayload, toPayload } from './codec';

function kvBase() {
    const configured = import.meta.env.VITE_TIMETABLE_KV_URL;
    if (configured) return configured.replace(/\/$/, '');
    if (import.meta.env.DEV) return '/api/timetable';
    return '';
}

export function kvAvailable() {
    return Boolean(kvBase());
}

export async function saveTimetable(timetable) {
    const base = kvBase();
    if (!base) return null;
    try {
        const response = await fetch(base, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toPayload(timetable)),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data.id === 'string' ? data.id : null;
    } catch {
        return null;
    }
}

export async function loadTimetable(id) {
    const base = kvBase();
    if (!base || !id) return null;
    try {
        const response = await fetch(`${base}/${encodeURIComponent(id)}`);
        if (!response.ok) return null;
        return fromPayload(await response.json());
    } catch {
        return null;
    }
}
