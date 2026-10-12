function mod(value, radix) {
    return ((value % radix) + radix) % radix;
}

export const STREAK_LIMIT = 10;

/**
 * Digits a countdown place passed between two timestamps, oldest first.
 * The first digit is where the reel was, and the last is where it lands.
 * Long jumps keep a sample of the real digits so the reel can blur past them.
 */
export function countdownDigits(previousMs, nextMs, weight, radix = 10, limit = STREAK_LIMIT) {
    const base = radix > 1 ? radix : 10;
    if (!(weight > 0) || !Number.isFinite(previousMs) || !Number.isFinite(nextMs)) {
        return { steps: 0, digits: [] };
    }
    const from = Math.floor(Math.max(0, previousMs) / weight);
    const to = Math.floor(Math.max(0, nextMs) / weight);
    const steps = from - to;
    if (steps <= 0) return { steps: 0, digits: [mod(to, base)] };
    if (steps <= limit) {
        const digits = [];
        for (let bucket = from; bucket >= to; bucket -= 1) digits.push(mod(bucket, base));
        return { steps, digits };
    }
    const digits = [mod(from, base)];
    const interior = limit - 1;
    for (let index = 1; index <= interior; index += 1) {
        const bucket = from - Math.round((index * steps) / interior);
        digits.push(mod(bucket, base));
    }
    digits[digits.length - 1] = mod(to, base);
    return { steps, digits };
}

/** Blur strength as a fraction of the digit's font size. */
export function streakBlur(steps) {
    if (steps <= 1) return 0;
    return Math.min(0.14, 0.035 * Math.sqrt(steps));
}

/**
 * A single-digit roll only reads clearly when the next tick is far enough
 * away to finish. Fast places, and any frame that skipped digits, streak.
 */
export function shouldStreak(steps, frameMs, weight) {
    if (steps > 1) return true;
    if (steps === 1 && weight > 0 && frameMs >= weight * 0.65) return true;
    return false;
}
