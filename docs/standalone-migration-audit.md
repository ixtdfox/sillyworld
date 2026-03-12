# Standalone Migration Audit: SillyTavern Coupling Map

This document inventories every current repository coupling to SillyTavern (direct and indirect) and outlines what must be replaced for a standalone web app.

## Scope and method

- Scanned the extension bootstrap, bridge modules, UI mount layer, asset resolution path, persistence, manifest, styles, and user docs.
- Included **direct dependencies** (explicit `window.SillyTavern`, ST DOM selectors, manifest format) and **indirect dependencies** (wrappers that are consumed by otherwise generic runtime/UI modules).
- No runtime behavior changes were made in this audit pass.

---

## 1) Bootstrap / app entry

### Dependency: SillyTavern extension injection model
- **Where:** `index.js`.
- **What it does now:** Assumes ST will load this file as extension entry, computes extension base URL from `import.meta.url`/`document.currentScript`, stores it on `window.__SILLYRPG__`, and injects a toolbar button when ST top bar is present.
- **Why coupled:** The host lookup targets ST-specific selector `#top-settings-holder`, and button classes (`drawer`, `drawer-toggle`, `drawer-icon`, `interactable`, `fa-solid`) are ST/FontAwesome styling conventions.
- **Standalone replacement:** Replace with normal app startup (`main.js` + root mount), explicit build-time/public asset base, and app-owned navigation/header button.

### Dependency: DOM readiness + mutation waiting for host UI
- **Where:** `index.js`.
- **What it does now:** Uses `DOMContentLoaded` and `MutationObserver` to wait for ST toolbar host to exist before inserting extension control.
- **Why coupled:** The observer exists solely because ST controls when host DOM appears.
- **Standalone replacement:** Mount immediately to known app root in HTML (`#app`), no observer-based host probing.

---

## 2) UI mounting

### Dependency: ST container anchors for overlay root
- **Where:** `src/ui/mount.js`.
- **What it does now:** Searches ST container IDs (`#movingDivs`, `#movingUIWrapper`, `#bg_load`) before falling back to `document.body`, then mounts `#sillyrpg-root`.
- **Why coupled:** These IDs are ST layout internals.
- **Standalone replacement:** Use one fixed app root (`#app`) in standalone HTML and remove host selector probing.

### Dependency: Hiding ST chat/navigation panes while game overlay is open
- **Where:** `src/ui/mount.js`.
- **What it does now:** Hides many ST chat/nav/settings selectors (`#chat`, `#chat_parent`, `#send_form`, `#WorldInfo`, `#extensions_settings`, `#left-nav-panel`, `.drawer-content`, etc.) by mutating inline `display` styles.
- **Why coupled:** Assumes ST DOM structure and behavior; this is extension coexistence logic, not standalone app logic.
- **Standalone replacement:** Remove chat suppression entirely; in standalone, route/view switching should be app-owned.

### Dependency: Overlay behavior designed to sit over another app
- **Where:** `style.css` (`#sillyrpg-root` absolute fill, z-index, top offset).
- **What it does now:** Places the game as a full-screen overlay over ST.
- **Why coupled:** Depends on ST page structure and toolbar vertical offset (`margin-top: 40px`).
- **Standalone replacement:** Normal page layout with dedicated viewport; no hardcoded ST offset.

---

## 3) Asset loading

### Dependency: Global extension base URL contract (`window.__SILLYRPG__.EXT_BASE`)
- **Where:** Produced in `index.js`; consumed by `src/st_bridge/asset.js` and `src/app.js`.
- **What it does now:** Resolves all runtime assets/seed JSON relative to extension install location.
- **Why coupled:** Global is introduced by extension bootstrap and reflects extension-file hosting assumptions.
- **Standalone replacement:** Use bundler/static hosting strategy (`/assets/...`, import URLs, or app config-based base path).

### Dependency: Indirect coupling through `resolveAsset()` bridge
- **Where:** `src/st_bridge/asset.js` used by UI/rendering modules (`mapLevelView`, `phoneCityMapScreen`, `entityCharacterLoader`, `worldSceneLoader`).
- **What it does now:** Central helper converts relative asset paths to absolute extension URLs.
- **Why coupled:** Helper depends on extension global from ST-style bootstrap.
- **Standalone replacement:** Replace bridge with host-agnostic asset resolver (or direct static imports).

---

## 4) State / settings

### Dependency: Browser `localStorage` as persistence backend
- **Where:** `src/app.js`, `src/world/worldStore.js`, `src/world/worldPersistence.js`.
- **What it does now:** Checks save existence and persists save blob under `SAVE_KEY` in `localStorage`.
- **Why coupled (indirect):** Not ST-only, but currently assumes same-origin browser storage tied to extension context lifecycle.
- **Standalone replacement:** Keep localStorage initially (safe), but define an app persistence interface (localStorage/IndexedDB/cloud) and migration path.

### Dependency: ST character mapping key in world seed (`stCharacterName`)
- **Where:** `src/world/seed_world.json`; used by `src/st_bridge/chatLauncher.js`.
- **What it does now:** NPC metadata references external ST character names to launch existing chats.
- **Why coupled:** Semantic dependency on ST character directory.
- **Standalone replacement:** Replace with app-native conversation IDs/contact IDs; add migration transform from `stCharacterName` if needed.

---

## 5) Event bus / callbacks

