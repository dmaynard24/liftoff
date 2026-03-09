# Anker Template — Design Token Sheet

## COLORS

### Core
- `--color-bg`: #121212 (page background)
- `--color-bg-elevated`: #1a1a1a / rgb(26,26,26) (cards, sections)
- `--color-bg-surface`: #2b2b2b (input bg, subtle surfaces)
- `--color-bg-overlay`: #333 / rgb(51,51,51) (overlays)

### Text
- `--color-text-primary`: #fff (headings, primary text)
- `--color-text-secondary`: #e0e0e0 / rgb(224,224,224) (body copy)
- `--color-text-muted`: #c2c2c2 / rgb(194,194,194) (labels, captions)
- `--color-text-dimmed`: #7a7a7a (disabled, footnotes)
- `--color-text-subtle`: #5c5c5c / rgb(92,92,92) (placeholder)

### Borders
- `--color-border-default`: rgba(255,255,255,0.1)
- `--color-border-hover`: rgba(255,255,255,0.15)
- `--color-border-strong`: rgba(255,255,255,0.25)
- `--color-border-subtle`: rgba(105,105,89,0.35) / #69696959

### Accent
- `--color-accent-purple`: #8e84f7 / rgb(142,132,247) (primary accent)
- `--color-accent-purple-dark`: rgb(125,59,244) / #7d3bf4 (links, hover)
- `--color-accent-purple-glow`: rgba(141,131,247,0.3) (glow effects)
- `--color-accent-purple-shadow`: rgba(124,59,245,0.33)

### Decorative
- `--color-yellow`: #fed45c / rgb(249,252,48) (tags, highlights)
- `--color-pink`: #fbc2d5 / rgb(251,194,213)
- `--color-teal`: #c4e3e6 / rgb(196,227,230)
- `--color-green`: rgb(46,255,112) (neon green accent)
- `--color-magenta`: rgb(255,0,191)

### Opacity
- `--color-overlay-dark`: rgba(0,0,0,0.8)
- `--color-overlay-medium`: rgba(0,0,0,0.5)
- `--color-overlay-light`: rgba(0,0,0,0.17)
- `--color-shadow-subtle`: rgba(48,48,48,0.3)

---

## FONTS

| Role     | Family                              | Weights    | Source        |
|----------|-------------------------------------|------------|---------------|
| Headings | "Erode", serif                      | 400        | Framer hosted |
| Body     | "Geist", sans-serif                 | 400, 500, 700 | Google Fonts |
| Mono     | "PT Mono", monospace                | 400        | Google Fonts  |
| Accent   | "Instrument Serif", serif (italic)  | 400i       | Google Fonts  |

### CDN Links
- Geist: `https://fonts.gstatic.com/s/geist/v4/...`
- PT Mono: `https://fonts.gstatic.com/s/ptmono/v14/...`
- Instrument Serif: `https://fonts.gstatic.com/s/instrumentserif/v5/...`
- Erode: hosted via Framer CDN (framerusercontent.com)

---

## TYPE SCALE

All sizes use Framer's `calc(var(--framer-root-font-size, 1rem) * N)` pattern.

