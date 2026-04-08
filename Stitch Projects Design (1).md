# Design System Specification: The Architectural Perspective

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

In the world of high-stakes real estate, information is often chaotic. This design system moves away from the cluttered, "dashboard-heavy" legacy of Enterprise SaaS and toward a high-end editorial experience. We treat property data not as rows in a database, but as curated entries in a premium portfolio.

The system breaks the "template" look through **Intentional Asymmetry**. We utilize generous white space and over-sized typographic scales to create an authoritative presence. By rejecting traditional borders in favor of tonal layering and soft, glass-like surfaces, we ensure the interface feels breathable, calm, and deeply trustworthy.

---

## 2. Colors & Surface Philosophy

### Core Palette
Our palette is rooted in the depth of the night sky and the clarity of architectural glass.
- **Surface (Base):** `#f6fafe` (A cool, blue-tinted off-white that reduces eye strain).
- **On-Surface (Text):** `#171c1f` (Deep charcoal, avoiding pure black for a softer premium feel).
- **Primary (Action):** `#2563eb` (A vibrant, authoritative blue).
- **Secondary (Navigation):** `#0F1C2E` (Deep Navy, used for sidebars to provide a grounding architectural anchor).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Structural boundaries must be defined solely through:
1.  **Tonal Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Negative Space:** Using the 8pt grid to create distance that implies separation.
3.  **Soft Shadows:** Indicating elevation rather than containment.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine paper or frosted glass.
- **Surface (Background):** The canvas.
- **Surface-Container-Low:** Standard content areas.
- **Surface-Container-Lowest:** "Elevated" cards or active states that should pop against the background.
- **Surface-Container-Highest:** Modals or floating flyouts that require the most visual prominence.

### Signature Textures
To escape the "flat" SaaS look, use a **Subtle Linear Gradient** (135°) for primary CTAs, transitioning from `primary` (#2563EB) to a slightly deeper `on-primary-fixed-variant` (#003ea8). This provides a tactile "soul" to the interactive elements.

---

## 3. Typography
We use a dual-font strategy to balance human-centric UI with technical precision.

| Role | Font Family | Character |
| :--- | :--- | :--- |
| **UI & Headings** | **Plus Jakarta Sans** | Modern, geometric, and highly legible. Conveys a "tech-forward" yet approachable tone. |
| **Data & Numerics** | **Geist Mono** | Used for price points, square footage, and timestamps. Provides an "architectural blueprint" feel to data. |

### Typography Scale
- **Display-LG (3.5rem):** For hero metrics and property titles.
- **Headline-MD (1.75rem):** For section headers.
- **Body-MD (0.875rem):** The workhorse for CRM data and notes.
- **Label-SM (0.6875rem):** Geist Mono specifically for micro-data (e.g., "Ref ID: 8829-X").

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. For example, a Lead Card (`#ffffff`) sitting on a Pipeline Column (`#f0f4f8`) creates a natural lift. We avoid drop shadows unless an element is truly "floating" above the content.

### Ambient Shadows & Glassmorphism
When a floating effect is required (e.g., Hover States or Popovers):
- **Hover Shadow:** `0 4px 16px rgba(37, 99, 235, 0.08)`. This blue-tinted glow mimics light reflecting off architectural glass.
- **The Glass Effect:** For floating navigation or filters, use `surface-container-lowest` with 80% opacity and a `backdrop-blur(12px)`. This allows property images or map data to bleed through subtly, maintaining context.

### The "Ghost Border" Fallback
If a border is required for accessibility, it must be a **Ghost Border**: Use `outline-variant` (#c3c6d7) at **15% opacity**. Never use high-contrast or 100% opaque lines.

---

## 5. Components

### Buttons & Inputs
- **Radius:** Buttons and Inputs use a strict **6px (md)** radius for a sharp, professional look.
- **Primary Button:** Gradient fill, white text, Geist Mono for any numeric button labels (e.g., "View 12 Leads").
- **Inputs:** `surface-container-lowest` fill. On focus, the background remains white, but the "Ghost Border" shifts to the `primary` blue.

### Pill-Shaped Badges (Status Leads)
Badges must use the **full (9999px)** radius. Colors are applied as a "Soft Tint" (10% opacity fill with 100% opacity text).
- **New:** Sky Blue (#0EA5E9) text / #F0F9FF background.
- **Pipeline:** Cyan (#06B6D4) text / #ECFEFF background.
- **Qualified:** Emerald (#10B981) text / #ECFDF5 background.

### Cards & Lists
- **Radius:** Property and Contact cards use **10px (xl)** for a softer, premium touch.
- **Rule:** **No Divider Lines.** Separate list items using 12px of vertical white space or alternating `surface-container` shifts.
- **Avatars:** Always circular, using high-contrast initials on a `secondary-container` background.

### Custom CRM Components
- **The Deal Timeline:** A vertical thread using Geist Mono for timestamps. Nodes are small 6px circles, never large icons.
- **Property Preview Glass:** A slide-over panel using the Glassmorphism rule to keep the CRM dashboard visible underneath.

---

## 6. Do's and Don'ts

### Do
- **Do** use Geist Mono for all currency values ($). It adds an air of financial precision.
- **Do** utilize "Surface Dim" for inactive or archived property cards.
- **Do** prioritize vertical rhythm. If a layout feels "tight," double the spacing before adding a line.

### Don't
- **Don't** use standard grey shadows. Shadows must always be tinted with a hint of blue.
- **Don't** use a border to separate the sidebar from the main content. The shift from Deep Navy (#0F1C2E) to the Off-White Background (#F0F4F8) is sufficient.
- **Don't** use icons as the primary way to communicate status; use the colored Pill Badges and intentional typography.