import gsap from 'gsap';
import { countdownDigits, shouldStreak, streakBlur } from './digitStreak.js';

function isDigit(char) {
    return char >= '0' && char <= '9';
}

function shapeOf(text) {
    return [...text].map((char) => (isDigit(char) ? 'D' : char)).join('');
}

export function createTimerRoll() {
    let shape = '';
    let previousMs = null;
    let slots = [];

    function destroyTweens() {
        slots.forEach((slot) => {
            if (slot.strip) gsap.killTweensOf(slot.strip);
        });
    }

    function reset(container) {
        destroyTweens();
        shape = '';
        previousMs = null;
        slots = [];
        if (container) {
            container.classList.remove('roll-timer');
            container.replaceChildren();
        }
    }

    function build(container, text) {
        destroyTweens();
        container.classList.add('roll-timer');
        container.replaceChildren();
        shape = shapeOf(text);
        previousMs = null;
        slots = [...text].map((char) => {
            if (!isDigit(char)) {
                const sep = document.createElement('span');
                sep.className = 'roll-sep';
                sep.textContent = char;
                container.appendChild(sep);
                return { kind: 'sep' };
            }
            const digit = document.createElement('span');
            digit.className = 'roll-digit';
            const sizer = document.createElement('span');
            sizer.className = 'roll-sizer';
            sizer.textContent = '0';
            const windowEl = document.createElement('span');
            windowEl.className = 'roll-window';
            const strip = document.createElement('span');
            strip.className = 'roll-strip';
            windowEl.appendChild(strip);
            digit.append(sizer, windowEl);
            container.appendChild(digit);
            return { kind: 'digit', strip, windowEl, face: null, mode: '', landed: null };
        });
    }

    function paintPlain(container, text) {
        reset(container);
        container.textContent = text;
    }

    function leaveMode(slot, mode) {
        if (slot.mode === mode) return;
        gsap.killTweensOf(slot.strip);
        gsap.set(slot.strip, { y: 0, clearProps: 'transform,filter' });
        slot.strip.replaceChildren();
        slot.strip.classList.remove('is-blur');
        slot.strip.style.removeProperty('--blur');
        slot.strip.style.removeProperty('--trail');
        slot.windowEl?.classList.remove('is-streaking');
        if (slot.face) {
            slot.face.hidden = true;
            slot.face.style.filter = '';
        }
        slot.mode = mode;
    }

    function faceOf(slot) {
        if (slot.face) return slot.face;
        const face = document.createElement('span');
        face.className = 'roll-face';
        face.hidden = true;
        slot.windowEl.appendChild(face);
        slot.face = face;
        return face;
    }

    function showStatic(slot, digit) {
        leaveMode(slot, 'hold');
        const strip = slot.strip;
        if (strip.childElementCount !== 1) {
            strip.replaceChildren();
            strip.appendChild(document.createElement('span'));
        }
        const line = strip.firstElementChild;
        if (line.textContent !== digit) line.textContent = digit;
        line.style.opacity = '';
        line.style.filter = '';
        slot.landed = digit;
    }

    function rollOnce(slot, from, to, weight) {
        leaveMode(slot, 'roll');
        const strip = slot.strip;
        gsap.killTweensOf(strip);
        strip.replaceChildren();
        [from, to].forEach((digit) => {
            const line = document.createElement('span');
            line.textContent = String(digit);
            strip.appendChild(line);
        });
        const fontSize = parseFloat(getComputedStyle(strip).fontSize) || 16;
        const lineHeight = slot.windowEl?.clientHeight || fontSize;
        const duration = Math.min(0.18, Math.max(0.04, ((weight || 1000) * 0.45) / 1000));
        gsap.fromTo(strip, { y: 0 }, { y: -lineHeight, duration, ease: 'power2.out' });
        slot.landed = String(to);
    }

    function showStreak(slot, digits, steps, fontSize) {
        leaveMode(slot, 'streak');
        const landed = String(digits.at(-1));
        const ghosts = digits.slice(0, -1).map(String);
        const face = faceOf(slot);
        face.hidden = false;
        if (face.textContent !== landed) face.textContent = landed;
        const faceBlur = steps >= 8 ? fontSize * 0.012 : 0;
        face.style.filter = faceBlur > 0.4 ? `blur(${faceBlur.toFixed(2)}px)` : '';
        slot.windowEl?.classList.add('is-streaking');
        const strip = slot.strip;
        strip.classList.add('is-blur');
        const shown = ghosts.slice(-4);
        while (strip.childElementCount < shown.length) {
            strip.appendChild(document.createElement('span'));
        }
        while (strip.childElementCount > shown.length) {
            strip.lastElementChild.remove();
        }
        const strength = steps <= 1 ? 0.045 : streakBlur(steps);
        shown.forEach((digit, index) => {
            const line = strip.children[index];
            if (line.textContent !== digit) line.textContent = digit;
            const age = shown.length - 1 - index;
            const blurPx = fontSize * strength * (0.45 + age * 0.28);
            line.style.filter = `blur(${blurPx.toFixed(2)}px)`;
            line.style.opacity = Math.max(0.12, 0.5 - age * 0.12).toFixed(3);
            line.style.transform = `translateY(${(-0.16 - age * 0.12).toFixed(3)}em)`;
        });
        slot.landed = landed;
    }

    function paintSlot(slot, digits, steps, frameMs, weight, fontSize) {
        const landed = String(digits.at(-1) ?? '');
        if (!digits.length) return;
        if (steps <= 0) {
            if (slot.landed === landed && (slot.mode === 'roll' || slot.mode === 'hold')) return;
            showStatic(slot, landed);
            return;
        }
        if (!shouldStreak(steps, frameMs, weight)) {
            if (slot.mode === 'roll' && slot.landed === landed && gsap.isTweening(slot.strip)) return;
            rollOnce(slot, String(digits[0]), landed, weight);
            return;
        }
        showStreak(slot, digits, steps, fontSize);
    }

    function update(container, text, remainingMs, glyphs, { animate = true, frameMs = 16 } = {}) {
        if (!container) return;
        if (!animate || !Number.isFinite(remainingMs)) {
            paintPlain(container, text);
            return;
        }
        if (shape !== shapeOf(text)) build(container, text);
        const fontSize = parseFloat(getComputedStyle(container).fontSize) || 16;
        const digitSlots = slots.filter((slot) => slot.kind === 'digit');
        let digitIndex = 0;
        glyphs.forEach((item) => {
            if (item.kind !== 'digit') return;
            const slot = digitSlots[digitIndex];
            digitIndex += 1;
            if (!slot?.strip) return;
            if (previousMs == null || !(item.weight > 0)) {
                paintSlot(slot, [item.char], 0, frameMs, item.weight, fontSize);
                return;
            }
            const result = countdownDigits(previousMs, remainingMs, item.weight, item.radix);
            paintSlot(
                slot,
                result.digits.length ? result.digits : [item.char],
                result.steps,
                frameMs,
                item.weight,
                fontSize,
            );
        });
        previousMs = remainingMs;
    }

    return {
        update,
        reset,
        isActive: () => shape !== '',
    };
}