| Name        | Element | Family            | Size (rem×) | Weight | Letter-spacing | Line-height | Color   |
|-------------|---------|-------------------|-------------|--------|----------------|-------------|---------|
| stat-hero   | h1      | Geist sans        | 7.0         | 400    | -0.04em        | 0.8em       | #fff    |
| stat-lg     | h1      | Geist sans        | 6.4         | 400    | -0.04em        | 0.8em       | #fff    |
| stat-md     | h1      | Geist sans        | 5.12        | 400    | -0.04em        | 0.8em       | #fff    |
| display     | h1      | Erode serif       | 4.75        | 400    | -0.08em        | 0.9em       | #fff    |
| display-md  | h1      | Erode serif       | 3.8         | 400    | -0.08em        | 0.9em       | #fff    |
| display-sm  | h1      | Erode serif       | 3.04        | 400    | -0.08em        | 0.9em       | #fff    |
| h2          | h2      | Erode serif       | 3.25        | 400    | -0.05em        | 1.05em      | #fff    |
| h2-sm       | h2      | Erode serif       | 2.4         | 400    | -0.05em        | 1.05em      | #fff    |
| h3          | h3      | Erode serif       | 2.25        | 400    | -0.08em        | 1.15em      | #fff    |
| h3-sm       | h3      | Erode serif       | 2.0         | 400    | -0.08em        | 1.15em      | #fff    |
| h4          | h4      | Geist sans        | 1.5         | 400    | -0.05em        | 1.2em       | #fff    |
| h4-sm       | h4      | Geist sans        | 1.2         | 400    | -0.05em        | 1.2em       | #fff    |
| h5          | h5      | Geist sans        | 1.0         | 500    | -0.04em        | 1.1em       | #fff    |
| body        | p       | Geist sans        | 1.0         | 400    | -0.04em        | 1.3em       | #fff    |
| body-muted  | p       | Geist sans        | 1.0         | 400    | -0.03em        | 1.3em       | #e0e0e0 |
| nav         | p       | Geist sans        | 15px        | 500    | -0.04em        | 1.4em       | #fff    |
| label       | p       | PT Mono           | 0.81        | 400    | -0.02em        | 1.2em       | #c2c2c2 |

### Label style: uppercase, PT Mono, smaller size, muted color

---

## SPACING

| Step | Value   |
|------|---------|
| 1    | 4px     |
| 2    | 6px     |
| 3    | 8px     |
| 4    | 10px    |
| 5    | 12px    |
| 6    | 16px    |
| 7    | 20px    |
| 8    | 24px    |
| 9    | 32px    |
| 10   | 48px    |
| 11   | 80px    |
| 12   | 120px   |
| 13   | 180px   |

---

## BORDER RADIUS

| Name    | Value |
|---------|-------|
| none    | 0px   |
| sm      | 3px   |
| md      | 20px  |
| full    | 50px  |
| circle  | 50%   |

---

## SHADOWS

### Card shadow (multi-layer)
```
0px 0.6px 0.6px -1.25px rgba(0,0,0,0.19),
0px 2.29px 2.29px -2.5px rgba(0,0,0,0.17),
0px 10px 10px -3.75px rgba(0,0,0,0.07)
```
(repeated 4× with decreasing opacity for depth stacking)

### Elevated shadow
```
0px 0.6px 1.57px -1.5px rgba(0,0,0,0.17),
0px 2.29px 5.95px -3px rgba(0,0,0,0.14),
0px 10px 26px -4.5px rgba(0,0,0,0.02)
```

### Inset border
```
inset 0px 0px 0px 1px rgb(0,0,0)
```

---

## ANIMATIONS

### Entrance (appear)
- Fade up from opacity 0 → 1
- translateY ~20px → 0
- Framer appear animation system with `data-framer-appear-id`
- `prefers-reduced-motion` check built in

### Hover states
- Cards: translateY(-4px), shadow increase
- Buttons: background-color transition
- Links: color transition to accent purple

### Transitions
- Framer handles transitions via JS animation system
- Duration: ~300-400ms typical
- Easing: ease-out / cubic-bezier

---

## LAYOUT

### Content widths
| Name       | Value  |
|------------|--------|
| max        | 1800px |
| wide       | 1600px |
| medium     | 800px  |
| narrow     | 600px  |
| card       | 500px  |
| sidebar    | 400px  |
| tiny       | 300px  |

### Grid
- 8-column grid at desktop (≥1200px)
- 6-column at tablet (810–1199px)
- 4-column at mobile (≤809px)
- Portfolio cards span 4 columns at desktop
- Minmax: `minmax(50px, 1fr)`

### Section padding
- Desktop: `180px 48px 16px` (top includes header offset)
- Tablet: `180px 24px 16px`
- Mobile: `180px 16px 16px`
- Section gap: 120px (desktop), 80px (mobile)

### Breakpoints
- Desktop: `min-width: 1200px`
- Tablet: `min-width: 810px and max-width: 1199.98px`
- Mobile: `max-width: 809.98px`
