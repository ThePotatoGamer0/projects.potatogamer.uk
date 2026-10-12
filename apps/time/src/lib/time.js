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

function glyph(char, kind, weight = 0, radix = 10) {
    return { char, kind, weight, radix };
}

export function describeRemaining(totalMs, showMs = false) {
    const zero = showMs ? '00:00:00.000' : '00:00:00';
    if (!Number.isFinite(totalMs) || totalMs <= 0) {
        return {
            text: zero,
            glyphs: [...zero].map((char) => glyph(char, char >= '0' && char <= '9' ? 'digit' : 'sep')),
        };
    }
    const ms = Math.floor(totalMs % 1000);
    const totalSeconds = Math.floor(totalMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const glyphs = [];
    const pushDigits = (value, length, unit, { tensRadix = 10 } = {}) => {
        const chars = String(value).padStart(length, '0');
        [...chars].forEach((char, index) => {
            const place = chars.length - 1 - index;
            const radix = place === 1 ? tensRadix : 10;
            glyphs.push(glyph(char, 'digit', unit * (10 ** place), radix));
        });
    };
    const pushSep = (char) => glyphs.push(glyph(char, 'sep'));
    if (hours > 0) {
        pushDigits(hours, String(hours).length, 3600000);
        pushSep(':');
    }
    pushDigits(minutes, 2, 60000, { tensRadix: 6 });
    pushSep(':');
    pushDigits(seconds, 2, 1000, { tensRadix: 6 });
    if (showMs) {
        pushSep('.');
        pushDigits(ms, 3, 1);
    }
    return { text: glyphs.map((item) => item.char).join(''), glyphs };
}

export function formatDiff(totalMs, showMs = false) {
    return describeRemaining(totalMs, showMs).text;
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
