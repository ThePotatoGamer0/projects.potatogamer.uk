import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { clockMs, formatClock, formatDiff, timeToMs, WEEKDAYS } from './lib/time';
import { describeClock } from './lib/timetable';
import { useTimePrefs } from './lib/useTimePrefs';
import Stars from './Stars';
import { LoadingScreen } from '@projects/ui';
import './App.css';

const HeroTime = memo(function HeroTime({ timerRef, onToggle }) {
    return (
        <div
            id="time-until-class"
            className="clickable-timer"
            ref={timerRef}
            onClick={onToggle}
            title="Show milliseconds"
        />
    );
});

const DayTime = memo(function DayTime({ timerRef, onToggle }) {
    return (
        <div className="sub-timers">
            <div className="sub-box">
                <div
                    id="time-until-day"
                    className="sub-value clickable-timer"
                    ref={timerRef}
                    onClick={onToggle}
                    title="Show milliseconds"
                />
                <div className="sub-label">End of day</div>
            </div>
        </div>
    );
});

function readNow(prefs, offset) {
    const now = new Date(Date.now() + offset);
    const devMs = timeToMs(prefs.devTime);
    const day = prefs.devDay === '' || prefs.devDay == null || Number.isNaN(Number(prefs.devDay))
        ? now.getDay()
        : Number(prefs.devDay);
    const currentMs = Number.isFinite(devMs) ? devMs : clockMs(now);
    return { day, currentMs };
}

function viewFrom(prefs, timetable, offset, loadError) {
    const { day, currentMs } = readNow(prefs, offset);
    const weekday = WEEKDAYS[day] || '';
    const now = formatClock(currentMs);
    if (loadError && !timetable) {
        return {
            mode: 'error',
            status: 'Timetable unavailable',
            preview: '',
            primary: { kind: 'static', text: 'OFF', slot: 'class' },
            secondary: null,
            progress: null,
            weekday,
            now,
        };
    }
    if (!timetable) {
        return {
            mode: 'loading',
            status: 'Loading',
            preview: '',
            primary: { kind: 'static', text: '--:--', slot: 'class' },
            secondary: null,
            progress: null,
            weekday,
            now,
        };
    }
    const clock = describeClock(timetable.days?.[String(day)] || [], currentMs, day);
    return { ...clock, weekday, now };
}

function primaryText(view, currentMs, precision) {
    if (view.primary.kind === 'static') return view.primary.text;
    const slot = view.primary.slot === 'day' ? 'day' : 'class';
    return formatDiff(view.primary.target - currentMs, precision[slot]);
}

