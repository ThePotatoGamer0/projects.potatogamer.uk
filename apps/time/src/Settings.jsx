import { useEffect, useMemo, useRef, useState } from 'react';
import iro from '@jaames/iro';
import TimetableEditor, { TimetablePreview } from './components/TimetableEditor';
import { forgetDevOverrides, commitPrefs } from './lib/prefs';
import { applyAppearance, resolveColors } from './lib/theme';
import { DAY_IDS, cloneTimetable, emptyTimetable, getPreset, listPresets, normalizeTimetable, validateTimetable } from './lib/timetable';
import { useTimePrefs } from './lib/useTimePrefs';
import { LoadingScreen } from '@projects/ui';
import './App.css';

const PRESETS = listPresets();

export default function Settings({ navigate }) {
    const { prefs, timetable, loadError } = useTimePrefs();
    const [isLoading, setIsLoading] = useState(!window.__TIME_APP_LOADED__);
    const [isExiting, setIsExiting] = useState(false);
    const [showHomeModal, setShowHomeModal] = useState(false);
    const [showDevModal, setShowDevModal] = useState(false);
    const [showStarsModal, setShowStarsModal] = useState(false);
    const [activeTab, setActiveTab] = useState('theme');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [issues, setIssues] = useState([]);

    const [preset, setPreset] = useState(prefs.theme || 'custom');
    const [bgColor, setBgColor] = useState(`#${prefs.bg || '000000'}`);
    const [txtColor, setTxtColor] = useState(`#${prefs.txt || 'ffffff'}`);
    const [selectedUser, setSelectedUser] = useState(prefs.userId);
    const [mode, setMode] = useState(prefs.mode);
    const [custom, setCustom] = useState(() => (
        prefs.mode === 'custom' && prefs.timetable ? cloneTimetable(prefs.timetable) : emptyTimetable()
    ));
    const [animLevel, setAnimLevel] = useState(prefs.anim || 'full');
    const [devTime, setDevTime] = useState(prefs.devTime || '');
    const [devDay, setDevDay] = useState(prefs.devDay || '');
    const [devUnlocked, setDevUnlocked] = useState(prefs.dev);
    const [starsUnlocked, setStarsUnlocked] = useState(prefs.starsUnlocked);

    const bgWheelRef = useRef(null);
    const txtWheelRef = useRef(null);
    const colorSeed = useRef({ bg: `#${prefs.bg || '000000'}`.toLowerCase(), txt: `#${prefs.txt || 'ffffff'}`.toLowerCase() });
    const themeClickCount = useRef(0);
    const devClickCount = useRef(0);
    const edited = useRef(false);

    const previewTimetable = useMemo(() => getPreset(selectedUser), [selectedUser]);
    const colors = resolveColors({ theme: preset, bg: bgColor, txt: txtColor });

    useEffect(() => {
        if (window.__TIME_APP_LOADED__) return undefined;
        const timer = setTimeout(() => {
            setIsLoading(false);
            window.__TIME_APP_LOADED__ = true;
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (edited.current || prefs.mode !== 'custom' || !timetable) return;
        setCustom(cloneTimetable(timetable));
    }, [prefs.mode, timetable]);

    useEffect(() => {
        const bgNode = bgWheelRef.current;
        const txtNode = txtWheelRef.current;
        if (!bgNode || !txtNode) return undefined;
        bgNode.replaceChildren();
        txtNode.replaceChildren();
        const bgPicker = new iro.ColorPicker(bgNode, { width: 150, color: colorSeed.current.bg });
        const txtPicker = new iro.ColorPicker(txtNode, { width: 150, color: colorSeed.current.txt });
        const watch = (picker, key, setColor) => {
            picker.on('color:change', (color) => {
                const next = color.hexString.toLowerCase();
                if (next === colorSeed.current[key]) return;
                colorSeed.current[key] = next;
                setPreset('custom');
                setColor(color.hexString);
            });
        };
        watch(bgPicker, 'bg', setBgColor);
        watch(txtPicker, 'txt', setTxtColor);
        return () => {
            bgNode.replaceChildren();
            txtNode.replaceChildren();
        };
    }, []);

    const editCustom = (next) => {
        edited.current = true;
        setCustom(next);
        setSaveMessage('');
    };

    const handleTitleClick = () => {
        devClickCount.current += 1;
        if (devClickCount.current === 5) {
            setDevUnlocked(true);
            setShowDevModal(true);
        }
    };

    const handleThemeTabClick = () => {
        setActiveTab('theme');
        themeClickCount.current += 1;
        if (themeClickCount.current === 7 && !starsUnlocked) {
            setStarsUnlocked(true);
            setPreset('stars');
            setShowStarsModal(true);
        }
    };

    const usePresetCopy = () => {
        const hasBlocks = DAY_IDS.some((day) => custom.days[day]?.length);
        if (hasBlocks && !window.confirm('Replace your custom timetable with a copy of this preset?')) return;
        edited.current = true;
        setCustom(cloneTimetable(previewTimetable));
        setMode('custom');
        setIssues([]);
        setSaveMessage('');
    };

    const saveSettings = async () => {
        const nextIssues = mode === 'custom' ? validateTimetable(custom) : [];
        setIssues(nextIssues);
        if (nextIssues.some((issue) => !issue.overlap)) {
            setSaveMessage('Fix the block times before saving.');
            setActiveTab('timetable');
            return;
        }

        setSaving(true);
        try {
            const result = await commitPrefs({
                theme: preset,
                bg: bgColor,
                txt: txtColor,
                anim: animLevel,
                dev: devUnlocked,
                devTime,
                devDay,
                starsUnlocked,
                mode,
                userId: selectedUser,
                timetable: mode === 'custom' ? normalizeTimetable(custom) : null,
            });
            applyAppearance({ theme: preset, bg: bgColor, txt: txtColor, anim: animLevel });
            const overlap = nextIssues.some((issue) => issue.overlap);
            setSaveMessage(overlap ? `${result.message} Overlapping blocks were kept.` : result.message);
        } finally {
            setSaving(false);
        }
    };

    const clearDevOverrides = () => {
        setDevTime('');
        setDevDay('');
        forgetDevOverrides();
    };

    const handleExternalNavigation = (event, url) => {
        event.preventDefault();
        setIsExiting(true);
        setTimeout(() => {
            window.location.href = url;
        }, 400);
    };

    const renderIconLinks = (className) => (
        <div className={className}>
            <a onClick={() => setShowHomeModal(true)} title="Return to Main Site" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--text-main)'; }} onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--text-dim)'; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </a>
            <a href="https://github.com/thepotatogamer0/time" target="_blank" rel="noreferrer" title="GitHub Repository" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--text-main)'; }} onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--text-dim)'; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            </a>
            <a href="https://react.dev/" target="_blank" rel="noreferrer" title="React" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(event) => { event.currentTarget.style.color = '#61dafb'; }} onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--text-dim)'; }}>
                <svg width="24" height="24" viewBox="-11.5 -10.23174 23 20.46348" fill="currentColor">
                    <circle cx="0" cy="0" r="2.05" fill="currentColor" />
                    <g stroke="currentColor" strokeWidth="1" fill="none">
                        <ellipse rx="11" ry="4.2" />
                        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                    </g>
                </svg>
            </a>
            <a href="https://vitejs.dev/" target="_blank" rel="noreferrer" title="Vite" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(event) => { event.currentTarget.style.color = '#646cff'; }} onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--text-dim)'; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.388 4.672L11.535 21.8c.206.386.75.385.955 0L21.611 4.672c.196-.367-.184-.77-.552-.586l-9.06 4.53-9.059-4.53c-.368-.184-.748.22-.552.586z" />
                </svg>
            </a>
        </div>
    );

    return (
        <>
            <LoadingScreen isVisible={isLoading || isExiting} />

            {showHomeModal && (
                <div className="modal-scrim">
                    <div className="modal-card">
                        <h3>Don&apos;t lose your settings</h3>
                        <p>Your setup is saved in this URL. Bookmark the page or copy the link before leaving, otherwise a custom timetable that is only on this device will stay behind.</p>
                        <div className="modal-actions">
                            <button type="button" className="ghost-btn" onClick={() => setShowHomeModal(false)}>Cancel</button>
                            <button type="button" className="primary-btn" onClick={(event) => { setShowHomeModal(false); handleExternalNavigation(event, '/'); }}>Leave</button>
                        </div>
                    </div>
                </div>
            )}

            {showDevModal && (
                <div className="modal-scrim">
                    <div className="modal-card modal-card-dev">
                        <h3>Developer mode unlocked</h3>
                        <p>Time and day overrides are now in the developer tab. They travel with the link, so clear them before sharing.</p>
                        <button type="button" className="primary-btn danger-btn" onClick={() => setShowDevModal(false)}>Got it</button>
                    </div>
                </div>
            )}

            {showStarsModal && (
                <div className="modal-scrim">
                    <div className="modal-card modal-card-stars">
                        <h3>Space theme unlocked</h3>
                        <p>Stars is now in the theme list. Apply changes to keep it in the link.</p>
                        <button type="button" className="primary-btn" onClick={() => setShowStarsModal(false)}>Awesome</button>
                    </div>
                </div>
            )}

            <div className="settings-wrapper">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <button className="back-arrow" type="button" onClick={() => navigate(`/time${window.location.search}`)} title="Return to the clock">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                        </button>
                        <h2 onClick={handleTitleClick} title="Click 5 times for Dev Menu">Settings</h2>
                    </div>

                    <button type="button" className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`} onClick={handleThemeTabClick}>Theme</button>
                    <button type="button" className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`} onClick={() => { setActiveTab('timetable'); themeClickCount.current = 0; }}>Timetable</button>
                    <button type="button" className={`tab-btn ${activeTab === 'accessibility' ? 'active' : ''}`} onClick={() => { setActiveTab('accessibility'); themeClickCount.current = 0; }}>Accessibility</button>
                    {devUnlocked && (
                        <button type="button" className={`tab-btn dev-tab ${activeTab === 'dev' ? 'active' : ''}`} onClick={() => { setActiveTab('dev'); themeClickCount.current = 0; }}>Developer</button>
                    )}
                    {renderIconLinks('sidebar-bottom-links')}
                </div>

                <div className="settings-content">
                    <div className="tab-content" style={{ display: activeTab === 'theme' ? 'block' : 'none' }}>
                        <div className="content-header"><h3>Theme</h3></div>
                        <div className="field">
                            <label htmlFor="theme-preset">Preset</label>
                            <select id="theme-preset" className="text-input" value={preset} onChange={(event) => setPreset(event.target.value)}>
                                <option value="custom">Custom</option>
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="luxury">Luxury</option>
                                {starsUnlocked && <option value="stars">Stars</option>}
                            </select>
                        </div>
                        <div className="color-pickers-container">
                            <div className="picker-box">
                                <label>Background</label>
                                <div ref={bgWheelRef} />
                                <span className="hex-label">{bgColor.toUpperCase()}</span>
                            </div>
                            <div className="picker-box">
                                <label>Text</label>
                                <div ref={txtWheelRef} />
                                <span className="hex-label">{txtColor.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="preview-box" style={{ backgroundColor: colors.bg, color: colors.txt }}>
                            <div className="label">Live preview</div>
                            <div className="preview-time">00:42:15</div>
                        </div>
                    </div>

                    <div className="tab-content" style={{ display: activeTab === 'timetable' ? 'block' : 'none' }}>
                        <div className="content-header">
                            <h3>Timetable</h3>
                            <p className="hint">Add blocks at any start and end time. The link stores the timetable. If it grows too long to bookmark, it is saved in Cloudflare KV and the link keeps a short id.</p>
                        </div>
                        {loadError && <p className="form-error">The cloud copy of this timetable could not be loaded.</p>}
                        <div className="field">
                            <label htmlFor="timetable-source">Source</label>
                            <select
                                id="timetable-source"
                                className="text-input"
                                value={mode === 'custom' ? 'custom' : selectedUser}
                                onChange={(event) => {
                                    setSaveMessage('');
                                    if (event.target.value === 'custom') setMode('custom');
                                    else {
                                        setMode('preset');
                                        setSelectedUser(event.target.value);
                                    }
                                }}
                            >
                                {PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                <option value="custom">Custom timetable</option>
                            </select>
                        </div>

                        {mode === 'custom' ? (
                            <TimetableEditor value={custom} onChange={editCustom} issues={issues} />
                        ) : (
                            <>
                                <TimetablePreview timetable={previewTimetable} />
                                <button type="button" className="ghost-btn" onClick={usePresetCopy}>Edit a copy</button>
                            </>
                        )}
                    </div>

                    <div className="tab-content" style={{ display: activeTab === 'accessibility' ? 'block' : 'none' }}>
                        <div className="content-header"><h3>Accessibility</h3></div>
                        <div className="field">
                            <label htmlFor="anim-level">Animation</label>
                            <select id="anim-level" className="text-input" value={animLevel} onChange={(event) => setAnimLevel(event.target.value)}>
                                <option value="full">Full</option>
                                <option value="minimal">Minimal</option>
                                <option value="none">None</option>
                            </select>
                            <p className="hint">Full rolls each digit. Minimal updates the numbers in place. None removes motion. Reduced motion on this device starts on Minimal until you change it.</p>
                        </div>
                    </div>

                    <div className="tab-content" style={{ display: activeTab === 'dev' ? 'block' : 'none' }}>
                        <div className="content-header">
                            <h3>Developer</h3>
                            <p className="form-error">Overrides the live clock.</p>
                        </div>
                        <div className="field">
                            <label htmlFor="dev-time">Time override (HH:MM:SS)</label>
                            <input id="dev-time" className="text-input" value={devTime} onChange={(event) => setDevTime(event.target.value)} placeholder="14:30:00" />
                        </div>
                        <div className="field">
                            <label htmlFor="dev-day">Day override</label>
                            <select id="dev-day" className="text-input" value={devDay} onChange={(event) => setDevDay(event.target.value)}>
                                <option value="">Live day</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="0">Sunday</option>
                            </select>
                        </div>
                        <button type="button" className="primary-btn danger-btn" onClick={clearDevOverrides}>Clear overrides</button>
                    </div>

                    <div className="action-bar">
                        <button type="button" className="primary-btn" onClick={saveSettings} disabled={saving}>{saving ? 'Saving' : 'Apply changes'}</button>
                        {saveMessage && <span className="save-note">{saveMessage}</span>}
                    </div>
                    {renderIconLinks('content-bottom-links')}
                </div>
            </div>
        </>
    );
}
