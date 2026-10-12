import { PERIODS_HALF, PERIODS_LONG, PERIODS_SHORT } from '../constants/periods.js';
import { USER_TIMETABLES } from '../constants/users.js';
import { timeToMs } from './time.js';

export const DAY_IDS = ['0', '1', '2', '3', '4', '5', '6'];

export const DAYS = [
    { id: '1', short: 'Mon', label: 'Monday' },
    { id: '2', short: 'Tue', label: 'Tuesday' },
    { id: '3', short: 'Wed', label: 'Wednesday' },
    { id: '4', short: 'Thu', label: 'Thursday' },
    { id: '5', short: 'Fri', label: 'Friday' },
    { id: '6', short: 'Sat', label: 'Saturday' },
    { id: '0', short: 'Sun', label: 'Sunday' },
];

const SCHEDULES = {
    1: PERIODS_LONG,
    2: PERIODS_HALF,
    3: PERIODS_HALF,
    5: PERIODS_SHORT,
};

export const DEFAULT_PRESET_ID = 'user1';

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function legacyBlocks(user, day) {
    const schedule = SCHEDULES[day];
    if (!schedule) return [];
    const classes = user.timetable[String(day)] || {};
    return schedule.flatMap((period) => {
        if (period.type === 'break') {
            return [{
                id: `${day}-${period.id}`,
                name: period.id === 'lunch' ? 'Lunch' : 'Break',
                start: period.start,
                end: period.end,
                kind: 'break',
            }];
        }
        const name = classes[period.id];
        if (!name) return [];
        return [{
            id: `${day}-${period.id}`,
            name,
            start: period.start,
            end: period.end,
            kind: 'class',
        }];
    });
}

const PRESETS = Object.fromEntries(
    Object.entries(USER_TIMETABLES).map(([id, user]) => [
        id,
        {
            name: user.name,
            days: Object.fromEntries(DAY_IDS.map((day) => [day, legacyBlocks(user, Number(day))])),
        },
    ])
);

export function listPresets() {
    return Object.entries(PRESETS).map(([id, preset]) => ({ id, name: preset.name }));
}

export function cloneTimetable(timetable) {
    const days = {};
    for (const day of DAY_IDS) {
        days[day] = (timetable?.days?.[day] || []).map((block) => ({
            id: uid(),
            name: block.name || (block.kind === 'break' ? 'Break' : 'Class'),
            start: block.start,
            end: block.end,
            kind: block.kind === 'break' ? 'break' : 'class',
        }));
    }
    return {
        name: (timetable?.name || 'My timetable').trim().slice(0, 80) || 'My timetable',
        days,
    };
}

export function getPreset(id) {
    return cloneTimetable(PRESETS[id] || PRESETS[DEFAULT_PRESET_ID]);
}

export function emptyTimetable(name = 'My timetable') {
    return cloneTimetable({ name, days: {} });
}

export function normalizeTimetable(timetable) {
    const cloned = cloneTimetable(timetable);
    for (const day of DAY_IDS) {
        cloned.days[day] = cloned.days[day]
            .map((block) => ({
                ...block,
                name: (block.name || (block.kind === 'break' ? 'Break' : 'Class')).trim().slice(0, 80) || (block.kind === 'break' ? 'Break' : 'Class'),
            }))
            .sort((a, b) => timeToMs(a.start) - timeToMs(b.start) || a.name.localeCompare(b.name));
    }
    return cloned;
}

export function validateTimetable(timetable) {
    const issues = [];
    for (const day of DAY_IDS) {
        const blocks = timetable?.days?.[day] || [];
        blocks.forEach((block) => {
            const start = timeToMs(block.start);
            const end = timeToMs(block.end);
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
                issues.push({ id: block.id, day, message: 'End time needs to be after the start time.' });
            }
        });
        const sorted = blocks
            .filter((block) => timeToMs(block.end) > timeToMs(block.start))
            .sort((a, b) => timeToMs(a.start) - timeToMs(b.start));
        for (let index = 1; index < sorted.length; index += 1) {
            if (timeToMs(sorted[index].start) < timeToMs(sorted[index - 1].end)) {
                issues.push({
                    id: sorted[index].id,
                    day,
                    overlap: true,
                    message: 'Some blocks on this day overlap.',
                });
                break;
            }
        }
    }
    return issues;
}

