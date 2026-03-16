// src/Settings.jsx
import { useState, useEffect, useRef } from 'react';
import iro from '@jaames/iro';
import { USER_TIMETABLES } from './constants/users';
import { LoadingScreen } from '@projects/ui';
import './App.css';

export default function Settings({ navigate }) {
    const params = new URLSearchParams(window.location.search);
    
    // Check if the app has already loaded in this browser session
    const [isLoading, setIsLoading] = useState(!window.__TIME_APP_LOADED__);
    const [isExiting, setIsExiting] = useState(false);
    
    // Modal State
    const [showHomeModal, setShowHomeModal] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('theme');
    const [applyStatus, setApplyStatus] = useState(0); 
    
    // Settings State
    const [preset, setPreset] = useState(params.get('t') || 'custom');
    const [bgColor, setBgColor] = useState(`#${params.get('bg') || '000000'}`);
    const [txtColor, setTxtColor] = useState(`#${params.get('txt') || 'ffffff'}`);
    const [selectedUser, setSelectedUser] = useState(params.get('u') || 'user1');
    const [animLevel, setAnimLevel] = useState(params.get('anim') || 'full');
    
    // Dev State
    const [devTime, setDevTime] = useState(params.get('devt') || '');
    const [devDay, setDevDay] = useState(params.get('devd') || '');
    const [devUnlocked, setDevUnlocked] = useState(params.get('dev') === '1');
    const [starsUnlocked, setStarsUnlocked] = useState(params.get('t') === 'stars');

    // Refs
    const bgWheelRef = useRef(null);
    const txtWheelRef = useRef(null);
    const bgPicker = useRef(null);
    const txtPicker = useRef(null);
    const themeClickCount = useRef(0);
    const devClickCount = useRef(0);

    // Entry Transition Effect (Only runs if not already loaded)
    useEffect(() => {
        if (!window.__TIME_APP_LOADED__) {
            const timer = setTimeout(() => {
                setIsLoading(false);
                window.__TIME_APP_LOADED__ = true; // Mark as loaded for future internal navigation
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    // Initialize Color Pickers
    useEffect(() => {
        if (!bgWheelRef.current || !txtWheelRef.current) return;

        bgWheelRef.current.innerHTML = '';
        txtWheelRef.current.innerHTML = '';

        bgPicker.current = new iro.ColorPicker(bgWheelRef.current, { width: 150, color: bgColor });
        txtPicker.current = new iro.ColorPicker(txtWheelRef.current, { width: 150, color: txtColor });

        bgPicker.current.on('color:change', (color) => {
            setPreset('custom');
            setBgColor(color.hexString);
        });

        txtPicker.current.on('color:change', (color) => {
            setPreset('custom');
            setTxtColor(color.hexString);
        });
    }, []);

    const handleTitleClick = () => {
        devClickCount.current += 1;
        if (devClickCount.current === 5) {
            setDevUnlocked(true);
            alert("Developer Mode Unlocked! 🛠️");
        }
    };

    const handleThemeTabClick = () => {
        setActiveTab('theme');
        themeClickCount.current += 1;
        if (themeClickCount.current === 7 && !starsUnlocked) {
            setStarsUnlocked(true);
            setPreset('stars');
            alert("Achievement Unlocked: Space Traveler! 🚀");
        }
    };

    const handleOtherTabClick = (tab) => {
        setActiveTab(tab);
        themeClickCount.current = 0; 
    };

    const saveSettings = () => {
        const newParams = new URLSearchParams();
        
        newParams.set('bg', bgColor.replace('#', ''));
        newParams.set('txt', txtColor.replace('#', ''));
        newParams.set('t', preset);
        newParams.set('u', selectedUser);
        
        if (animLevel !== 'full') newParams.set('anim', animLevel);
        if (devUnlocked) newParams.set('dev', '1');
        if (devTime) newParams.set('devt', devTime);
        if (devDay) newParams.set('devd', devDay);

        const newURL = `${window.location.pathname}?${newParams.toString()}`;
        window.history.pushState({}, '', newURL);

        // --- THE DOM CLEANUP FIX ---
        // Force the browser to paint the new colors immediately and remove old classes
        if (preset === 'stars') {
            document.body.classList.add('theme-stars');
            document.documentElement.style.setProperty('--bg-color', '#020111');
            document.documentElement.style.setProperty('--text-main', '#ffffff');
        } else {
            // Wash off the permanent tattoo!
            document.body.classList.remove('theme-stars'); 
            
            const presetsMap = {
                dark: { bg: '#000000', txt: '#ffffff' },
                light: { bg: '#ffffff', txt: '#000000' },
                luxury: { bg: '#1a2e35', txt: '#ffcc00' }
            };

            if (preset === 'custom') {
                document.documentElement.style.setProperty('--bg-color', bgColor);
                document.documentElement.style.setProperty('--text-main', txtColor);
            } else if (presetsMap[preset]) {
                document.documentElement.style.setProperty('--bg-color', presetsMap[preset].bg);
                document.documentElement.style.setProperty('--text-main', presetsMap[preset].txt);
            }
        }

        setApplyStatus(1);
        setTimeout(() => setApplyStatus(0), 2000);
    };

    const clearDevOverrides = () => {
        setDevTime('');
        setDevDay('');
        const p = new URLSearchParams(window.location.search);
        p.delete('devt');
        p.delete('devd');
        window.history.pushState({}, '', `${window.location.pathname}?${p.toString()}`);
    };

    const goBack = () => {
        navigate(`/time${window.location.search}`); 
    };

    const handleExternalNavigation = (e, url) => {
        e.preventDefault();
        setIsExiting(true);
        setTimeout(() => {
            window.location.href = url;
        }, 400);
    };

    const renderTimetable = () => {
        const user = USER_TIMETABLES[selectedUser];
        if (!user) return <p>User not found.</p>;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periodTimesLong = { "0": "09:10", "1": "09:25", "2": "10:05", "Break": "10:45", "3": "11:00", "4": "11:40", "5": "12:20", "6": "13:00", "7": "13:35", "8": "14:10", "9": "14:50" };
        const periodTimesShort = { "0": "09:10", "1": "09:25", "2": "10:05", "3": "10:45", "4": "11:25", "5": "12:05", "6": "12:45", "7": "13:25" };

        return days.map((dayName, i) => {
            const dayNum = i + 1;
            const classes = user.timetable[dayNum];
            if (!classes) return null;

            const isShort = (dayNum === 3 || dayNum === 5);
            const order = isShort ? ['0', '1', '2', '3', '4', '5', '6', '7'] : ['0', '1', '2', 'Break', '3', '4', '5', '6', '7', '8', '9'];
            const times = isShort ? periodTimesShort : periodTimesLong;

            return (
                <div key={dayNum}>
                    <div className="tt-day-header">{dayName}</div>
                    <table className="tt-table">
                        <thead><tr><th>Time</th><th>Period</th><th>Class</th></tr></thead>
                        <tbody>
                            {order.map(p => {
                                if (p === 'Break') return <tr key={p} className="tt-break-row"><td>{times[p]}</td><td colSpan="2" className="break-label">BREAK</td></tr>;
                                if (!classes[p]) return null;
                                return <tr key={p}><td>{times[p]}</td><td>{p}</td><td>{classes[p]}</td></tr>;
                            })}
                        </tbody>
                    </table>
                </div>
            );
        });
    };

    const previewBg = preset === 'custom' ? bgColor : (preset === 'dark' ? '#000000' : preset === 'light' ? '#ffffff' : preset === 'luxury' ? '#1a2e35' : '#020111');
    const previewTxt = preset === 'custom' ? txtColor : (preset === 'dark' ? '#ffffff' : preset === 'light' ? '#000000' : preset === 'luxury' ? '#ffcc00' : '#ffffff');

    return (
        <>
            <LoadingScreen isVisible={isLoading || isExiting} />
            
            {/* Warning Modal */}
            {showHomeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px', boxSizing: 'border-box' }}>
                    <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--ui-border)', padding: '30px', borderRadius: '12px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Don't lose your settings!</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                            Your setup is saved directly in this URL. Make sure you <strong>bookmark this page</strong> or copy the link before leaving the Time App, otherwise your customizations will be lost.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => setShowHomeModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--ui-border)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={(e) => { setShowHomeModal(false); handleExternalNavigation(e, '/'); }} style={{ padding: '10px 20px', borderRadius: '6px', background: 'var(--text-main)', border: 'none', color: 'var(--bg-color)', cursor: 'pointer', fontWeight: 'bold' }}>Leave</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden', height: '100vh', width: '100%', backgroundColor: 'transparent', color: 'var(--text-main)' }}>
                
                <div className="sidebar" style={{ width: '250px', borderRight: '1px solid var(--ui-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                    <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', userSelect: 'none' }}>
                        <button className="back-arrow" onClick={goBack} title="Return to Main Page" style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '5px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <h2 onClick={handleTitleClick} title="Click 5 times for Dev Menu" style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>Settings</h2>
                    </div>
                    
                    <button className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`} onClick={handleThemeTabClick} style={{ background: activeTab === 'theme' ? 'var(--ui-border)' : 'none', border: '1px solid transparent', color: 'var(--text-main)', textAlign: 'left', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Theme</button>
                    <button className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`} onClick={() => handleOtherTabClick('timetable')} style={{ background: activeTab === 'timetable' ? 'var(--ui-border)' : 'none', border: '1px solid transparent', color: 'var(--text-main)', textAlign: 'left', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Timetable</button>
                    <button className={`tab-btn ${activeTab === 'accessibility' ? 'active' : ''}`} onClick={() => handleOtherTabClick('accessibility')} style={{ background: activeTab === 'accessibility' ? 'var(--ui-border)' : 'none', border: '1px solid transparent', color: 'var(--text-main)', textAlign: 'left', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Accessibility</button>
                    
                    {devUnlocked && (
                        <button className={`tab-btn ${activeTab === 'dev' ? 'active' : ''}`} onClick={() => handleOtherTabClick('dev')} style={{ background: activeTab === 'dev' ? 'rgba(255, 85, 85, 0.1)' : 'none', border: '1px dashed var(--text-dim)', color: '#ff5555', textAlign: 'left', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Developer</button>
                    )}

                    {/* Bottom Icon Links */}
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '20px', justifyContent: 'center', paddingTop: '20px', borderTop: '1px solid var(--ui-border)' }}>
                        <a onClick={() => setShowHomeModal(true)} title="Return to Main Site" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                        </a>
                        <a href="https://github.com/thepotatogamer0/time" target="_blank" rel="noreferrer" title="GitHub Repository" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </a>
                        <a href="https://react.dev/" target="_blank" rel="noreferrer" title="React" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.color = '#61dafb'} onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}>
                            <svg width="24" height="24" viewBox="-11.5 -10.23174 23 20.46348" fill="currentColor">
                              <circle cx="0" cy="0" r="2.05" fill="currentColor"/>
                              <g stroke="currentColor" strokeWidth="1" fill="none">
                                <ellipse rx="11" ry="4.2"/>
                                <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                                <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                              </g>
                            </svg>
                        </a>
                        <a href="https://vitejs.dev/" target="_blank" rel="noreferrer" title="Vite" style={{ color: 'var(--text-dim)', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.color = '#646cff'} onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.388 4.672L11.535 21.8c.206.386.75.385.955 0L21.611 4.672c.196-.367-.184-.77-.552-.586l-9.06 4.53-9.059-4.53c-.368-.184-.748.22-.552.586z"/>
                            </svg>
                        </a>
                    </div>
                </div>

                <div className="settings-content" style={{ flexGrow: 1, padding: '40px', overflowY: 'auto', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Theme Tab */}
                    <div className="tab-content" style={{ display: activeTab === 'theme' ? 'block' : 'none', animation: 'fadeIn 0.3s ease', flexGrow: 1 }}>
                        <div className="content-header" style={{ marginBottom: '30px' }}><h3 style={{ margin: 0, fontSize: '1.5rem' }}>Theme Customization</h3></div>
                        
                        <div className="control-group" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-dim)' }}>Theme Preset</label>
                            <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--ui-border)', padding: '10px', borderRadius: '6px' }}>
                                <option value="custom">Custom</option>
                                <option value="dark">Dark (Classic)</option>
                                <option value="light">Light</option>
                                <option value="luxury">Luxury</option>
                                {starsUnlocked && <option value="stars">Stars (Secret)</option>}
                            </select>
                        </div>
                        
                        <div className="color-pickers-container" style={{ display: 'flex', gap: '40px', marginTop: '20px', flexWrap: 'wrap' }}>
                            <div className="picker-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <label style={{ color: 'var(--text-dim)' }}>Background</label>
                                <div ref={bgWheelRef}></div>
                                <span className="hex-label" style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-dim)' }}>{bgColor.toUpperCase()}</span>
                            </div>
                            <div className="picker-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <label style={{ color: 'var(--text-dim)' }}>Primary Text</label>
                                <div ref={txtWheelRef}></div>
                                <span className="hex-label" style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-dim)' }}>{txtColor.toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="preview-box" style={{ marginTop: '40px', padding: '30px', border: '1px solid var(--ui-border)', borderRadius: '12px', textAlign: 'center', backgroundColor: previewBg, color: previewTxt }}>
                            <div className="label" style={{ fontSize: '0.8rem', letterSpacing: '2px', opacity: 0.7 }}>LIVE PREVIEW</div>
                            <div style={{ fontSize: '3rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>00:42:15.284</div>
                        </div>
                    </div>

                    {/* Timetable Tab */}
                    <div className="tab-content" style={{ display: activeTab === 'timetable' ? 'block' : 'none', animation: 'fadeIn 0.3s ease', flexGrow: 1 }}>
                        <div className="content-header" style={{ marginBottom: '30px' }}><h3 style={{ margin: 0, fontSize: '1.5rem' }}>Your Timetable</h3></div>
                        <div className="control-group" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-dim)' }}>Select User</label>
                            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--ui-border)', padding: '10px', borderRadius: '6px' }}>
                                {Object.entries(USER_TIMETABLES).map(([id, user]) => (
                                    <option key={id} value={id}>{user.name}</option>
                                ))}
                            </select>
                        </div>
                        <div id="timetable-container">
                            {renderTimetable()}
                        </div>
                    </div>

                    {/* Accessibility Tab */}
                    <div className="tab-content" style={{ display: activeTab === 'accessibility' ? 'block' : 'none', animation: 'fadeIn 0.3s ease', flexGrow: 1 }}>
                        <div className="content-header" style={{ marginBottom: '30px' }}><h3 style={{ margin: 0, fontSize: '1.5rem' }}>Accessibility</h3></div>
                        <div className="control-group" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-dim)' }}>Animation Level</label>
                            <select value={animLevel} onChange={(e) => setAnimLevel(e.target.value)} style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--ui-border)', padding: '10px', borderRadius: '6px' }}>
                                <option value="full">Full (Default)</option>
                                <option value="minimal">Minimal (No Rolling Numbers)</option>
                                <option value="none">None (No Animations)</option>
                            </select>
                            <p style={{ color: 'var(--text-dim)', marginTop: '15px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                <strong>Full:</strong> All visual effects enabled.<br/>
                                <strong>Minimal:</strong> Disables rolling numbers but keeps interface transitions.<br/>
                                <strong>None:</strong> Removes all animations.
                            </p>
                        </div>
                    </div>

                    {/* Developer Tab */}
                    <div className="tab-content" style={{ display: activeTab === 'dev' ? 'block' : 'none', animation: 'fadeIn 0.3s ease', flexGrow: 1 }}>
                        <div className="content-header" style={{ marginBottom: '30px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Developer Tools</h3>
                            <p style={{ color: '#ff5555', marginTop: '5px', fontSize: '0.9rem' }}>⚠️ Overrides live time data</p>
                        </div>
                        
                        <div className="control-group" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-dim)' }}>Time Override (HH:MM:SS)</label>
                            <input type="text" value={devTime} onChange={(e) => setDevTime(e.target.value)} placeholder="e.g. 14:30:00" style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--ui-border)', padding: '10px', borderRadius: '6px' }} />
                        </div>

                        <div className="control-group" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-dim)' }}>Day Override</label>
                            <select value={devDay} onChange={(e) => setDevDay(e.target.value)} style={{ width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--ui-border)', padding: '10px', borderRadius: '6px' }}>
                                <option value="">-- Use Live Day --</option>
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="0">Sunday</option>
                            </select>
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <button onClick={clearDevOverrides} style={{ background: '#ff5555', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Clear Overrides & Reset</button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="action-bar" style={{ display: activeTab !== 'timetable' ? 'flex' : 'none', marginTop: 'auto', alignItems: 'center', gap: '15px', borderTop: '1px solid var(--ui-border)', paddingTop: '20px' }}>
                        <button onClick={saveSettings} style={{ background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', padding: '12px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 0 var(--text-dim)' }}>Apply Changes</button>
                        <span style={{ color: '#44ff44', fontSize: '0.9rem', fontWeight: 'bold', opacity: applyStatus, transition: 'opacity 0.3s' }}>Changes Applied</span>
                    </div>

                </div>
            </div>
        </>
    );
}