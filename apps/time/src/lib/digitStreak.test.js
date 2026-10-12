import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countdownDigits, shouldStreak, streakBlur } from './digitStreak.js';
import { describeRemaining, formatDiff } from './time.js';

describe('countdownDigits', () => {
    it('keeps a single digit when the place did not move', () => {
        const result = countdownDigits(847, 831, 100);
        assert.deepEqual(result, { steps: 0, digits: [8] });
    });

    it('includes the old and new digit for a one-step tick', () => {
        const result = countdownDigits(847, 831, 10);
        assert.equal(result.steps, 1);
        assert.deepEqual(result.digits, [4, 3]);
    });

    it('lists every digit on a short skip', () => {
        const result = countdownDigits(850, 845, 1);
        assert.equal(result.steps, 5);
        assert.deepEqual(result.digits, [0, 9, 8, 7, 6, 5]);
    });

    it('samples a long skip and still lands on the real digit', () => {
        const result = countdownDigits(847, 831, 1);
        assert.equal(result.steps, 16);
        assert.equal(result.digits.length, 10);
        assert.equal(result.digits[0], 7);
        assert.equal(result.digits.at(-1), 1);
        assert.ok(result.digits.every((digit) => digit >= 0 && digit <= 9));
    });

    it('does not invent a roll when time jumps forward', () => {
        const result = countdownDigits(100, 250, 1);
        assert.equal(result.steps, 0);
        assert.deepEqual(result.digits, [0]);
    });

    it('uses base 6 for the tens of seconds so 27 stays 2', () => {
        const remaining = (11 * 60000) + (27 * 1000) + 140;
        const earlier = remaining + 20;
        const result = countdownDigits(earlier, remaining, 10000, 6);
        assert.equal(result.steps, 0);
        assert.deepEqual(result.digits, [2]);
    });

    it('rolls the tens of seconds from 0 to 5 when a minute wraps', () => {
        const result = countdownDigits(60000, 59999, 10000, 6);
        assert.equal(result.steps, 1);
        assert.deepEqual(result.digits, [0, 5]);
    });
});

describe('describeRemaining', () => {
    it('keeps the countdown text and gives each digit a place weight', () => {
        assert.equal(formatDiff(45 * 60000, false), '45:00');
        assert.equal(formatDiff((90 * 60000) + 1500, true), '1:30:01.500');
        assert.equal(formatDiff(0, true), '00:00:00.000');
        const described = describeRemaining((90 * 60000) + 1500, true);
        const digits = described.glyphs.filter((item) => item.kind === 'digit');
        assert.deepEqual(digits.map((item) => item.weight), [3600000, 600000, 60000, 10000, 1000, 100, 10, 1]);
        assert.deepEqual(digits.map((item) => item.radix), [10, 6, 10, 6, 10, 10, 10, 10]);
        assert.equal(described.text, '1:30:01.500');
    });
});

describe('streakBlur', () => {
    it('stays sharp for a single step and grows with skipped digits', () => {
        assert.equal(streakBlur(0), 0);
        assert.equal(streakBlur(1), 0);
        assert.ok(streakBlur(16) > streakBlur(4));
        assert.ok(streakBlur(400) <= 0.14);
    });
});

describe('shouldStreak', () => {
    it('blurs a fast place and a multi-digit skip, and rolls a slow tick', () => {
        assert.equal(shouldStreak(16, 16, 1), true);
        assert.equal(shouldStreak(1, 16, 10), true);
        assert.equal(shouldStreak(2, 16, 1000), true);
        assert.equal(shouldStreak(1, 16, 1000), false);
        assert.equal(shouldStreak(0, 16, 1), false);
    });
});
