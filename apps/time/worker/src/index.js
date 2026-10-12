function json(response, status = 200) {
    return new Response(JSON.stringify(response), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function withCors(response) {
    const headers = new Headers(response.headers);
    headers.set('access-control-allow-origin', '*');
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set('access-control-allow-headers', 'content-type');
    headers.set('access-control-max-age', '86400');
    return new Response(response.body, { status: response.status, headers });
}

function createId() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimetablePayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (typeof value.n !== 'string' || value.n.length > 80) return false;
    if (!value.d || typeof value.d !== 'object' || Array.isArray(value.d)) return false;
    const days = Object.keys(value.d);
    if (days.some((day) => !['0', '1', '2', '3', '4', '5', '6'].includes(day))) return false;
    return days.every((day) => {
        const blocks = value.d[day];
        if (!Array.isArray(blocks) || blocks.length > 48) return false;
        return blocks.every((block) => {
            if (!Array.isArray(block) || (block[0] !== 'b' && block[0] !== 'c')) return false;
            const start = block[0] === 'b' ? block[1] : block[2];
            const end = block[0] === 'b' ? block[2] : block[3];
            const name = block[0] === 'b' ? block[3] : block[1];
            if (typeof start !== 'string' || typeof end !== 'string' || !TIME.test(start) || !TIME.test(end)) return false;
            if (name != null && (typeof name !== 'string' || name.length > 80)) return false;
            return true;
        });
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));

        const id = url.pathname.split('/').filter(Boolean).pop() || '';

        if (request.method === 'POST') {
            let payload;
            try {
                payload = await request.json();
            } catch {
                return withCors(json({ error: 'Invalid JSON' }, 400));
            }
            const raw = JSON.stringify(payload);
            if (raw.length > 64000 || !isTimetablePayload(payload)) {
                return withCors(json({ error: 'Invalid timetable' }, 400));
            }
            const key = createId();
            await env.TIMETABLES.put(key, raw, { expirationTtl: 60 * 60 * 24 * 365 });
            return withCors(json({ id: key }, 201));
        }

        if (request.method === 'GET') {
            if (!/^[a-z0-9]{6,32}$/.test(id)) return withCors(json({ error: 'Not found' }, 404));
            const stored = await env.TIMETABLES.get(id);
            if (!stored) return withCors(json({ error: 'Not found' }, 404));
            return withCors(new Response(stored, {
                headers: {
                    'content-type': 'application/json',
                    'cache-control': 'public, max-age=60',
                },
            }));
        }

        return withCors(json({ error: 'Not found' }, 404));
    },
};
