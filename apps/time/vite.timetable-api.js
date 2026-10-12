import { isTimetablePayload } from './worker/src/index.js';

const store = new Map();

function send(res, status, body, type = 'application/json') {
    res.statusCode = status;
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('content-type', type);
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => resolve(raw));
        req.on('error', reject);
    });
}

function createId() {
    return Math.random().toString(36).slice(2, 12);
}

export function timetableApiPlugin() {
    return {
        name: 'timetable-kv-dev',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url || '/', 'http://localhost');
                if (url.pathname !== '/api/timetable' && !url.pathname.startsWith('/api/timetable/')) {
                    next();
                    return;
                }
                if (req.method === 'OPTIONS') {
                    send(res, 204, '');
                    return;
                }
                if (req.method === 'POST' && url.pathname === '/api/timetable') {
                    try {
                        const payload = JSON.parse(await readBody(req));
                        const raw = JSON.stringify(payload);
                        if (raw.length > 64000 || !isTimetablePayload(payload)) {
                            send(res, 400, { error: 'Invalid timetable' });
                            return;
                        }
                        const id = createId();
                        store.set(id, raw);
                        send(res, 201, { id });
                    } catch {
                        send(res, 400, { error: 'Invalid JSON' });
                    }
                    return;
                }
                if (req.method === 'GET' && url.pathname.startsWith('/api/timetable/')) {
                    const id = url.pathname.split('/').pop();
                    const stored = store.get(id);
                    if (!stored) {
                        send(res, 404, { error: 'Not found' });
                        return;
                    }
                    send(res, 200, stored);
                    return;
                }
                next();
            });
        },
    };
}