export default function App({ navigate }) {
    const { prefs, timetable, loadError } = useTimePrefs();
    const [isLoading, setIsLoading] = useState(!window.__TIME_APP_LOADED__);
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState(() => viewFrom(prefs, timetable, 0, loadError));

    const timeOffsetRef = useRef(0);
    const prefsRef = useRef(prefs);
    const timetableRef = useRef(timetable);
    const loadErrorRef = useRef(loadError);
    const viewRef = useRef(view);
    const precisionRef = useRef({ class: false, day: false });
    const lastStringsRef = useRef({ class: '', day: '' });
    const titleRef = useRef('');
    const classTimerRef = useRef(null);
    const dayTimerRef = useRef(null);
    const progressRef = useRef(null);
    const tickRef = useRef(() => {});

    useLayoutEffect(() => {
        prefsRef.current = prefs;
        timetableRef.current = timetable;
        loadErrorRef.current = loadError;
        viewRef.current = view;
    });

    useEffect(() => {
        if (window.__TIME_APP_LOADED__) return undefined;
        const timer = setTimeout(() => {
            setIsLoading(false);
            window.__TIME_APP_LOADED__ = true;
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const syncTime = async () => {
            try {
                const start = Date.now();
                const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe%2FLondon');
                if (!response.ok) return;
                const data = await response.json();
                const serverTime = new Date(data.dateTime).getTime();
                timeOffsetRef.current = serverTime - (start + (Date.now() - start) / 2);
            } catch {
                timeOffsetRef.current = 0;
            }
        };
        syncTime();
    }, []);

    const updateRollingTimer = useCallback((container, nextText, id) => {
        if (!container) return;
        const previous = lastStringsRef.current[id];
        if (previous === nextText && container.textContent) return;
        const anim = prefsRef.current.anim;
        if (precisionRef.current[id] || anim !== 'full') {
            container.textContent = nextText;
            lastStringsRef.current[id] = nextText;
            return;
        }
        if (container.children.length !== nextText.length) {
            container.replaceChildren();
            [...nextText].forEach((char) => {
                const span = document.createElement('span');
                span.style.display = 'inline-block';
                span.textContent = char;
                container.appendChild(span);
            });
        }
        [...nextText].forEach((char, index) => {
            const span = container.children[index];
            if (!span || span.textContent === char) return;
            gsap.to(span, {
                y: -15,
                opacity: 0,
                duration: 0.15,
                onComplete: () => {
                    span.textContent = char;
                    gsap.fromTo(span, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'back.out(1.7)' });
                },
            });
        });
        lastStringsRef.current[id] = nextText;
    }, []);

    useLayoutEffect(() => {
        const tick = () => {
            const currentPrefs = prefsRef.current;
            const { currentMs } = readNow(currentPrefs, timeOffsetRef.current);
            const next = viewFrom(currentPrefs, timetableRef.current, timeOffsetRef.current, loadErrorRef.current);
            const previous = viewRef.current;
            if (previous.mode !== next.mode || previous.primary?.slot !== next.primary.slot) {
                lastStringsRef.current.class = '';
                lastStringsRef.current.day = '';
                classTimerRef.current?.replaceChildren();
            }

            const heroSlot = next.primary.slot === 'day' ? 'day' : 'class';
            updateRollingTimer(classTimerRef.current, primaryText(next, currentMs, precisionRef.current), heroSlot);

            if (next.secondary && dayTimerRef.current) {
                const dayText = formatDiff(next.secondary.target - currentMs, precisionRef.current.day);
                updateRollingTimer(dayTimerRef.current, dayText, 'day');
            }

            if (progressRef.current) {
                progressRef.current.style.width = next.progress == null ? '0%' : `${next.progress * 100}%`;
            }

            const hero = primaryText(next, currentMs, precisionRef.current);
            const title = next.primary.kind === 'countdown'
                ? `${hero} · ${next.status} | potatogamer.uk`
                : `${next.status} | potatogamer.uk`;
            if (titleRef.current !== title) {
                document.title = title;
                titleRef.current = title;
            }

            if (
                previous.status !== next.status
                || previous.preview !== next.preview
                || previous.mode !== next.mode
                || Boolean(previous.secondary) !== Boolean(next.secondary)
                || previous.now !== next.now
                || previous.weekday !== next.weekday
                || (previous.progress == null) !== (next.progress == null)
            ) {
                if (next.secondary && !previous.secondary) lastStringsRef.current.day = '';
                viewRef.current = next;
                setView(next);
            }
        };

        tickRef.current = tick;
        tick();
        const interval = setInterval(tick, 50);
        return () => clearInterval(interval);
    }, [updateRollingTimer]);

    useEffect(() => {
        tickRef.current();
    }, [timetable, loadError]);

    useLayoutEffect(() => {
        if (!view.secondary) return;
        tickRef.current();
    }, [view.secondary]);

    const togglePrecision = useCallback((slot) => {
        precisionRef.current[slot] = !precisionRef.current[slot];
        const node = slot === 'day' && viewRef.current.primary?.slot !== 'day'
            ? dayTimerRef.current
            : classTimerRef.current;
        if (node) node.replaceChildren();
        lastStringsRef.current[slot] = '';
        tickRef.current();
    }, []);

    const toggleHero = useCallback(() => {
        togglePrecision(viewRef.current.primary?.slot === 'day' ? 'day' : 'class');
    }, [togglePrecision]);

    const toggleDay = useCallback(() => togglePrecision('day'), [togglePrecision]);

    const copyLink = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const input = document.createElement('textarea');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    };

    const devActive = Boolean(prefs.devTime) || (prefs.devDay !== '' && prefs.devDay != null);

    return (
        <>
            <LoadingScreen isVisible={isLoading} />
            {prefs.theme === 'stars' && <Stars />}

            <button
                type="button"
                className="settings-btn"
                onClick={() => navigate(`/time/settings${window.location.search}`)}
                title="Settings"
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>

            <button type="button" className="share-btn" onClick={copyLink} title="Copy link">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {copied && <span className="copied-toast">Link copied</span>}
            </button>

            <div className="container">
                <div className="now-line">{view.weekday} · {view.now}</div>
                <div className="label label-swap" key={view.status}>{view.status}</div>
                <HeroTime timerRef={classTimerRef} onToggle={toggleHero} />
                <div className={`progress-track${view.progress == null ? ' is-off' : ''}`} aria-hidden="true">
                    <div className="progress-fill" ref={progressRef} />
                </div>
                <div id="next-class-preview">{view.preview}</div>
                {view.secondary && <DayTime timerRef={dayTimerRef} onToggle={toggleDay} />}
            </div>

            {devActive && <div id="test-indicator">Development override active</div>}
        </>
    );
}