function prepare(blocks) {
    return (blocks || [])
        .map((block) => ({
            name: (block.name || (block.kind === 'break' ? 'Break' : 'Class')).trim(),
            start: block.start,
            end: block.end,
            kind: block.kind === 'break' ? 'break' : 'class',
        }))
        .filter((block) => {
            const start = timeToMs(block.start);
            const end = timeToMs(block.end);
            return Number.isFinite(start) && Number.isFinite(end) && end > start;
        })
        .sort((a, b) => timeToMs(a.start) - timeToMs(b.start));
}

function sameInstant(a, b) {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1000;
}

function touches(previous, next) {
    return previous
        && next
        && previous.kind !== 'break'
        && next.kind !== 'break'
        && previous.name === next.name
        && timeToMs(next.start) <= timeToMs(previous.end);
}

function runBounds(blocks, index) {
    let start = index;
    let end = index;
    while (start > 0 && touches(blocks[start - 1], blocks[start])) start -= 1;
    while (end + 1 < blocks.length && touches(blocks[end], blocks[end + 1])) end += 1;
    return {
        startMs: timeToMs(blocks[start].start),
        endMs: timeToMs(blocks[end].end),
        nextIndex: end + 1,
        name: blocks[index].name,
    };
}

function nextClassAfter(blocks, index, name) {
    for (let cursor = index; cursor < blocks.length; cursor += 1) {
        const block = blocks[cursor];
        if (block.kind === 'break') continue;
        if (block.name !== name) return block;
    }
    return null;
}

function dayCountdown(primaryTarget, dayEnd) {
    if (sameInstant(primaryTarget, dayEnd)) return null;
    return { kind: 'countdown', target: dayEnd, slot: 'day', label: 'End of day' };
}

/**
 * The class countdown and the day countdown share a target during the last
 * class, so the day timer is omitted. When no class is left, the day
 * countdown becomes the only timer.
 */
export function describeClock(blocks, currentMs, dayOfWeek) {
    const schedule = prepare(blocks);
    const weekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!schedule.length) {
        return {
            mode: weekend ? 'weekend' : 'free',
            status: weekend ? 'Weekend' : 'Free day',
            preview: '',
            className: '',
            primary: { kind: 'static', text: 'OFF', slot: 'class' },
            secondary: null,
            progress: null,
        };
    }

    const dayEnd = timeToMs(schedule[schedule.length - 1].end);
    if (currentMs >= dayEnd) {
        return {
            mode: 'done',
            status: 'Day finished',
            preview: '',
            className: '',
            primary: { kind: 'static', text: 'DONE', slot: 'class' },
            secondary: null,
            progress: null,
        };
    }

    const activeIndex = schedule.findIndex((block) => currentMs >= timeToMs(block.start) && currentMs < timeToMs(block.end));
    const active = activeIndex >= 0 ? schedule[activeIndex] : null;

    if (active && active.kind !== 'break') {
        const run = runBounds(schedule, activeIndex);
        const next = nextClassAfter(schedule, run.nextIndex, run.name);
        const span = Math.max(1, run.endMs - run.startMs);
        return {
            mode: 'in-class',
            status: `End of ${run.name}`,
            preview: next ? `Next up: ${next.name}` : '',
            className: run.name,
            primary: { kind: 'countdown', target: run.endMs, slot: 'class' },
            secondary: dayCountdown(run.endMs, dayEnd),
            progress: Math.min(1, Math.max(0, (currentMs - run.startMs) / span)),
        };
    }

    const next = schedule.find((block) => block.kind !== 'break' && timeToMs(block.start) > currentMs);
    if (next) {
        const target = timeToMs(next.start);
        return {
            mode: 'waiting',
            status: `${next.name} starts in`,
            preview: active?.kind === 'break' ? 'On break' : '',
            className: next.name,
            primary: { kind: 'countdown', target, slot: 'class' },
            secondary: dayCountdown(target, dayEnd),
            progress: null,
        };
    }

    return {
        mode: 'day',
        status: 'End of day',
        preview: '',
        className: '',
        primary: { kind: 'countdown', target: dayEnd, slot: 'day' },
        secondary: null,
        progress: null,
    };
}
