diff --git a/src/app/panel-layout.ts b/src/app/panel-layout.ts
index ca9b42ee..4c56c146 100644
--- a/src/app/panel-layout.ts
+++ b/src/app/panel-layout.ts
@@ -52,6 +52,15 @@ import { syncPanelPreview } from '@/services/mission-preview-registry';
 import { loadStoredMissionPreset } from '@/services/mission-presets';
 import { peekPendingMissionAttribution } from '@/services/analytics';
 import { getStoredMapModePreference } from '@/services/map-mode-preference';
+import {
+  ARMENIA_LANGUAGE_STORAGE_KEY,
+  ARMENIA_MORE_SECTIONS,
+  ARMENIA_PRIMARY_SECTIONS,
+  ARMENIA_SECTIONS,
+  ARMENIA_UI,
+  isArmeniaLanguage,
+  type ArmeniaLanguage,
+} from '@/config/armenia-sections';
 import { loadWidgets, saveWidget, isProUser, isProTierResolved } from '@/services/widget-store';
 import { sanitizeLockedLayers, shouldSanitizeLockedLayers } from '@/config/map-layer-definitions';
 import type { CustomWidgetSpec } from '@/services/widget-store';
@@ -1028,6 +1037,15 @@ export class PanelLayoutManager implements AppModule {
       const href = `${referenceOrigin}${path}`;
       return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
     }).join('');
+    const storedArmeniaLanguage = loadFromStorage<ArmeniaLanguage>(ARMENIA_LANGUAGE_STORAGE_KEY, 'hy');
+    const armeniaLanguage = isArmeniaLanguage(storedArmeniaLanguage) ? storedArmeniaLanguage : 'hy';
+    const armeniaSectionButton = (section: (typeof ARMENIA_SECTIONS)[number], mobile = false) => `
+      <button type="button"
+        class="${mobile ? 'mobile-menu-item armenia-mobile-section' : 'armenia-section-link'}${section.id === 'home' ? ' active' : ''}"
+        data-armenia-section="${section.id}" aria-pressed="${section.id === 'home' ? 'true' : 'false'}">
+        ${mobile ? '<span class="mobile-menu-item-icon" aria-hidden="true">•</span>' : ''}
+        <span class="${mobile ? 'mobile-menu-item-label' : 'armenia-section-label'}">${escapeHtml(section.label[armeniaLanguage])}</span>
+      </button>`;
 
     markLcpDebug('wm:layout:render-start');
     document.documentElement.classList.add('wm-layout-hydrated');
@@ -1098,12 +1116,13 @@ export class PanelLayoutManager implements AppModule {
               <span class="variant-label">Good News</span>
             </a>`;
       })()}</div>
-          <span class="logo">MONITOR</span><span class="logo-mobile">World Monitor</span><span class="version">v${__APP_VERSION__}</span>${BETA_MODE ? '<span class="beta-badge">BETA</span>' : ''}
+          <span class="armenia-brand-mark" aria-hidden="true">🇦🇲</span>
+          <span class="logo">ARMENIA SIGNAL</span><span class="logo-mobile">Armenia Signal</span><span class="version">v${__APP_VERSION__}</span>${BETA_MODE ? '<span class="beta-badge">BETA</span>' : ''}
           <a href="https://x.com/eliehabib" target="_blank" rel="noopener" class="credit-link">
             <svg class="x-logo" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
             <span class="credit-text">@eliehabib</span>
           </a>
-          <a href="https://github.com/koala73/worldmonitor" target="_blank" rel="noopener" class="github-link" title="${t('header.viewOnGitHub')}" aria-label="${t('header.viewOnGitHub')}">
+          <a href="https://github.com/tgalstyan2100-dotcom/armenia-signal" target="_blank" rel="noopener" class="github-link" title="${t('header.viewOnGitHub')}" aria-label="${t('header.viewOnGitHub')}">
             <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
           </a>
           <button class="mobile-settings-btn" id="mobileSettingsBtn" title="${t('header.settings')}" aria-label="${t('header.settings')}">
@@ -1140,10 +1159,27 @@ export class PanelLayoutManager implements AppModule {
           <span id="authWidgetMount" class="auth-widget-mount"></span>
         </div>
       </div>
+      <nav class="armenia-section-nav" id="armeniaSectionNav" aria-label="${escapeHtml(ARMENIA_UI.sections[armeniaLanguage])}">
+        <div class="armenia-section-nav__primary">
+          ${ARMENIA_PRIMARY_SECTIONS.map((section) => armeniaSectionButton(section)).join('')}
+          <details class="armenia-more-menu">
+            <summary><span data-armenia-ui="more">${escapeHtml(ARMENIA_UI.more[armeniaLanguage])}</span><span aria-hidden="true">▾</span></summary>
+            <div class="armenia-more-menu__panel">${ARMENIA_MORE_SECTIONS.map((section) => armeniaSectionButton(section)).join('')}</div>
+          </details>
+        </div>
+        <label class="armenia-language-control">
+          <span class="wm-visually-hidden" data-armenia-ui="language">${escapeHtml(ARMENIA_UI.language[armeniaLanguage])}</span>
+          <select id="armeniaLanguageSelect" aria-label="${escapeHtml(ARMENIA_UI.language[armeniaLanguage])}">
+            <option value="hy"${armeniaLanguage === 'hy' ? ' selected' : ''}>ՀԱՅ</option>
+            <option value="ru"${armeniaLanguage === 'ru' ? ' selected' : ''}>РУС</option>
+            <option value="en"${armeniaLanguage === 'en' ? ' selected' : ''}>ENG</option>
+          </select>
+        </label>
+      </nav>
       <div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>
       <nav class="mobile-menu" id="mobileMenu" aria-label="Menu">
         <div class="mobile-menu-header">
-          <span class="mobile-menu-title">WORLD MONITOR</span>
+          <span class="mobile-menu-title">ARMENIA SIGNAL</span>
           <button class="mobile-menu-close" id="mobileMenuClose" aria-label="Close menu">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
@@ -1155,6 +1191,17 @@ export class PanelLayoutManager implements AppModule {
           <button class="mobile-auth-fallback" id="mobileAuthFallback" type="button">Sign In</button>
         </div>
         <div class="mobile-menu-divider"></div>
+        ${ARMENIA_SECTIONS.map((section) => armeniaSectionButton(section, true)).join('')}
+        <label class="mobile-menu-item armenia-mobile-language">
+          <span class="mobile-menu-item-icon" aria-hidden="true">文</span>
+          <span class="mobile-menu-item-label" data-armenia-ui="language">${escapeHtml(ARMENIA_UI.language[armeniaLanguage])}</span>
+          <select id="armeniaMobileLanguageSelect" aria-label="${escapeHtml(ARMENIA_UI.language[armeniaLanguage])}">
+            <option value="hy"${armeniaLanguage === 'hy' ? ' selected' : ''}>ՀԱՅ</option>
+            <option value="ru"${armeniaLanguage === 'ru' ? ' selected' : ''}>РУС</option>
+            <option value="en"${armeniaLanguage === 'en' ? ' selected' : ''}>ENG</option>
+          </select>
+        </label>
+        <div class="mobile-menu-divider"></div>
         ${(() => {
         const variants = [
           { key: 'full', icon: '🌍', label: t('header.world') },
@@ -1226,12 +1273,12 @@ export class PanelLayoutManager implements AppModule {
         </button>`
       ).join('')}
       </div>