### Dependency: SillyTavern context API surface
- **Where:** `src/st_bridge/stApi.js`.
- **What it does now:** Detects context via `window.SillyTavern.getContext`, `window.getContext`, or `window.SillyTavern.context`; opens chats via several ST methods (`openChat`, `selectCharacterById`, `setCharacterId`, `setCharacterIndex`); writes system notes via `addOneMessage` or `sendSystemMessage`.
- **Why coupled:** Entire module is an adapter around ST runtime globals and APIs.
- **Standalone replacement:** Introduce an app-owned conversation service API (`openConversation(contactId)`, `appendSystemNote(text)`), with no global probing.

### Dependency: ST notification system (`toastr`)
- **Where:** `src/st_bridge/stApi.js`.
- **What it does now:** Uses global `window.toastr` for success/warn/info notifications.
- **Why coupled:** Depends on ST-shipped global library and styles.
- **Standalone replacement:** App toast component/service (or lightweight notifier library initialized by app).

### Dependency: NPC click-to-chat behavior routed to ST bridge
- **Where:** `src/st_bridge/chatLauncher.js` (called from map/scene flows when contact interactions happen).
- **What it does now:** Resolves ST character by name and attempts to switch active ST chat.
- **Why coupled:** Core user action depends on ST chat manager availability.
- **Standalone replacement:** Route NPC interaction into standalone conversation screen/modal/state machine.

---

## 6) Extension manifest and packaging

### Dependency: SillyTavern extension manifest format
- **Where:** `manifest.json`.
- **What it does now:** Declares ST extension metadata (`js`, `css`, `type: "ui"`, `loading_order`) for ST loader.
- **Why coupled:** File schema is ST-specific, not a generic web app packaging format.
- **Standalone replacement:** Replace with standard web build metadata (`package.json`, bundler config, index.html entry points).

### Dependency: Extension-oriented README/install flow
- **Where:** `README.md`.
- **What it does now:** Documents installation via ST Extensions UI and ST-specific chat mapping behavior.
- **Why coupled:** User/developer workflow assumes ST host.
- **Standalone replacement:** Rewrite docs for standalone setup/run/deploy and standalone chat/contact model.

---

## 7) Styles and CSS assumptions

### Dependency: SmartTheme CSS variables
- **Where:** `style.css` uses `--SmartThemeBlurTintColor`, `--SmartThemeBodyColor`, `--SmartThemeQuoteColor`, `--mainFontFamily`.
- **What it does now:** Inherits ST theme tokens for colors/typography.
- **Why coupled:** Visual design depends on ST-provided CSS custom properties.
- **Standalone replacement:** Provide app-owned design tokens (CSS variables) with defaults and optional theming.

### Dependency: ST class naming expectations for toolbar button
- **Where:** `index.js` plus `style.css`.
- **What it does now:** Uses `drawer*`/`interactable`/FontAwesome class combinations to appear native in ST toolbar.
- **Why coupled:** Relies on ST stylesheet/class semantics.
- **Standalone replacement:** Replace with app component styling and icon strategy independent of ST classes.

---

## 8) Other coupling and cross-cutting patterns

### Dependency: ST-specific bridge namespace (`src/st_bridge/*`)
- **Where:** `src/st_bridge/asset.js`, `src/st_bridge/stApi.js`, `src/st_bridge/chatLauncher.js` and their consumers.
- **What it does now:** Mixes two concerns: (1) host integration (SillyTavern APIs), (2) generally useful helpers (asset URL resolution).
- **Why coupled:** Feature modules import from a directory explicitly dedicated to ST bridging, spreading host assumptions.
- **Standalone replacement:** Split into `platform/` abstraction with `hostAdapter` interface; provide a standalone implementation and later delete ST adapter.

### Dependency: Logging/messages assume ST context
- **Where:** multiple files (e.g., `[SillyRPG]` logs, user-facing text referencing SillyTavern characters).
- **What it does now:** Emits ST-oriented diagnostics and UX wording.
- **Why coupled:** Product language and error handling are ST-centric.
- **Standalone replacement:** Update wording and diagnostics to standalone concepts (contacts/conversations/services).

---

## Migration checklist (ordered)

- [ ] **Create standalone app shell** (`index.html` + main entry) and mount to fixed root (`#app`); remove toolbar injection flow from `index.js`.
- [ ] **Replace extension manifest packaging** (`manifest.json`) with standard web build/runtime packaging.
- [ ] **Introduce platform adapter interface** (`assetResolver`, `notifications`, `conversationService`, optional `storage`) and wire app code to that interface.
- [ ] **Implement standalone asset strategy** (public assets/import URLs) and remove `window.__SILLYRPG__` dependency.
- [ ] **Remove ST DOM selector logic** in `src/ui/mount.js` (host probing + chat visibility suppression).
- [ ] **Replace ST chat API bridge** (`src/st_bridge/stApi.js`) with standalone conversation module.
- [ ] **Replace NPC `stCharacterName` mapping** with standalone contact/conversation identifiers and migrate seed schema.
- [ ] **Replace `window.toastr` usage** with app notification system.
- [ ] **Define standalone persistence abstraction**; keep localStorage as initial backend, but hide behind interface.
- [ ] **Decouple styles from SmartTheme variables** by introducing app CSS tokens/theme defaults.
- [ ] **Rewrite README** for standalone local development, build, deployment, and migration notes.
- [ ] **Delete or archive ST adapter code path** once standalone adapter is complete and tests pass.

## Optional low-risk prep refactors (not applied in this audit)

- Extract a `platform/assetResolver.js` wrapper and route all `resolveAsset` usage through it (keeps behavior, clarifies seam).
- Extract notification calls behind `notifyUser()` interface before changing provider.
- Add a small `hostCapabilities` object so UI can branch cleanly while migration is incremental.

## Tiny refactors made in this pass

- None. This pass is documentation-only.
