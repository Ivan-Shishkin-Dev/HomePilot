# Figma Design Updates: Theme, Buttons & Layout

Use this document to align the Figma file with the implemented app. Apply these updates to frames, components, and variables so designs support dark/light mode and match the current UI.

---

## 1. Dark mode & light mode (theming)

### 1.1 Two themes
- **Dark mode**  
  - Background: dark navy (e.g. `#0A0F1E` or oklch equivalent).  
  - Cards/surfaces: slightly lighter dark (e.g. `#111827`, `#080C19` for sidebar).  
  - Primary text: white or near-white.  
  - Secondary/muted text: mid gray (e.g. `#8B95A5`, `#6B7280`).  
  - Borders: very subtle white/neutral (e.g. `white` at 4–6% opacity or equivalent).  
  - Buttons (secondary): subtle light fill (e.g. `white` at 6% opacity), hover ~10%.

- **Light mode**  
  - Background: white or very light gray (e.g. `#ffffff`).  
  - Cards/surfaces: white or light gray (e.g. `#ececf0` for muted surfaces).  
  - Primary text: dark (e.g. near-black or oklch `0.145 0 0`).  
  - Secondary/muted text: gray (e.g. `#717182`).  
  - Borders: light gray (e.g. `rgba(0,0,0,0.1)` or equivalent).  
  - Buttons (secondary): light gray fill (e.g. `#ececf0`), hover slightly darker (e.g. `#e9ebef`).

### 1.2 Semantic tokens (recommended in Figma)
Define and use these so one design can drive both themes:

| Token / role      | Dark mode (example)     | Light mode (example)   |
|-------------------|-------------------------|-------------------------|
| Background        | `#0A0F1E` / dark navy   | `#ffffff`               |
| Card / surface    | `#111827`               | `#ffffff` or `#ececf0`  |
| Foreground (text)| White                   | Near-black              |
| Muted (text)     | `#8B95A5` / `#6B7280`   | `#717182`               |
| Muted (surface)  | White 4–6% opacity      | `#ececf0`               |
| Accent (hover)   | White ~10% opacity      | `#e9ebef`               |
| Border           | White 4–6% opacity      | `rgba(0,0,0,0.1)`       |
| Sidebar bg       | `#080C19`               | Light gray (e.g. 98.5% light) |
| Sidebar text     | White / muted gray      | Dark / muted gray       |
| Sidebar border   | White 4% opacity        | Light gray border       |

- **Primary actions** (e.g. “View Listing”, “1-Click Apply”): keep blue `#3B82F6`, hover `#2563EB` in both themes.  
- **Semantic colors** (success, warning, error): keep green/amber/red; only adjust if needed for contrast in light mode.

---

## 2. Theme toggle (sun / moon) and notification bell

### 2.1 Single placement (no duplication)
- **Only one place** in the app shows both:
  - Theme toggle (sun/moon)
  - Notification (bell)
- They sit **next to each other** in a **shared top bar** in the main content area (not in the sidebar, not next to the logo).

### 2.2 Where this bar lives
- **Desktop:**  
  - Top of the main content column (right side), above the page-specific content.  
  - Same level as “Dashboard” / “Listings” etc. content; the bar is the first row of the content area.
- **Mobile:**  
  - Directly below the global top bar that has the HomePilot logo and menu (hamburger).  
  - So order is: [Logo + Menu] → [Theme + Bell] → page content.

### 2.3 What is not there
- **No** theme toggle next to the “HomePilot” logo in the sidebar (desktop).  
- **No** theme toggle in the mobile top bar next to the hamburger.  
- Sidebar/top bar: only logo, title, and nav (and on mobile, menu). No sun/moon there.

### 2.4 Bar layout and behavior
- **Alignment:** Content of the bar is **right-aligned** (theme + bell on the right).  
- **Width:** Full width of the main content area; only the controls sit on the right.  
- **Sticky:** This bar stays at the top when scrolling (sticky).  
- **Background:** Same as page background, with optional subtle blur so it stays readable when content scrolls underneath.  
- **Border:** Thin bottom border using the theme’s border color.  
- **Padding:** e.g. horizontal 24–40px (responsive), vertical ~12px.

### 2.5 Theme toggle button (sun/moon)
- **Size:** 40×40 px (or 36×36 on very small screens).  
- **Shape:** Rounded rectangle, corner radius ~12px.  
- **Background:** Muted surface (dark: white ~6%; light: e.g. `#ececf0`).  
- **Hover:** Slightly stronger (dark: white ~10%; light: e.g. `#e9ebef`).  
- **Icon:**  
  - **Sun:** Shown when the app is in **dark** mode (click = switch to light).  
  - **Moon:** Shown when the app is in **light** mode (click = switch to dark).  
- **Icon size:** ~18px.  
- **Icon color:** Muted text color (same in both themes).  
- **Accessibility:** Support a “Switch to light mode” / “Switch to dark mode” label.

