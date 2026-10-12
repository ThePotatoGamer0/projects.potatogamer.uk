import { useState } from 'react';
import { formatHM, timeToMs } from '../lib/time';
import { DAYS, cloneTimetable } from '../lib/timetable';

function sortDay(blocks) {
    return [...blocks].sort((a, b) => timeToMs(a.start) - timeToMs(b.start) || a.name.localeCompare(b.name));
}

export function TimetablePreview({ timetable }) {
    const days = DAYS.filter((day) => (timetable.days[day.id] || []).length > 0);
    if (!days.length) return <p className="hint">Nothing is scheduled in this timetable.</p>;

    return days.map((day) => (
        <div key={day.id}>
            <div className="tt-day-header">{day.label}</div>
            <table className="tt-table">
                <thead>
                    <tr><th>Time</th><th>Session</th></tr>
                </thead>
                <tbody>
                    {timetable.days[day.id].map((block) => (
                        block.kind === 'break' ? (
                            <tr key={block.id} className="tt-break-row">
                                <td>{block.start}–{block.end}</td>
                                <td className="break-label">{block.name}</td>
                            </tr>
                        ) : (
                            <tr key={block.id}>
                                <td>{block.start}–{block.end}</td>
                                <td>{block.name}</td>
                            </tr>
                        )
                    ))}
                </tbody>
            </table>
        </div>
    ));
}

export default function TimetableEditor({ value, onChange, issues = [] }) {
    const today = String(new Date().getDay());
    const [selected, setSelected] = useState(DAYS.some((day) => day.id === today) ? today : '1');
    const blocks = value.days[selected] || [];
    const dayIssues = issues.filter((issue) => issue.day === selected);
    const issueIds = new Set(dayIssues.map((issue) => issue.id));

    const updateDay = (day, nextBlocks) => {
        onChange({ ...value, days: { ...value.days, [day]: nextBlocks } });
    };

    const updateBlock = (id, patch) => {
        updateDay(selected, blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    };

    const addBlock = () => {
        const last = sortDay(blocks).at(-1);
        const startMs = last ? timeToMs(last.end) : timeToMs('09:00');
        if (!Number.isFinite(startMs) || startMs >= timeToMs('23:59')) return;
        const endMs = Math.min(startMs + (60 * 60 * 1000), timeToMs('23:59'));
        const block = {
            id: Math.random().toString(36).slice(2, 10),
            name: 'Class',
            start: formatHM(startMs),
            end: formatHM(endMs),
            kind: 'class',
        };
        updateDay(selected, sortDay([...blocks, block]));
    };

    const copyFrom = (sourceDay) => {
        if (!sourceDay || sourceDay === selected) return;
        const source = value.days[sourceDay] || [];
        updateDay(selected, cloneTimetable({ name: value.name, days: { [sourceDay]: source } }).days[sourceDay]);
    };

    return (
        <div className="editor">
            <div className="field">
                <label htmlFor="timetable-name">Name</label>
                <input
                    id="timetable-name"
                    className="text-input"
                    maxLength={80}
                    value={value.name}
                    onChange={(event) => onChange({ ...value, name: event.target.value })}
                />
            </div>

            <div className="day-switch" role="tablist" aria-label="Day">
                {DAYS.map((day) => {
                    const count = value.days[day.id]?.length || 0;
                    return (
                        <button
                            key={day.id}
                            type="button"
                            role="tab"
                            aria-selected={selected === day.id}
                            className={selected === day.id ? 'active' : ''}
                            onClick={() => setSelected(day.id)}
                        >
                            {day.short}
                            {count > 0 && <span className="day-dot" aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>

            <div className="editor-tools">
                <label htmlFor="copy-day">Copy from</label>
                <select id="copy-day" className="text-input" value="" onChange={(event) => { copyFrom(event.target.value); event.target.value = ''; }}>
                    <option value="">Choose a day</option>
                    {DAYS.filter((day) => day.id !== selected).map((day) => (
                        <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                </select>
                <button type="button" className="ghost-btn" onClick={() => updateDay(selected, [])}>Clear day</button>
            </div>

            {blocks.length === 0 ? (
                <p className="hint">No blocks yet. This day stays free until you add one.</p>
            ) : (
                <div className="block-list">
                    {blocks.map((block) => (
                        <div key={block.id} className={`block-row${issueIds.has(block.id) ? ' has-error' : ''}`}>
                            <input
                                aria-label="Start time"
                                type="time"
                                value={block.start}
                                onChange={(event) => updateBlock(block.id, { start: event.target.value })}
                            />
                            <input
                                aria-label="End time"
                                type="time"
                                value={block.end}
                                onChange={(event) => updateBlock(block.id, { end: event.target.value })}
                            />
                            <input
                                aria-label="Name"
                                className="block-name"
                                maxLength={80}
                                value={block.name}
                                onChange={(event) => updateBlock(block.id, { name: event.target.value })}
                            />
                            <select
                                aria-label="Kind"
                                value={block.kind}
                                onChange={(event) => updateBlock(block.id, {
                                    kind: event.target.value,
                                    name: event.target.value === 'break' && block.name === 'Class' ? 'Break' : block.name,
                                })}
                            >
                                <option value="class">Class</option>
                                <option value="break">Break</option>
                            </select>
                            <button
                                type="button"
                                className="icon-remove"
                                aria-label={`Remove ${block.name || 'block'}`}
                                onClick={() => updateDay(selected, blocks.filter((item) => item.id !== block.id))}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {dayIssues[0] && <p className="form-error">{dayIssues[0].message}</p>}
            <button type="button" className="ghost-btn add-block" onClick={addBlock}>Add block</button>
        </div>
    );
}
