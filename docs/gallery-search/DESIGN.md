---
name: seeWallpaper Gallery Search
description: Persistent name filtering within the incumbent dark WPF gallery.
colors:
  canvas: "#10121A"
  panel: "#181B26"
  muted: "#AEB7C9"
  accent: "#8B7CFF"
  text: "#FFFFFF"
  button: "#292E40"
typography:
  search:
    fontSize: "15px"
  page-title:
    fontSize: "30px"
    fontWeight: 600
  card-title:
    fontSize: "19px"
    fontWeight: 600
rounded:
  card: "14px"
spacing:
  search-gap: "8px"
  label-gap: "6px"
  no-match-gap: "12px"
  search-bottom: "18px"
components:
  search-field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.search}"
    padding: "8px 12px"
  clear-button:
    backgroundColor: "{colors.button}"
    textColor: "{colors.text}"
    padding: "9px 14px"
  no-match:
    textColor: "{colors.muted}"
  wallpaper-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
    width: "290px"
  apply-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text}"
    padding: "9px 14px"
---

# Design System: Gallery Search

## Overview

**Creative North Star: "Incumbent dark WPF gallery"**

Gallery search extends the existing dark WPF wallpaper gallery with a quiet, persistent way to find a scene. The installed application palette, card hierarchy and native controls remain the visual authority. This document covers that addition only; it does not establish a new application identity.

The labeled field sits above the scrollable cards, so the query and recovery action remain available while browsing. Filtering changes the visible list immediately and retains the existing card actions. Native WPF rendering, rather than the sidecar's HTML illustrations, is the ground truth.

**Key Characteristics:**

- Incumbent dark WPF surfaces
- Persistent labeled search above scrollable cards
- Immediate name-only filtering
- Clear action and polite no-match feedback

## Colors

### Primary

The existing violet Accent identifies the card's Apply action. Search does not compete with that action for emphasis.

### Neutral

Canvas carries the application background; Panel holds both cards and the input. Muted supplies the visible label, input border and no-match text. White text and caret keep the query readable. The existing dark button surface carries Clear search while enabled.

Native WPF disabled button rendering is retained. The all-results screenshot shows the disabled clear control with a pale background; its appearance must not be inferred solely from the enabled button brush.

## Typography

The search query uses the explicit search size. The page title and card names retain their existing semibold hierarchy. Other labels and controls inherit WPF typography; the gallery addition does not declare a new font family or typographic scale. Frontmatter pixel values represent WPF device-independent units.

## Layout

The search group is the first automatic-height row of the gallery, above a separate card ScrollViewer. The left-aligned input/clear row follows available width up to 600 device-independent units. The input takes the remaining width; Clear search occupies an automatic-width column with the search-gap spacing.

The field has a minimum height of 40 and horizontal/vertical padding of 12/8. The visible label sits six units above it. No-match feedback, when present, sits 12 units below it; the group has 18 units of bottom margin. Cards retain their wrapping layout, 290-unit width, 155-unit preview height, 16-unit horizontal gap and 20-unit bottom gap.

The incumbent main window declares 1240 by 790 with minimum 980 by 640. This is a desktop WPF layout; no web or mobile breakpoints were introduced.

## Elevation & Depth

Tonal separation between Canvas, Panel and button surfaces provides depth. Search adds no shadow, glow, floating layer or animation. Wallpaper previews remain the visually rich part of the gallery.

## Shapes

Cards retain rounded corners from the existing gallery. The input has a thin one-unit Muted border and no newly specified corner radius. Clear search retains the native button template and state rendering.

## Components

- **Search field:** a visible translated Label targets GallerySearch; the TextBox also exposes the translated automation name. TextChanged immediately filters only template names. Matching uses invariant-culture contiguous substring comparison with IgnoreCase and IgnoreNonSpace; the query is trimmed. For example, `RAIN` matches `Rain on Glass`, `foret` matches `Forêt`, and `rbt` does not match `Robot Factory`.
- **Page subset:** ShowPage retains its supplied templates in _galleryTemplates before applying the query. Favorites therefore filters favorites only. Home, Gallery and Installed retain their existing library scope; Create retains its empty subset. Library refresh reopens the current page and reapplies the existing field text.
- **Clear search:** remains visible and is enabled when the raw field text has any characters, including whitespace. Clicking it clears the field, restores the current page's unfiltered subset and returns focus to the field.
- **No-match feedback:** translated, wrapping Muted text with a polite live setting. It appears only when the trimmed query is nonempty and there are zero matches. Empty or whitespace-only queries show the full page subset and hide this message.
- **Wallpaper cards:** search retains the incumbent preview, category, name, description and Apply/Preview/Customize/More actions.

The source of truth is [MainWindow.xaml](../../src/SeeWallpaper.App/MainWindow.xaml), [MainWindow.xaml.cs](../../src/SeeWallpaper.App/MainWindow.xaml.cs), [GallerySearchFilter.cs](../../src/SeeWallpaper.App/GallerySearchFilter.cs) and [App.xaml](../../src/SeeWallpaper.App/App.xaml). The local HTML/CSS sidecar illustrates those controls for documentation only; native WPF focus, hover and disabled rendering remains authoritative.

Reviewed WPF captures: [all results](../../.impeccable/review/gallery-search/gallery-search-all.png), [filtered results](../../.impeccable/review/gallery-search/gallery-search-filtered.png) and [no matches](../../.impeccable/review/gallery-search/gallery-search-empty.png). Ship review passed. The implementing session reported the full suite at 168 passed and two skipped; the opt-in WPF search check passed separately. These are session validation results, not a claim that documentation generation reran the tests.

## Do's and Don'ts

- Do retain the current page's template subset before applying the query.
- Do preserve the query when the library refreshes or a gallery page changes.
- Do keep the label, clear action and no-match feedback outside the card scroll area.
- Do use translated labels and keep keyboard focus available after clearing.
- Don't search descriptions, categories or identifiers.
- Don't replace contiguous substring matching with fuzzy matching.
- Don't show the no-match message for an empty or whitespace-only query.
- Don't introduce a new visual identity or custom animation for this field.

