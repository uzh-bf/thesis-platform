# UZH Header & Footer — Detailed Reference

This file contains the detailed HTML/CSS patterns for the official UZH header and footer as documented in the Frontend Styleguide (Release 2.9.0).

---

## Header Structure

The UZH header is a **two-row structure** on a white background, sticky at the top of the page.

### Row 1: Brand Bar

Left side: Logo + vertical divider + organizational unit name
Right side: Service navigation links (14px, grey) + search trigger icon

```
┌────────────────────────────────────────────────────────────────────┐
│  [UZH Logo]  │  Org Unit Name          Kontakt  Suche  DE | EN  🔍 │
├────────────────────────────────────────────────────────────────────┤
│  Home    Studium    Forschung    Über uns                          │
└────────────────────────────────────────────────────────────────────┘
```

### Row 2: Main Navigation

Horizontal navigation links (16px, semibold 600, near-black `#121212`). Active item highlighted in UZH Blue `#0028A5`. Separated from Row 1 by a 1px grey border (`#E9E9E9`).

### Key Measurements

| Property                  | Value                          |
|---------------------------|--------------------------------|
| Total header height       | ~120–185px (depends on nav)    |
| Brand bar padding         | 20px vertical                  |
| Logo height               | ~48px (web)                    |
| Divider                   | 1px wide, 32px tall, `#E9E9E9` |
| Org unit font             | 16px, semibold 600, `#121212`  |
| Service nav font          | 14px, regular 400, `#4C4C4C`  |
| Nav link font             | 16px, semibold 600, `#121212`  |
| Nav active color          | `#0028A5` (UZH Blue)           |
| Nav padding               | 12px vertical                  |
| Border between rows       | 1px solid `#E9E9E9`           |
| Bottom border             | 1px solid `#E9E9E9`           |
| Background                | `#FFFFFF`                      |
| Position                  | sticky, top: 0, z-index: 100  |

### Header HTML Pattern

```html
<header class="uzh-header">
  <div class="uzh-container">
    <!-- Row 1: Brand Bar -->
    <div class="uzh-header-brand">
      <div class="uzh-header-brand-left">
        <a href="/" class="uzh-logo" aria-label="Universität Zürich">
          <img src="uzh-logo.svg" alt="Universität Zürich" height="48">
        </a>
        <span class="uzh-header-divider" aria-hidden="true"></span>
        <span class="uzh-header-org">Department of Finance</span>
      </div>
      <nav class="uzh-header-service" aria-label="Service Navigation">
        <a href="/kontakt">Kontakt</a>
        <a href="/suche">Suche</a>
        <a href="/en">EN</a>
      </nav>
    </div>
    <!-- Row 2: Main Navigation -->
    <nav class="uzh-header-nav" aria-label="Hauptnavigation">
      <ul>
        <li><a href="/" class="active">Home</a></li>
        <li><a href="/studium">Studium</a></li>
        <li><a href="/forschung">Forschung</a></li>
        <li><a href="/ueber-uns">Über uns</a></li>
      </ul>
    </nav>
  </div>
</header>
```

### Mobile Header

On screens ≤700px:
- Service nav is hidden or collapsed into a hamburger menu
- Main nav wraps or collapses into a mobile menu
- Logo may reduce in size
- Page margins shrink to 16px

---

## Footer Structure

The UZH footer sits on a light grey background (`#FAFAFA`) with a top border.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  FAFAFA background                                                    │
│                                                                        │
│  [UZH Logo (black)]                                                   │
│  Brief description text                    Col 1      Col 2     Col 3 │
│                                            Link       Link      Link  │
│                                            Link       Link      Link  │
│                                            Link       Link      Link  │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────── │
│  © 2026 Universität Zürich                    Impressum · Datenschutz │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Measurements

| Property                  | Value                         |
|---------------------------|-------------------------------|
| Background                | `#FAFAFA`                     |
| Top border                | 1px solid `#E9E9E9`          |
| Padding top               | 48px                          |
| Padding bottom            | 32px                          |
| Logo                      | Black version, smaller scale  |
| Description font          | 16px, regular 400, `#4C4C4C` |
| Column heading font       | 14px, semibold 600, uppercase, `#121212` |
| Column heading spacing    | letter-spacing: 0.5px         |
| Link font                 | 14px, regular 400, `#4C4C4C` |
| Link hover color          | `#0028A5` (UZH Blue)         |
| Link vertical spacing     | 8px between items             |
| Bottom bar                | 1px solid `#E9E9E9`, 20px padding-top, 40px margin-top |
| Bottom bar font           | 14px, `#4C4C4C`              |
| Grid layout               | ~2fr 1fr 1fr 1fr (4 columns) |

### Footer HTML Pattern

```html
<footer class="uzh-footer">
  <div class="uzh-container">
    <div class="uzh-footer-grid">
      <!-- About column (wider) -->
      <div class="uzh-footer-about">
        <a href="/" class="uzh-logo" aria-label="Universität Zürich">
          <img src="uzh-logo.svg" alt="Universität Zürich" height="40">
        </a>
        <p>Short description of the organizational unit or project.</p>
      </div>
      <!-- Link columns -->
      <div class="uzh-footer-col">
        <h5>Studium</h5>
        <ul>
          <li><a href="#">Bachelor</a></li>
          <li><a href="#">Master</a></li>
          <li><a href="#">Doktorat</a></li>
        </ul>
      </div>
      <div class="uzh-footer-col">
        <h5>Forschung</h5>
        <ul>
          <li><a href="#">Projekte</a></li>
          <li><a href="#">Publikationen</a></li>
        </ul>
      </div>
      <div class="uzh-footer-col">
        <h5>Kontakt</h5>
        <ul>
          <li><a href="#">E-Mail</a></li>
          <li><a href="#">Standort</a></li>
          <li><a href="#">Social Media ↗</a></li>
        </ul>
      </div>
    </div>
    <!-- Bottom bar -->
    <div class="uzh-footer-bottom">
      <p>© 2026 Universität Zürich</p>
      <p><a href="#">Impressum</a> · <a href="#">Datenschutz</a> · <a href="#">Barrierefreiheit</a></p>
    </div>
  </div>
</footer>
```

### Mobile Footer (≤700px)

- Grid collapses to 2 columns, with the about section spanning full width
- Bottom bar stacks vertically
- Margins shrink to 16px

---

## Corporate Switch (Breadcrumb Area)

Between the header and the page content, UZH sites typically show:
1. A **breadcrumb** trail (14px, `#4C4C4C`, links in `#365DD5`)
2. Optionally a **corporate switch** for navigating between related UZH sites

The breadcrumb uses `→` as separator.

```html
<nav class="uzh-breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">UZH</a></li>
    <li><a href="/bf">Department of Finance</a></li>
    <li aria-current="page">Teaching Center</li>
  </ol>
</nav>
```

---

## Section Navigation (Sidebar)

On content pages, a left sidebar shows the **section navigation** — a vertical list of links within the current section. This follows a standard tree-navigation pattern:
- Active item: `#0028A5` (UZH Blue), semibold
- Inactive items: `#121212`, regular weight
- Indent sub-items with padding
- The sidebar typically occupies 3 of 12 grid columns

---

## Skip Link

For accessibility, the first focusable element should be a skip link:

```html
<a class="uzh-skiplink" href="#main-content">Zum Inhalt springen</a>
```

Visually hidden until focused (standard `sr-only` pattern with `:focus` override).
