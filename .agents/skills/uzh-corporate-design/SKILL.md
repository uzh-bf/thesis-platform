---
name: uzh-corporate-design
description: Apply the University of Zurich (UZH) corporate design guidelines to any visual output — web pages, artifacts, presentations, documents, dashboards, diagrams, posters, or UI components. Use this skill whenever the user asks to create something that should follow the UZH brand, mentions "UZH design", "corporate design", "UZH colors", "UZH style", "UZH branding", or requests any visual output in a UZH context. Also trigger when creating artifacts, prototypes, HTML pages, slides, or any visual deliverable for UZH or the Department of Finance (UZH BF/DF). Even if the user just says "make it look like UZH" or "use our colors", this skill applies. Trigger on any mention of UZH in combination with visual, design, styling, layout, or presentation work.
---

# UZH Corporate Design Guidelines

Official corporate design specifications for the University of Zurich. Apply these whenever creating visual output in a UZH context.

**Sources**: [cd.uzh.ch](https://www.cd.uzh.ch), UZH Frontend Styleguide (frontend.uzh.ch, Release 2.9.0), official color manual PDF. The new CD is mandatory for all UZH units since January 2025.

## Reference Files

This skill includes additional reference files. Read them when building specific components:

- `references/header-footer.md` — Detailed HTML patterns, measurements, and layout specs for header, footer, breadcrumbs, section navigation, and skip links. **Read this before building any page layout.**
- `references/logo-placeholder.svg` — Structural placeholder SVG of the UZH logo for use in prototypes. Replace with the official logo from [cd.uzh.ch/de/elements.html](https://www.cd.uzh.ch/de/elements.html) in production.

---

## 1. Logo

The UZH logo has three inseparable parts, always displayed as a unit:
1. **Siegel** (seal) — circular emblem with "Universitas Turicensis"
2. **Schriftzug** "Universität Zürich" — right of the seal
3. **Akronym** "UZH" — below the Schriftzug, bold/spaced

### Rules

- **Only the German version**. No English variant exists.
- Never modify, recolor, stretch, crop, or partially display.
- **No separate logos** for organizational units, institutes, or projects.
- Available in **black** (for light backgrounds) and **white** (for dark backgrounds).
- Official formats: SVG, PNG, EPS. Download from cd.uzh.ch.
- **Protection zone**: ½ X on all sides (X = height of the seal).
- For app icons, social media, favicons: only the "UZH" acronym.

### In Prototypes & Artifacts

Use the placeholder SVG from `references/logo-placeholder.svg`. It captures the correct structural layout (seal | divider | text). Add a comment noting it must be replaced with the official file in production.

### Logo Placement on Web

- **Header**: top-left, ~48px height, followed by a vertical divider (`1px, #E9E9E9, 32px tall`), then the organizational unit name.
- **Footer**: black version, smaller scale (~40px height), top of the footer grid.

---

## 2. Typography

### Font: Source Sans Pro / Source Sans 3

The corporate typeface for ALL channels. Free, open-source.

```
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;1,400;1,600&display=swap');
```

Google Fonts migrated this to `Source Sans 3`. Both work; prefer `Source Sans 3` for new work.

**Web weights** — only four are used:
- **Regular (400)** — body text, paragraphs, inline links
- **Regular Italic (400i)** — emphasis in body text
- **Semibold (600)** — headings, labels, buttons, nav links, standalone links
- **Semibold Italic (600i)** — emphasis in headings

**Do not use** Light (300), Bold (700), or Black (900) on web. TheSans is logo-only. Palatino is certificates-only.

### Type Scale (Frontend Styleguide)

| Style            | Size  | Weight | Line Height     |
|------------------|-------|--------|-----------------|
| H1               | 42px  | 600    | 50.4px (1.2)    |
| H2               | 26px  | 600    | 31.2px (1.2)    |
| H3               | 18px  | 600    | 25.2px (1.4)    |
| H4               | 16px  | 600    | 25.6px (1.6)    |
| H5               | 14px  | 600    | 19.6px (1.4)    |
| Body (copy-m)    | 20px  | 400    | 32px (1.6)      |
| Body (copy-s)    | 18px  | 400    | 28.8px (1.6)    |
| Small (copy-xs)  | 16px  | 400    | —               |
| XSmall (copy-xxs)| 14px  | 400    | —               |

**Mobile**: H1 reduces to ~30px, Body (copy-m) to 18px.

---

## 3. Color System

### 3a. Web UI Colors (CSS Custom Properties)

Functional colors from the live UZH website. Values are RGB triplets for `rgba()`.

```css
:root {
  /* Core */
  --c-blue: 0, 40, 165;           /* #0028A5 — UZH Blue */
  --c-black: 18, 18, 18;          /* #121212 — primary text */
  --c-white: 255, 255, 255;
  --c-trueblack: 0, 0, 0;
  --c-truewhite: 255, 255, 255;

  /* Blue variants */
  --c-blue-link: 54, 93, 213;     /* #365DD5 — links */
  --c-blue-link-visited: 89, 114, 197; /* #5972C5 — visited links */
  --c-blue-muted: 27, 33, 74;     /* #1B214A — dark blue, dark sections */
  --c-blue-light: 245, 245, 251;  /* #F5F5FB — light blue background */

  /* Greys */
  --c-grey: 102, 102, 102;        /* #666666 — secondary text, default buttons */
  --c-grey-medium: 233, 233, 233; /* #E9E9E9 — borders, dividers */
  --c-grey-light: 250, 250, 250;  /* #FAFAFA — footer, alt sections */
  --c-text-black: 18, 18, 18;     /* #121212 — primary text */
  --c-text-grey: 76, 76, 76;      /* #4C4C4C — secondary text */

  /* Status */
  --c-green: 40, 150, 12;         /* success */
  --c-green-attention: 0, 126, 42;
  --c-red: 255, 0, 0;             /* error */
  --c-red-dark: 181, 0, 0;
}
```

### 3b. Full CD Palette (6 Color Families)

Each has 5 shades (1=lightest → 5=darkest). Use accent colors for data viz, charts, and category differentiation — never as primary UI colors.

| Family     | Base      | Pantone   | Shade 1   | Shade 2   | Shade 3   | Shade 4   | Shade 5   |
|------------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
| **Blue**   | `#0028A5` | 286 C     | `#BDC9E8` | `#7596FF` | `#3062FF` | `#001E7C` | `#001452` |
| **Cyan**   | `#4AC9E3` | 2198 C    | `#DBF4F9` | `#B7E9F4` | `#92DFEE` | `#1EA7C4` | `#147082` |
| **Apple**  | `#A4D233` | 2299 C    | `#ECF6D6` | `#DBEDAD` | `#C8E485` | `#7CA023` | `#536B18` |
| **Gold**   | `#FFC845` | 1225 C    | `#FFF4DA` | `#FFE9B5` | `#FFDE8F` | `#F3AB00` | `#A27200` |
| **Orange** | `#FC4C02` | 1665 C    | `#FFDBCC` | `#FEB799` | `#FE9367` | `#BD3902` | `#7E2601` |
| **Berry**  | `#BF0D3E` | 193 C     | `#FBC6D4` | `#F78CAA` | `#F3537F` | `#8F0A2E` | `#60061F` |

**Neutrals**: Black `#000000`, Greys (`#C2C2C2` `#A3A3A3` `#666666` `#4D4D4D` `#333333`), White `#FFFFFF`, Light Greys (`#FAFAFA` `#EFEFEF` `#E7E7E7` `#E0E0E0` `#D7D7D7`).

### Color Usage Rules

- **UZH Blue** (`#0028A5`) is the primary brand color — headers, nav active states, CTAs, primary buttons, hero sections.
- **Dark blue** (`#1B214A`) for dark sections (CTA blocks, dark hero variants).
- **Link blue** (`#365DD5`) for inline text links. Not the same as UZH Blue.
- **Accent colors** are for charts, data viz, category labels, card accents. Use shade 1 (lightest) for backgrounds.
- **Do NOT** introduce colors outside this palette.
- Ensure **WCAG AA contrast** for all text/background combinations.

---

## 4. Layout & Grid

### 12-Column Grid

```css
:root {
  --page-margin: 100px;    /* ≥1151px screens */
  /* calc(50% - 620px)       max content ~1240px */
  /* 40px                    701–1150px */
  /* 16px                    ≤700px */

  --gutter: 50px;           /* ≥901px, else 25px */
  --gap: 50px;              /* ≥901px, else 25px */
}
```

### Responsive Breakpoints

| Name   | Max-width | Min-width | Margin  | Gutter |
|--------|-----------|-----------|---------|--------|
| Mobile | 400px     | —         | 16px    | 25px   |
| Small  | 580px     | —         | 16px    | 25px   |
| Medium | 700px     | 701px     | 40px    | 25px   |
| Large  | 900px     | 901px     | 100px   | 50px   |
| XL     | 1150px    | 1151px    | 100px   | 50px   |
| XXL    | —         | 1440px    | auto    | 50px   |

---

## 5. Component Patterns

### Buttons

**Pill-shaped** with `border-radius: 100px`. All use `font-weight: 600`, `font-size: 14px`, `padding: 8px 16px`.

| Variant      | Background | Text     | Border               |
|--------------|------------|----------|----------------------|
| Default      | `#FAFAFA`  | `#666666`| transparent          |
| Primary      | `#0028A5`  | `#FFFFFF`| `#0028A5`            |
| Border-white | `#FFFFFF`  | `#666666`| `#E9E9E9`            |

Large variant: `padding: 12px 28px`, `font-size: 16px`.

Hover: slight opacity reduction (`0.85`). Active: subtle scale (`0.97`).

### Links

| Type       | Color     | Size | Weight | Icon                                     |
|------------|-----------|------|--------|------------------------------------------|
| Inline     | `#365DD5` | 18px | 400    | none                                     |
| Small      | `#365DD5` | 16px | 400    | none                                     |
| Standalone | `#121212` | —    | 600    | `→` internal, `↗` external, `↓` download |

Visited inline links: `#5972C5`. Hover: underline.
Standalone links: hover changes color to `#0028A5`, no underline.

### Cards / Teasers

UZH uses several teaser patterns (Big Teaser, Content Teaser, Event Teaser, News Teaser):
- White background, `1px solid #E9E9E9` border, `border-radius: 8px`
- Hover: subtle shadow (`0 4px 20px rgba(0,0,0,0.08)`) + slight lift (`translateY(-2px)`)
- Image/header area at top, content area with padding `20–24px`
- Title in H3 (18px, semibold), description in copy-xs (16px, `#4C4C4C`)

### Section Backgrounds

Alternating sections use these backgrounds for visual rhythm:
- **White** (`#FFFFFF`) — default
- **Light grey** (`#FAFAFA`) — alternate sections
- **Light blue** (`#F5F5FB`) — highlight sections
- **UZH Blue** (`#0028A5`) — hero, CTA (white text)
- **Dark blue** (`#1B214A`) — dark CTA variant (white text)

### Tables

- Header row: `#F5F5FB` background, semibold 600
- Body rows: alternating white / `#FAFAFA`
- Border: `1px solid #E9E9E9`
- Cell padding: `12px 16px`
- Font: copy-xs (16px) or copy-xxs (14px)

### Form Elements

- Input fields: `border: 1px solid #E9E9E9`, `border-radius: 4px`, `padding: 10px 14px`
- Focus: border changes to `#0028A5`
- Labels: 14px, semibold 600, `#121212`
- Error state: border `#FF0000`, error message in 14px `#B50000`
- Fieldsets group related inputs with a semibold legend

---

## 6. Header & Footer

**Read `references/header-footer.md`** for detailed HTML patterns, measurements, and mobile behavior.

### Header (Summary)

Two-row structure, white background, sticky:
1. **Brand bar**: Logo (48px) + vertical divider + org unit name (16px, semibold) | right: service nav (14px, `#4C4C4C`)
2. **Main nav**: horizontal links (16px, semibold, `#121212`), active state in `#0028A5`

Bottom border: `1px solid #E9E9E9`.

### Footer (Summary)

Light grey background (`#FAFAFA`), top border `1px solid #E9E9E9`:
- Grid: about column (wider, with logo) + 2–3 link columns
- Column headings: 14px, semibold, uppercase, `letter-spacing: 0.5px`
- Links: 14px, `#4C4C4C`, hover `#0028A5`
- Bottom bar: copyright left, legal links right, separated by `1px solid #E9E9E9`

---

## 7. Organizational Units

- Identified by a **text label** next to the logo, not a separate logo.
- In the header: appears right of the logo, separated by vertical divider.
- Font: 16px, semibold 600, `#121212`.
- Examples: "Department of Finance", "Institut für Banking und Finance", "Teaching Center".
- Never create graphical logos for units or projects.

---

## 8. Imagery & Photography

- Use **authentic, natural photography** — real people in real UZH environments.
- Avoid stock-photo clichés (handshakes, generic office scenes).
- Images should feel **bright, clear, and contemporary**.
- For page headers ("Kernsujets"): thematic photos related to the unit's work (research subjects, campus life). Size: full-width hero or constrained to content width.
- Do not use the Kollegiengebäude exterior or generic UZH photos without approval.
- Icons: use UZH's icon set where available (div.uzh.ch/de/uzh_icons).

---

## 9. Accessibility

UZH web properties must be accessible. Key requirements:
- **Skip link** as first focusable element: "Zum Inhalt springen"
- **ARIA landmarks**: header, nav (with `aria-label`), main, footer
- **Color contrast**: WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- **Focus indicators**: visible focus ring on all interactive elements
- **Alt text** on all images
- **Semantic HTML**: proper heading hierarchy (h1→h6), lists, tables
- **Keyboard navigation**: all interactions reachable via keyboard

---

## 10. Design Tone & Principles

The UZH aesthetic is:

- **Professional and academic** — not flashy, not trendy, not corporate-glossy.
- **Clear and structured** — strong visual hierarchy, generous whitespace, grid-aligned.
- **Consistent** — same blue, same font, same patterns on every page and product.
- **Accessible** — designed for everyone, not just visual appeal.
- **Restrained** — when in doubt, choose simplicity over experimentation.

The brand is built on **recognition through consistency**, not on visual novelty.

---

## 11. Governance

- The Web-CD is **mandatory** for all UZH websites (since Jan 2025).
- Sites in the **UZH CMS** (Magnolia) are automatically compliant.
- **Non-CMS websites** must follow the Frontend Styleguide (frontend.uzh.ch).
- Styleguide version: Release 2.9.0 (28.01.2026).
- Contact for CD questions: `cd@kommunikation.uzh.ch`

---

## Checklist: Applying These Guidelines

When creating any visual output for UZH:

1. ✅ Use **Source Sans 3** / Source Sans Pro — weights 400 and 600 only on web.
2. ✅ Use **UZH Blue** (`#0028A5`) as the primary brand color.
3. ✅ Use **link blue** (`#365DD5`) for inline text links — not UZH Blue.
4. ✅ Use the **web UI color variables** (Section 3a) for functional colors.
5. ✅ Use **accent colors** (Section 3b) only for data viz and category differentiation.
6. ✅ Follow the **type scale** exactly (Section 2).
7. ✅ Apply the **12-column grid** with correct margins, gutters, and breakpoints.
8. ✅ Build the **header** as a two-row structure (read `references/header-footer.md`).
9. ✅ Build the **footer** on light grey with multi-column links.
10. ✅ Style **buttons** as pills (`border-radius: 100px`).
11. ✅ Style **standalone links** with arrow icons (`→` `↗` `↓`).
12. ✅ Use the **logo placeholder** SVG for prototypes, official logo for production.
13. ✅ Include a **skip link** and proper ARIA landmarks.
14. ✅ Keep the tone **professional, clean, academic, restrained**.
15. ✅ **Never** create custom logos for departments or projects.
16. ✅ **Stick** to the defined palette — no off-brand colors.
