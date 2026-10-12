const PRESETS = {
    dark: { bg: '#000000', txt: '#ffffff' },
    light: { bg: '#ffffff', txt: '#000000' },
    luxury: { bg: '#1a2e35', txt: '#ffcc00' },
    stars: { bg: '#020111', txt: '#ffffff' },
};

function withHash(value, fallback) {
    if (!value) return fallback;
    const hex = String(value).replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toLowerCase()}` : fallback;
}

export function resolveColors(prefs) {
    if (prefs.theme && PRESETS[prefs.theme]) return PRESETS[prefs.theme];
    return {
        bg: withHash(prefs.bg, '#000000'),
        txt: withHash(prefs.txt, '#ffffff'),
    };
}

function luminance(hex) {
    const value = hex.replace('#', '');
    const channel = (start) => parseInt(value.slice(start, start + 2), 16) / 255;
    return (0.2126 * channel(0)) + (0.7152 * channel(2)) + (0.0722 * channel(4));
}

export function applyAppearance(prefs) {
    const colors = resolveColors(prefs);
    const root = document.documentElement;
    root.style.setProperty('--bg-color', colors.bg);
    root.style.setProperty('--text-main', colors.txt);
    root.style.colorScheme = luminance(colors.bg) > 0.62 ? 'light' : 'dark';
    document.body.classList.toggle('theme-stars', prefs.theme === 'stars');
    document.body.classList.toggle('anim-none', prefs.anim === 'none');
}
