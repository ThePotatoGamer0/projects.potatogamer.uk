import { URL_TOKEN_BUDGET, decodeTimetable, decodeTimetableAny, encodeTimetableForUrl } from './codec';
import { loadTimetable, saveTimetable } from './kv';
import { DEFAULT_PRESET_ID, getPreset } from './timetable';

const STORAGE_KEY = 'potatogamer.time.prefs';
const TRACKED = ['t', 'bg', 'txt', 'u', 'anim', 'dev', 'devt', 'devd', 'tt', 'k', 'ttl', 'stars'];

function readStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeStore(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // A full browser store should not block the link, which is the source of truth.
    }
}

function reducedMotion() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function paramsFrom(source) {
    const values = {};
    for (const key of TRACKED) {
        const value = source?.[key];
        if (value != null && value !== '') values[key] = String(value);
    }
    return values;
}

function urlParams() {
    const params = new URLSearchParams(window.location.search);
    const values = {};
    for (const key of TRACKED) {
        if (params.has(key)) values[key] = params.get(key);
    }
    return values;
}

export function reflectStoredPrefs() {
    const current = urlParams();
    if (Object.keys(current).length > 0) return false;
    const stored = readStore();
    const values = paramsFrom(stored?.params);
    if (Object.keys(values).length === 0) return false;
    const next = new URLSearchParams(values);
    window.history.replaceState({}, '', `${window.location.pathname}?${next.toString()}`);
    return true;
}

function remember(params, timetable, kvId) {
    writeStore({
        params,
        timetable: timetable || null,
        kvId: kvId || '',
    });
}

export function cacheCustomTimetable(timetable, prefs) {
    const stored = readStore() || {};
    remember(stored.params || urlParams(), timetable, prefs?.kvId || stored.kvId || '');
}

function buildPrefs(values, stored) {
    const theme = values.t || 'custom';
    const bg = (values.bg || '000000').replace('#', '');
    const txt = (values.txt || 'ffffff').replace('#', '');
    const userId = values.u || DEFAULT_PRESET_ID;
    const anim = values.anim || (reducedMotion() ? 'minimal' : 'full');
    const base = {
        theme,
        bg,
        txt,
        userId,
        anim,
        dev: values.dev === '1',
        devTime: values.devt || '',
        devDay: values.devd ?? '',
        starsUnlocked: values.stars === '1' || theme === 'stars',
        kvId: values.k || '',
        pendingToken: '',
        pendingKv: '',
        localOnly: values.ttl === '1',
        mode: 'preset',
        timetable: null,
    };

    if (values.tt) {
        base.mode = 'custom';
        if (values.tt.startsWith('z.')) {
            base.pendingToken = values.tt;
            base.timetable = stored?.timetable || null;
        } else {
            base.timetable = decodeTimetable(values.tt);
        }
        return base;
    }

    if (values.k) {
        base.mode = 'custom';
        base.pendingKv = values.k;
        if (stored?.kvId === values.k && stored.timetable) base.timetable = stored.timetable;
        return base;
    }

    if (values.ttl === '1' && stored?.timetable) {
        base.mode = 'custom';
        base.timetable = stored.timetable;
        return base;
    }

    base.timetable = getPreset(userId);
    return base;
}

export function loadPrefs() {
    const fromUrl = urlParams();
    const stored = readStore();
    const values = Object.keys(fromUrl).length > 0 ? fromUrl : paramsFrom(stored?.params);
    const prefs = buildPrefs(values, stored);
    if (Object.keys(fromUrl).length > 0) {
        remember(fromUrl, prefs.mode === 'custom' ? prefs.timetable : null, prefs.kvId);
    }
    return prefs;
}

export function forgetDevOverrides() {
    const params = new URLSearchParams(window.location.search);
    params.delete('devt');
    params.delete('devd');
    const search = params.toString();
    window.history.pushState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
    const stored = readStore();
    if (!stored?.params) return;
    delete stored.params.devt;
    delete stored.params.devd;
    writeStore(stored);
}

export async function resolvePendingTimetable(prefs) {
    if (prefs.pendingToken) return decodeTimetableAny(prefs.pendingToken);
    if (prefs.pendingKv) return loadTimetable(prefs.pendingKv);
    return prefs.timetable;
}

export async function commitPrefs(draft) {
    const params = new URLSearchParams();
    params.set('t', draft.theme || 'custom');
    params.set('bg', String(draft.bg || '000000').replace('#', ''));
    params.set('txt', String(draft.txt || 'ffffff').replace('#', ''));
    if (draft.anim && draft.anim !== 'full') params.set('anim', draft.anim);
    if (draft.dev) params.set('dev', '1');
    if (draft.devTime) params.set('devt', draft.devTime);
    if (draft.devDay !== '' && draft.devDay != null) params.set('devd', String(draft.devDay));
    if (draft.starsUnlocked || draft.theme === 'stars') params.set('stars', '1');

    let storage = 'url';
    let message = 'Saved in this link. Bookmark it or share it to keep these settings.';
    let timetable = null;

    if (draft.mode === 'custom') {
        timetable = draft.timetable;
        const token = await encodeTimetableForUrl(timetable);
        if (token.length <= URL_TOKEN_BUDGET) {
            params.set('tt', token);
        } else {
            const id = await saveTimetable(timetable);
            if (id) {
                params.set('k', id);
                storage = 'kv';
                message = 'This timetable is too big for a link, so it was saved in Cloudflare KV. The link keeps a short id that loads it back.';
            } else {
                params.set('ttl', '1');
                storage = 'device';
                message = 'This timetable is too big for a link, and cloud save is unavailable. It is stored on this device only.';
            }
        }
    } else {
        params.set('u', draft.userId || DEFAULT_PRESET_ID);
    }

    const search = params.toString();
    window.history.pushState({}, '', `${window.location.pathname}?${search}`);
    remember(Object.fromEntries(params.entries()), timetable, params.get('k') || '');
    return { storage, message, search };
}