-      <div class="dashboard-tabs-mount" id="panelTabsMount"></div>
+      <div class="dashboard-tabs-mount armenia-workspace-tabs" id="panelTabsMount"></div>
       <main id="main" tabindex="-1" class="main-content${mapRightClassActive ? ' map-right' : ''}">
         <div class="map-section${mapStartsCollapsed ? ' collapsed' : ''}" id="mapSection">
           <div class="panel-header">
             <div class="panel-header-left">
-              <span class="panel-title">${SITE_VARIANT === 'tech' ? t('panels.techMap') : SITE_VARIANT === 'happy' ? 'Good News Map' : t('panels.map')}</span>
+              <span class="panel-title" data-armenia-map-title>${escapeHtml(ARMENIA_UI.mapTitle[armeniaLanguage])}</span>
             </div>
             <span class="header-clock" id="headerClock" translate="no"></span>
             <div class="map-header-actions">
@@ -1281,7 +1328,7 @@ export class PanelLayoutManager implements AppModule {
         <div class="site-footer-brand">
           <img src="/favico/android-chrome-96x96.png" alt="" width="28" height="28" loading="lazy" decoding="async" class="site-footer-icon" />
           <div class="site-footer-brand-text">
-            <span class="site-footer-name">WORLD MONITOR</span>
+            <span class="site-footer-name">ARMENIA SIGNAL</span>
             <span class="site-footer-sub">v${__APP_VERSION__} &middot; <a href="https://x.com/eliehabib" target="_blank" rel="noopener" class="site-footer-credit">@eliehabib</a></span>
           </div>
         </div>
@@ -1291,12 +1338,12 @@ export class PanelLayoutManager implements AppModule {
           <a href="https://www.worldmonitor.app/blog/" target="_blank" rel="noopener">Blog</a>
           <a href="https://www.worldmonitor.app/docs/documentation" target="_blank" rel="noopener">Docs</a>
           <a href="https://status.worldmonitor.app/" target="_blank" rel="noopener">Status</a>
-          <a href="https://github.com/koala73/worldmonitor" target="_blank" rel="noopener">GitHub</a>
+          <a href="https://github.com/tgalstyan2100-dotcom/armenia-signal" target="_blank" rel="noopener">GitHub</a>
           <a href="https://discord.gg/re63kWKxaz" target="_blank" rel="noopener">Discord</a>
           <a href="https://x.com/worldmonitorai" target="_blank" rel="noopener">X</a>
           ${this.ctx.isDesktopApp ? '' : `<span id="footerDownloadMount"></span>`}
         </nav>
-        <span class="site-footer-copy">&copy; ${new Date().getFullYear()} World Monitor</span>
+        <span class="site-footer-copy">&copy; ${new Date().getFullYear()} Armenia Signal</span>
       </footer>
     `, "legacy direct innerHTML migration"));
     // Mark AFTER the innerHTML swap so the timestamp reflects when the new shell
