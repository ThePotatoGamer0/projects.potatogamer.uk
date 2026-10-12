import { useEffect, useState } from 'react';
import { cacheCustomTimetable, loadPrefs, resolvePendingTimetable } from './prefs';
import { applyAppearance } from './theme';

export function useTimePrefs() {
    const [prefs] = useState(() => loadPrefs());
    const [timetable, setTimetable] = useState(() => prefs.timetable);
    const [ready, setReady] = useState(() => Boolean(prefs.timetable) || (!prefs.pendingToken && !prefs.pendingKv));
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        applyAppearance(prefs);
    }, [prefs]);

    useEffect(() => {
        if (!prefs.pendingToken && !prefs.pendingKv) return undefined;
        let cancel = false;
        resolvePendingTimetable(prefs).then((resolved) => {
            if (cancel) return;
            if (resolved) {
                setTimetable(resolved);
                setLoadError(false);
                cacheCustomTimetable(resolved, prefs);
            } else if (!prefs.timetable) {
                setLoadError(true);
            }
            setReady(true);
        });
        return () => {
            cancel = true;
        };
    }, [prefs]);

    return { prefs, timetable, ready, loadError };
}
