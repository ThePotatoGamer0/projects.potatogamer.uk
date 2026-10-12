import { DAY_IDS, cloneTimetable } from './timetable.js';

export const URL_TOKEN_BUDGET = 1800;

export function toPayload(timetable) {
    const days = {};
    for (const day of DAY_IDS) {
        const blocks = timetable?.days?.[day] || [];
        if (!blocks.length) continue;
        days[day] = blocks.map((block) => {
            const name = (block.name || '').trim();
            if (block.kind === 'break' && (name === '' || name === 'Break')) {
                return ['b', block.start, block.end];
            }
            if (block.kind === 'break') return ['b', block.start, block.end, name];
            return ['c', name || 'Class', block.start, block.end];
        });
    }
    return {
        n: (timetable?.name || 'My timetable').trim().slice(0, 80) || 'My timetable',
        d: days,
    };
}

export function fromPayload(payload) {
    if (!payload || typeof payload !== 'object' || !payload.d || typeof payload.d !== 'object') return null;
    const days = {};
    for (const day of DAY_IDS) {
        const rows = Array.isArray(payload.d[day]) ? payload.d[day] : [];
        days[day] = rows.map((row) => {
            if (!Array.isArray(row) || row.length < 3) return null;
            if (row[0] === 'b') {
                return {
                    name: row[3] || 'Break',
                    start: String(row[1] || ''),
                    end: String(row[2] || ''),
                    kind: 'break',
                };
            }
            if (row[0] === 'c') {
                return {
                    name: String(row[1] || 'Class'),
                    start: String(row[2] || ''),
                    end: String(row[3] || ''),
                    kind: 'class',
                };
            }
            return {
                name: String(row[0] || 'Class'),
                start: String(row[1] || ''),
                end: String(row[2] || ''),
                kind: 'class',
            };
        }).filter(Boolean);
    }
    return cloneTimetable({ name: payload.n || 'My timetable', days });
}

function bytesToBase64Url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + pad);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
}

export function encodeTimetable(timetable) {
    return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(toPayload(timetable))));
}

export function decodeTimetable(token) {
    if (!token || token.startsWith('z.')) return null;
    try {
        const json = new TextDecoder().decode(base64UrlToBytes(token));
        return fromPayload(JSON.parse(json));
    } catch {
        return null;
    }
}

async function compressedToken(timetable) {
    if (typeof CompressionStream === 'undefined') return null;
    const json = JSON.stringify(toPayload(timetable));
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return `z.${bytesToBase64Url(bytes)}`;
}

export async function encodeTimetableForUrl(timetable) {
    const plain = encodeTimetable(timetable);
    try {
        const packed = await compressedToken(timetable);
        if (packed && packed.length < plain.length) return packed;
    } catch {
        // Keep the uncompressed token when the browser cannot compress it.
    }
    return plain;
}

export async function decodeTimetableAny(token) {
    if (!token) return null;
    if (!token.startsWith('z.')) return decodeTimetable(token);
    if (typeof DecompressionStream === 'undefined') return null;
    try {
        const bytes = base64UrlToBytes(token.slice(2));
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        const json = await new Response(stream).text();
        return fromPayload(JSON.parse(json));
    } catch {
        return null;
    }
}