### 2.6 Notification (bell) button
- **Size:** 40×40 px (match theme button).  
- **Shape:** Same rounded rectangle as theme button.  
- **Background & hover:** Same as theme toggle (muted → accent).  
- **Icon:** Bell, ~18px, muted color.  
- **Badge:** Small red dot (e.g. 10px) at top-right of the button; optional number “2” in a pill.  
- **Action:** Tapping goes to “AI Alerts” / notifications screen.

### 2.7 Spacing between the two buttons
- **Gap between theme and bell:** ~12px (consistent in the bar).

---

## 3. Sidebar and navigation (theme-aware)

### 3.1 Desktop sidebar
- **Background:** Use “Sidebar” token: dark in dark mode, light in light mode (no fixed dark-only).  
- **Border (right):** Use “Sidebar border” token.  
- **Logo + “HomePilot”:**  
  - Only logo and product name in the header.  
  - **No** sun/moon or any theme control in the sidebar header.  
- **Nav items:**  
  - Default: muted text, transparent or very subtle background.  
  - Hover: slightly stronger background (sidebar accent), text toward foreground.  
  - Active: blue tint (e.g. blue 15% bg, blue border), foreground text.  
- **User block at bottom:** Same sidebar background/border; text uses sidebar foreground and muted.

### 3.2 Mobile top bar
- **Content:** HomePilot logo + product name on the left; **only** the menu (hamburger) button on the right.  
- **No** theme toggle in this bar.  
- **Background / border:** Same semantic tokens as sidebar so it respects light/dark.

---

## 4. Pages and components that must support both themes

Apply the semantic tokens above so these all switch correctly with the theme (no “stuck” dark UI in light mode):

- **Dashboard (Home)**  
  - Page background, header text (e.g. “Good evening”, “Welcome back, Alex”), score card, stat cards, listing cards, all secondary buttons and icon buttons.  
  - Header has **no** theme or bell; only greeting/title.

- **Listings**  
  - Page background, search bar, filter chips, view toggles, listing cards, text, borders.

- **Listing detail**  
  - Back bar, hero area, price, features, livability blocks, competition bar, AI suggestion card, CTA, all buttons and text.

- **Passport**  
  - Score ring, completion bar, document cards, security badge, text, borders, buttons.

- **Profile / Optimize**  
  - User card, score block, auto-apply toggle, suggestion cards, expand/collapse, buttons, text.

- **AI Alerts**  
  - Alert cards, “Recent Alerts”, “Earlier today” list, urgency badges, text, borders, buttons.

- **Listing card (shared)**  
  - Card background, border, title, price, address, amenities, tags; image overlay can stay dark for contrast.

---

## 5. Score ring (Renter Score)

- **Score number (e.g. “847”):**  
  - **Not** fixed white.  
  - Use **foreground** text color (white in dark mode, black/dark in light mode) so it’s never “invisible” on the card.

- **Label (e.g. “Renter Score”):**  
  - Use **muted** text color in both themes.

- **Ring track (background circle):**  
  - **Not** fixed “white 8% opacity” (disappears in light mode).  
  - Use **muted** surface color so the track is visible in both themes.

- **Progress arc:**  
  - Keep green/amber/red by score; no change needed for theme.

---

## 6. Buttons (secondary / icon-only)

- **Icon-only buttons** (theme, bell, settings, heart, share, etc.):  
  - Background: muted.  
  - Hover: accent.  
  - Icon: muted-foreground.  
  - Same component in both themes; only the tokens change.

- **Text secondary buttons** (e.g. “Dismiss”, “Export PDF”):  
  - Same idea: muted bg, muted or foreground text, accent on hover.

- **Primary buttons** (blue):  
  - Keep blue fill and white text in both themes.

---

## 7. Cards and surfaces

- **Cards:** Use “Card” token (background + border).  
- **Stat tiles, document rows, suggestion blocks:** Card or muted background, with border token.  
- **Hover states:** Slightly stronger border or accent background where applicable.

---

## 8. Summary checklist for Figma

- [ ] Define dark and light **color styles / variables** for: background, card, foreground, muted, accent, border, sidebar (+ sidebar border, sidebar text).
- [ ] Add a **shared top bar** in the main content area (desktop + mobile) with **only** theme (sun/moon) + notification (bell), right-aligned, sticky.
- [ ] **Remove** any theme toggle from the sidebar header and from the mobile top bar (logo + menu only).
- [ ] **Theme toggle:** sun in dark mode, moon in light mode; same size and style as bell button.
- [ ] **Notification bell:** same size/style as theme button; red dot badge; both buttons 40×40, rounded, muted → accent.
- [ ] **Dashboard:** header has only greeting/title; no theme or bell in the dashboard header.
- [ ] **Sidebar:** theme-aware fill and text; no sun/moon in sidebar.
- [ ] **Score ring:** number and label use foreground/muted; ring track uses muted (not white opacity).
- [ ] **All screens:** cards, buttons, text, borders use semantic tokens so they flip correctly in light/dark.
- [ ] **Primary blue** and **semantic colors** (green/amber/red) unchanged across themes where possible.

Use this as the single source of truth for “theme + top bar + sidebar” so Figma and the app stay in sync.
