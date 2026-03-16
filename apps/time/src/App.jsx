// src/App.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { PERIODS_LONG, PERIODS_SHORT } from './constants/periods';
import { USER_TIMETABLES } from './constants/users';
import Stars from './Stars';
import { LoadingScreen } from '@projects/ui';
import './App.css'; 

// Helper functions kept outside the component to prevent recreation
function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function formatDiff(totalMs, showMs = false) {
    if (totalMs <= 0) return showMs ? "00:00:00.000" : "00:00:00";
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = Math.floor(totalMs % 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    let base = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return showMs ? `${base}.${ms.toString().padStart(3, '0')}` : base;
}

export default function App({ navigate }) {
    const params = new URLSearchParams(window.location.search);
    const isStarsTheme = params.get('t') === 'stars';

    // Check if the app has already loaded in this browser session
    const [isLoading, setIsLoading] = useState(!window.__TIME_APP_LOADED__);
    const [isExiting, setIsExiting] = useState(false);

    // React State for things that update infrequently
    const [statusLabel, setStatusLabel] = useState("Status");
    const [previewLabel, setPreviewLabel] = useState("");
    const [isDevMode, setIsDevMode] = useState(false);
    
    // Mutable refs for tracking fast-changing data without causing React re-renders
    const timeOffsetRef = useRef(0);
    const precisionRef = useRef({
        'time-until-class': false,
        'time-until-period': false,
        'time-until-day': false
    });
    const lastStringsRef = useRef({
        'time-until-class': '',
        'time-until-period': '',
        'time-until-day': ''
    });

    // DOM Refs to target the timer elements directly
    const classTimerRef = useRef(null);
    const periodTimerRef = useRef(null);
    const dayTimerRef = useRef(null);

    // Entry Transition Effect (Only runs if not already loaded)
    useEffect(() => {
        if (!window.__TIME_APP_LOADED__) {
            const timer = setTimeout(() => {
                setIsLoading(false);
                window.__TIME_APP_LOADED__ = true; // Mark as loaded for future navigation
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    // Helper for bridging to OTHER apps (like going back to Home)
    const handleExternalNavigation = (e, url) => {
        e.preventDefault();
        setIsExiting(true);
        setTimeout(() => {
            window.location.href = url;
        }, 400);
    };

    // Initial Setup (Time Sync & Themes)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Sync Time - CORS-friendly API with a silent fallback
        const syncTime = async () => {
            try {
                const start = Date.now();
                const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC');
                if (response.ok) {
                    const data = await response.json();
                    const serverTime = new Date(data.dateTime).getTime();
                    timeOffsetRef.current = serverTime - (start + (Date.now() - start) / 2);
                }
            } catch (e) { 
                console.log("Using local system time (API sync skipped)."); 
            }
        };
        syncTime();

        // Theme Init
        const theme = urlParams.get('t');
        const bg = urlParams.get('bg');
        const txt = urlParams.get('txt');
        const presets = {
            dark: { bg: '000000', txt: 'ffffff' },
            light: { bg: 'ffffff', txt: '000000' },
            luxury: { bg: '1a2e35', txt: 'ffcc00' },
            stars: { bg: '020111', txt: 'ffffff' }
        };

        if (theme && presets[theme]) {
            document.documentElement.style.setProperty('--bg-color', `#${presets[theme].bg}`);
            document.documentElement.style.setProperty('--text-main', `#${presets[theme].txt}`);
            if (theme === 'stars') document.body.classList.add('theme-stars');
        } else if (theme === 'custom' && bg && txt) {
            document.documentElement.style.setProperty('--bg-color', `#${bg}`);
            document.documentElement.style.setProperty('--text-main', `#${txt}`);
        }

        if (urlParams.get('devt') || urlParams.get('devd')) {
            setIsDevMode(true);
        }
    }, []);

    // Performant GSAP Update Function
    const updateRollingTimer = useCallback((domRef, newStr, id, animMode) => {
        const container = domRef.current;
        if (!container) return;
        
        const oldStr = lastStringsRef.current[id];
        if (oldStr === newStr) return;

        if (precisionRef.current[id] || animMode !== 'full') {
            container.innerText = newStr;
            lastStringsRef.current[id] = newStr;
            return;
        }

        if (container.children.length !== newStr.length) {
            container.innerHTML = '';
            [...newStr].forEach(char => {
                const span = document.createElement('span');
                span.style.display = 'inline-block';
                span.innerText = char;
                container.appendChild(span);
            });
        }

        [...newStr].forEach((char, i) => {
            const span = container.children[i];
            if (span.innerText !== char) {
                gsap.to(span, {
                    y: -15,
                    opacity: 0,
                    duration: 0.15,
                    onComplete: () => {
                        span.innerText = char;
                        gsap.fromTo(span, 
                            { y: 15, opacity: 0 }, 
                            { y: 0, opacity: 1, duration: 0.2, ease: "back.out(1.7)" }
                        );
                    }
                });
            }
        });
        lastStringsRef.current[id] = newStr;
    }, []);

    // The Main 50ms Update Loop
    useEffect(() => {
        const interval = setInterval(() => {
            const currentParams = new URLSearchParams(window.location.search);
            const devTime = currentParams.get('devt');
            const devDay = currentParams.get('devd');
            const animMode = currentParams.get('anim') || 'full';
            const userParam = currentParams.get('u') || 'user1';
            
            let nowFull = new Date(Date.now() + timeOffsetRef.current);
            const day = (devDay !== null) ? parseInt(devDay) : nowFull.getDay();
            
            let currentMs;
            if (devTime) {
                const p = devTime.split(':').map(Number);
                currentMs = ((p[0] * 3600) + (p[1] * 60) + (p[2] || 0)) * 1000;
            } else {
                currentMs = (nowFull.getHours() * 3600 + nowFull.getMinutes() * 60 + nowFull.getSeconds()) * 1000 + nowFull.getMilliseconds();
            }

            const currentMins = Math.floor(currentMs / 60000);
            const schedule = (day === 0 || day === 6) ? null : ((day === 3 || day === 5) ? PERIODS_SHORT : PERIODS_LONG);
            
            if (!schedule) {
                setStatusLabel("Weekend");
                updateRollingTimer(classTimerRef, "OFF", 'time-until-class', animMode);
                document.title = "Weekend | potatogamer.uk";
                return;
            }

            const classes = USER_TIMETABLES[userParam]?.timetable[day] || {};
            const endMs = timeToMins(schedule[schedule.length - 1].end) * 60000;
            
            updateRollingTimer(dayTimerRef, formatDiff(endMs - currentMs, precisionRef.current['time-until-day']), 'time-until-day', animMode);

            let pIdx = schedule.findIndex(p => currentMins >= timeToMins(p.start) && currentMins < timeToMins(p.end));
            let p = pIdx !== -1 ? schedule[pIdx] : null;
            
            if (p) {
                updateRollingTimer(periodTimerRef, formatDiff((timeToMins(p.end) * 60000) - currentMs, precisionRef.current['time-until-period']), 'time-until-period', animMode);
            } else {
                updateRollingTimer(periodTimerRef, "--:--", 'time-until-period', animMode);
            }

            let active = (p && classes[p.id]) ? classes[p.id] : null;
            let next = schedule.find(p => timeToMins(p.start) > currentMins && classes[p.id]);

            if (active) {
                let last = p;
                for (let i = pIdx + 1; i < schedule.length; i++) {
                    if (classes[schedule[i].id] === active) last = schedule[i]; else break;
                }
                const diff = (timeToMins(last.end) * 60000) - currentMs;
                const diffText = formatDiff(diff, precisionRef.current['time-until-class']);
                
                setStatusLabel(`End of ${active}`);
                updateRollingTimer(classTimerRef, diffText, 'time-until-class', animMode);
                document.title = `${diffText} till ${active} ends | potatogamer.uk`;
            } else if (next) {
                const diff = (timeToMins(next.start) * 60000) - currentMs;
                const diffText = formatDiff(diff, precisionRef.current['time-until-class']);
                
                setStatusLabel("Next Class");
                updateRollingTimer(classTimerRef, diffText, 'time-until-class', animMode);
                document.title = `${diffText} till ${classes[next.id]} starts | potatogamer.uk`;
            } else {
                setStatusLabel("School Finished");
                updateRollingTimer(classTimerRef, "DONE", 'time-until-class', animMode);
                document.title = "School Finished | potatogamer.uk";
            }

            let up = active ? schedule.slice(pIdx + 1).find(p => classes[p.id] && classes[p.id] !== active) : next;
            setPreviewLabel((up && classes[up.id]) ? `Next Up: ${classes[up.id]}` : "");

        }, 50);

        return () => clearInterval(interval);
    }, [updateRollingTimer]);

    const togglePrecision = (id) => {
        precisionRef.current[id] = !precisionRef.current[id];
        if (id === 'time-until-class' && classTimerRef.current) classTimerRef.current.innerHTML = '';
        if (id === 'time-until-period' && periodTimerRef.current) periodTimerRef.current.innerHTML = '';
        if (id === 'time-until-day' && dayTimerRef.current) dayTimerRef.current.innerHTML = '';
    };

    return (
        <>
            <LoadingScreen isVisible={isLoading || isExiting} />

            {isStarsTheme && <Stars />}

            <button 
                id="settings-link" 
                onClick={() => navigate(`/time/settings${window.location.search}`)} 
                className="settings-btn" 
                title="Settings"
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>

            <div className="container">
                <div id="status-label" className="label">{statusLabel}</div>
                <div 
                    id="time-until-class" 
                    className="clickable-timer" 
                    ref={classTimerRef}
                    onClick={() => togglePrecision('time-until-class')}
                >
                    00:00:00
                </div>
                <div id="next-class-preview">{previewLabel}</div>

                <div className="sub-timers">
                    <div className="sub-box">
                        <div 
                            id="time-until-period" 
                            className="sub-value clickable-timer"
                            ref={periodTimerRef}
                            onClick={() => togglePrecision('time-until-period')}
                        >
                            --:--
                        </div>
                        <div className="sub-label">End of Period</div>
                    </div>
                    <div className="sub-box">
                        <div 
                            id="time-until-day" 
                            className="sub-value clickable-timer"
                            ref={dayTimerRef}
                            onClick={() => togglePrecision('time-until-day')}
                        >
                            --:--
                        </div>
                        <div className="sub-label">End of Day</div>
                    </div>
                </div>
            </div>

            {isDevMode && <div id="test-indicator" style={{ display: 'block' }}>DEVELOPMENT OVERRIDE ACTIVE</div>}
        </>
    );
}