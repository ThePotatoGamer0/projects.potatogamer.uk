import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTimetablePayload } from '../../worker/src/index.js';
import { decodeTimetable, decodeTimetableAny, encodeTimetable, encodeTimetableForUrl, toPayload } from './codec.js';
import { timeToMs } from './time.js';
import { describeClock, getPreset, validateTimetable } from './timetable.js';

const monday = getPreset('user1').days['1'];
const friday = getPreset('user1').days['5'];

describe('describeClock', () => {
    it('drops the day timer during the last class because it matches the class timer', () => {
        const state = describeClock(monday, timeToMs('16:00:00'), 1);
        assert.equal(state.mode, 'in-class');
        assert.equal(state.status, 'End of Fundamentals of IT');
        assert.equal(state.secondary, null);
        assert.equal(state.primary.target, timeToMs('16:45'));
    });

    it('keeps the day timer while a class ends before the day does', () => {
        const state = describeClock(monday, timeToMs('14:00:00'), 1);
        assert.equal(state.status, 'End of Global Information');
        assert.equal(state.primary.target, timeToMs('15:00'));
        assert.equal(state.secondary.target, timeToMs('16:45'));
        assert.equal(state.preview, 'Next up: Fundamentals of IT');
    });

    it('counts down to the next class during a break and still shows the day', () => {
        const state = describeClock(monday, timeToMs('10:35:00'), 1);
        assert.equal(state.mode, 'waiting');
        assert.equal(state.status, 'Web design starts in');
        assert.equal(state.preview, 'On break');
        assert.equal(state.primary.target, timeToMs('10:45'));
        assert.ok(state.secondary);
    });

    it('shows both timers before the day starts', () => {
        const state = describeClock(monday, timeToMs('08:00:00'), 1);
        assert.equal(state.status, 'Web design starts in');
        assert.equal(state.preview, '');
        assert.ok(state.secondary);
    });

    it('uses a single done state after the last block', () => {
        const state = describeClock(monday, timeToMs('17:00:00'), 1);
        assert.equal(state.mode, 'done');
        assert.equal(state.primary.text, 'DONE');
        assert.equal(state.secondary, null);
    });

    it('hides the day timer on Friday tutorial because that class ends the day', () => {
        const state = describeClock(friday, timeToMs('12:30:00'), 5);
        assert.equal(state.status, 'End of Tutorial');
        assert.equal(state.secondary, null);
    });

    it('treats an empty weekday as a free day and an empty weekend as the weekend', () => {
        assert.equal(describeClock(getPreset('user1').days['4'], timeToMs('12:00'), 4).status, 'Free day');
        assert.equal(describeClock([], timeToMs('12:00'), 6).status, 'Weekend');
    });

    it('follows a custom weekend block and makes the day timer the only timer after class', () => {
        const during = describeClock(
            [{ name: 'Shift', start: '10:00', end: '14:00', kind: 'class' }],
            timeToMs('11:00'),
            6
        );
        assert.equal(during.status, 'End of Shift');
        assert.equal(during.secondary, null);

        const after = describeClock([
            { name: 'Shift', start: '10:00', end: '12:00', kind: 'class' },
            { name: 'Break', start: '12:00', end: '12:20', kind: 'break' },
        ], timeToMs('12:10'), 1);
        assert.equal(after.mode, 'day');
        assert.equal(after.primary.slot, 'day');
        assert.equal(after.secondary, null);
        assert.equal(after.primary.target, timeToMs('12:20'));
    });

    it('merges touching classes with the same name and stops at a break', () => {
        const merged = describeClock([
            { name: 'Web', start: '09:00', end: '10:00', kind: 'class' },
            { name: 'Web', start: '10:00', end: '11:00', kind: 'class' },
            { name: 'Math', start: '11:00', end: '12:00', kind: 'class' },
        ], timeToMs('09:30'), 1);
        assert.equal(merged.primary.target, timeToMs('11:00'));
        assert.equal(merged.preview, 'Next up: Math');
        assert.equal(merged.secondary.target, timeToMs('12:00'));

        const split = describeClock([
            { name: 'Web', start: '09:00', end: '10:00', kind: 'class' },
            { name: 'Break', start: '10:00', end: '10:15', kind: 'break' },
            { name: 'Web', start: '10:15', end: '11:00', kind: 'class' },
        ], timeToMs('09:30'), 1);
        assert.equal(split.primary.target, timeToMs('10:00'));
    });
});

describe('validateTimetable', () => {
    it('flags inverted times and overlapping blocks separately', () => {
        const issues = validateTimetable({
            name: 'Test',
            days: {
                1: [
                    { id: 'a', name: 'One', start: '10:00', end: '09:00', kind: 'class' },
                    { id: 'b', name: 'Two', start: '11:00', end: '12:00', kind: 'class' },
                    { id: 'c', name: 'Three', start: '11:30', end: '13:00', kind: 'class' },
                ],
            },
        });
        assert.equal(issues.some((issue) => issue.id === 'a' && !issue.overlap), true);
        assert.equal(issues.some((issue) => issue.overlap), true);
    });
});

describe('codec', () => {
    it('round-trips a custom week, including named breaks', () => {
        const timetable = getPreset('user1');
        timetable.name = 'Studio week';
        timetable.days['6'] = [
            { id: 'sat', name: 'Life drawing', start: '09:30', end: '12:00', kind: 'class' },
            { id: 'lunch', name: 'Lunch', start: '12:00', end: '12:45', kind: 'break' },
        ];
        const restored = decodeTimetable(encodeTimetable(timetable));
        assert.equal(restored.name, 'Studio week');
        assert.equal(restored.days['1'][0].name, 'Web design');
        assert.equal(restored.days['1'][1].kind, 'break');
        assert.equal(restored.days['6'][0].name, 'Life drawing');
        assert.equal(restored.days['6'][1].name, 'Lunch');
    });

    it('sends a payload Cloudflare KV will accept', () => {
        assert.equal(isTimetablePayload(toPayload(getPreset('user1'))), true);
        assert.equal(isTimetablePayload({ n: 'x', d: { 1: [['nope']] } }), false);
    });

    it('keeps a full preset copy inside the link budget', async () => {
        const token = await encodeTimetableForUrl(getPreset('user1'));
        assert.ok(token.length <= 1800, `token length ${token.length}`);
        const restored = await decodeTimetableAny(token);
        assert.equal(restored.days['5'].some((block) => block.name === 'Tutorial'), true);
    });
});
