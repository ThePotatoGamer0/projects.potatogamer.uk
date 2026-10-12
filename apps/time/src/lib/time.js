export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function timeToMs(value) {
    if (typeof value !== 'string') return NaN;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return NaN;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return NaN;
    return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

export function formatHM(totalMs) {
    const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
    const hours = Math.min(23, Math.floor(totalMinutes / 60));
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDiff(totalMs, showMs = false) {
    if (!Number.isFinite(totalMs) || totalMs <= 0) return showMs ? '00:00:00.000' : '00:00:00';
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = Math.floor(totalMs % 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const base = `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return showMs ? `${base}.${String(ms).padStart(3, '0')}` : base;
}

export function formatClock(totalMs) {
    const totalSeconds = Math.floor(Math.max(0, totalMs) / 1000) % 86400;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function clockMs(date) {
    return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 + date.getMilliseconds();
}
