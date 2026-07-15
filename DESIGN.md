---
name: Mogate Mobile
description: A restrained wallet and giftcard commerce interface built on HeroUI Native.
colors:
  background: "#f5f5f5"
  surface: "#ffffff"
  foreground: "#18181b"
  muted: "#71717a"
  default: "#ebebec"
  border: "#dedee0"
  accent: "#e9680c"
  accent-soft: "#fff0e5"
  danger: "#e5484d"
  success: "#2f9e62"
typography:
  headline:
    fontFamily: "System"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  title:
    fontFamily: "System"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "System"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "System"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.default}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Mogate Mobile

## 1. Overview

**Creative North Star: "The Clear Checkout"**

Mogate should feel like a trusted payment instrument: quiet until action is required, exact around money, and immediately legible. HeroUI Native supplies the component grammar; Mogate contributes a warm orange signal and authentic vector assets.

The system rejects decorative dashboard composition. A section may use a surface when it creates a real grouping, but the page itself remains an open, continuous workspace with clear dividers and compact repeated rows.

**Key Characteristics:**
- Restrained neutral canvas with one scarce action color.
- Real vector marks and a single Lucide icon family.
- Compact task hierarchy with progressive detail.
- Familiar controls with complete interaction states.

## 2. Colors

Cool neutrals carry nearly the whole interface; Mogate orange appears only on primary actions, current selections, and important state.

### Primary
- **Mogate Signal** (#e9680c): Primary actions, selected navigation, and actionable emphasis.

### Neutral
- **App Canvas** (#f5f5f5): Root background.
- **Clean Surface** (#ffffff): Grouped content and floating navigation.
- **Ink** (#18181b): Primary text and icons.
- **Quiet Ink** (#71717a): Supporting labels and metadata.
- **Soft Control** (#ebebec): Secondary controls and inactive icon wells.
- **Hairline** (#dedee0): Dividers and necessary outlines only.

**The One Signal Rule.** Orange is used on less than ten percent of a screen and always communicates action, selection, or status.

## 3. Typography

**Display Font:** System (SF Pro on iOS)
**Body Font:** System (SF Pro on iOS)

**Character:** One native sans family keeps money, controls, and metadata coherent. Weight and spacing establish hierarchy without oversized display treatment.

### Hierarchy
- **Headline** (700, 32px, 1.1): Account totals and major screen titles only.
- **Title** (700, 20px, 1.2): Section and merchant titles.
- **Body** (400, 15px, 1.4): Descriptions and transaction context.
- **Label** (600, 12px, normal case): Supporting labels and compact metadata.

**The Money First Rule.** Monetary values use tabular numerals when available and never compete with multiple same-sized metrics.

## 4. Elevation

The system is flat by default. Tonal layers and 1px separators provide structure; a soft ambient shadow is reserved for the sticky bottom navigation and sheets that genuinely float above content.

**The Flat By Default Rule.** A border or shadow must explain hierarchy or interaction state; it is never page decoration.

## 5. Components

### Buttons
- **Shape:** Compact rounded rectangle (8px), minimum 44px touch height.
- **Primary:** Mogate Signal background with white label and optional leading icon.
- **Hover / Focus:** HeroUI feedback, orange focus treatment, and explicit disabled/loading states.
- **Secondary / Ghost:** Neutral fill or transparent background; never a competing accent.

### Chips
- **Style:** Small HeroUI chips for network, environment, and status; neutral by default.
- **State:** Orange soft fill for the current selection, with icon or text in addition to color.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Clean Surface or transparent.
- **Shadow Strategy:** Flat at rest.
- **Border:** Hairline only when a repeated item needs a boundary.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** HeroUI field surface, 8px radius, explicit label and helper/error text.
- **Focus:** Accent focus state with no layout shift.
- **Error / Disabled:** Semantic state plus readable text; no color-only feedback.

### Navigation

Sticky bottom navigation uses real 20px vector icons, short labels, and a clear active state. Stack screens hide it. A compact brand bar anchors root screens without oversized floating controls.

## 6. Do's and Don'ts

### Do:
- **Do** use HeroUI Native primitives for buttons, chips, surfaces, typography, fields, skeletons, and overlays.
- **Do** use the authentic Mogate, chain, and token SVG assets plus one Lucide icon family.
- **Do** reserve orange (#e9680c) for primary action, selection, and status.
- **Do** present balances as one total followed by compact asset rows.
- **Do** keep every action target at least 44 by 44 points.

### Don't:
- **Don't** recreate the current card-dashboard screenshot or put cards inside cards.
- **Don't** use placeholder text glyphs such as `[]`, `UP`, `PAY`, or `QR` as icons.
- **Don't** use cyan decoration, pastel gradients, beige panels, or floating ornamental controls.
- **Don't** repeat uppercase eyebrow labels across every section.
- **Don't** make secondary metrics compete with the primary balance.
