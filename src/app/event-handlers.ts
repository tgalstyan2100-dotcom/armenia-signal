diff --git a/src/app/event-handlers.ts b/src/app/event-handlers.ts
index 8592c1af..e11bfa96 100644
--- a/src/app/event-handlers.ts
+++ b/src/app/event-handlers.ts
@@ -147,6 +147,19 @@ import {
 } from '@/app/responsive-zone-listener';
 import { stageVariantSelection } from '@/services/variant-panel-ownership';
 import { transferSourceGateOwnershipToUser as releaseSourceGateOwnership } from '@/services/source-cap';
+import {
+  ARMENIA_CENTER,
+  ARMENIA_LANGUAGE_STORAGE_KEY,
+  ARMENIA_SECTION_STORAGE_KEY,
+  ARMENIA_SECTIONS,
+  ARMENIA_UI,
+  applyArmeniaSectionToState,
+  getArmeniaSection,
+  isArmeniaLanguage,
+  isArmeniaSectionId,
+  type ArmeniaLanguage,
+  type ArmeniaSectionId,
+} from '@/config/armenia-sections';
 
 function readStorageValue(key: string): string | null {
   try {
@@ -869,6 +882,7 @@ export class EventHandlerManager implements AppModule {
     };
     window.addEventListener('theme-changed', this.boundThemeChangedHandler);
 
+    this.setupArmeniaSections();
     this.setupMissionPresets();
 
     if (this.ctx.isDesktopApp) {
@@ -906,6 +920,7 @@ export class EventHandlerManager implements AppModule {
   }
 
   private setupMissionPresets(): void {
+    if (document.getElementById('armeniaSectionNav')) return;
     this.renderMissionPresetControl();
 
     const shouldPrompt =
@@ -927,6 +942,103 @@ export class EventHandlerManager implements AppModule {
     }
   }
 
+  private setupArmeniaSections(): void {
+    const nav = document.getElementById('armeniaSectionNav');
+    if (!nav) return;
+    const storedLanguage = loadFromStorage<ArmeniaLanguage>(ARMENIA_LANGUAGE_STORAGE_KEY, 'hy');
+    const language = isArmeniaLanguage(storedLanguage) ? storedLanguage : 'hy';
+    const storedSection = loadFromStorage<ArmeniaSectionId>(ARMENIA_SECTION_STORAGE_KEY, 'home');
+    const sectionId = isArmeniaSectionId(storedSection) ? storedSection : 'home';
+    this.setArmeniaLanguage(language, false);
+    this.updateArmeniaSectionUi(sectionId);
+
+    document.querySelectorAll<HTMLButtonElement>('[data-armenia-section]').forEach((button) => {
+      button.addEventListener('click', () => {
+        const nextSectionId = button.dataset.armeniaSection;
+        if (!isArmeniaSectionId(nextSectionId)) return;
+        this.applyArmeniaSection(nextSectionId);
+        button.closest('details')?.removeAttribute('open');
+        if (button.closest('#mobileMenu')) document.getElementById('mobileMenuClose')?.click();
+      });
+    });
+    ['armeniaLanguageSelect', 'armeniaMobileLanguageSelect'].forEach((id) => {
+      document.getElementById(id)?.addEventListener('change', (event) => {
+        const nextLanguage = (event.currentTarget as HTMLSelectElement).value;
+        if (isArmeniaLanguage(nextLanguage)) this.setArmeniaLanguage(nextLanguage);
+      });
+    });
+    const searchParams = new URLSearchParams(window.location.search);
+    const hasSharedMapState = ['lat', 'lon', 'zoom', 'view', 'timeRange', 'layers', 'country', 'chokepoint'].some((key) => searchParams.has(key));
+    if (!hasSharedMapState) this.applyArmeniaSection(sectionId, true);
+  }
+
+  private setArmeniaLanguage(language: ArmeniaLanguage, persist = true): void {
+    if (persist) saveToStorage(ARMENIA_LANGUAGE_STORAGE_KEY, language);
+    document.documentElement.lang = language;
+    for (const section of ARMENIA_SECTIONS) {
+      document.querySelectorAll<HTMLElement>(`[data-armenia-section="${section.id}"]`).forEach((button) => {
+        const label = button.querySelector<HTMLElement>('.armenia-section-label, .mobile-menu-item-label');
+        if (label) label.textContent = section.label[language];
+        button.setAttribute('title', section.label[language]);
+      });
+    }
+    document.querySelectorAll<HTMLElement>('[data-armenia-ui="more"]').forEach((element) => { element.textContent = ARMENIA_UI.more[language]; });
+    document.querySelectorAll<HTMLElement>('[data-armenia-ui="language"]').forEach((element) => { element.textContent = ARMENIA_UI.language[language]; });
+    document.querySelectorAll<HTMLElement>('[data-armenia-map-title]').forEach((element) => { element.textContent = ARMENIA_UI.mapTitle[language]; });
+    document.getElementById('armeniaSectionNav')?.setAttribute('aria-label', ARMENIA_UI.sections[language]);
+    ['armeniaLanguageSelect', 'armeniaMobileLanguageSelect'].forEach((id) => {
+      const select = document.getElementById(id) as HTMLSelectElement | null;
+      if (select) { select.value = language; select.setAttribute('aria-label', ARMENIA_UI.language[language]); }
+    });
+    const tabLabels = [getArmeniaSection('home').shortLabel[language], getArmeniaSection('map').shortLabel[language], ARMENIA_UI.search[language], ARMENIA_UI.alerts[language], ARMENIA_UI.more[language]];
+    document.querySelectorAll<HTMLElement>('#mobileTabBar .mobile-tab').forEach((tab, index) => {
+      const label = tab.querySelector<HTMLElement>('span:last-child');
+      if (label && tabLabels[index]) label.textContent = tabLabels[index]!;
+    });
+  }
+
+  private updateArmeniaSectionUi(sectionId: ArmeniaSectionId): void {
+    document.querySelectorAll<HTMLElement>('[data-armenia-section]').forEach((button) => {
+      const active = button.dataset.armeniaSection === sectionId;
+      button.classList.toggle('active', active);
+      button.setAttribute('aria-pressed', String(active));
+    });
+    document.querySelector('.armenia-more-menu')?.classList.toggle('active', getArmeniaSection(sectionId).more === true);
+  }
+
+  private applyArmeniaSection(sectionId: ArmeniaSectionId, silent = false): void {
+    const section = getArmeniaSection(sectionId);
+    const applied = applyArmeniaSectionToState(sectionId, this.ctx.panelSettings, this.getMissionDefaultLayers());
+    const mapLayers = this.filterMissionLayersForCurrentRenderer(applied.mapLayers);
+    const previousMapLayers = { ...this.ctx.mapLayers };
+    const panelSettings = this.limitMissionPanels(applied.panelSettings);
+    this.ctx.panelSettings = panelSettings;
+    this.ctx.mapLayers = mapLayers;
+    saveToStorage(STORAGE_KEYS.panels, panelSettings);
+    saveToStorage(STORAGE_KEYS.mapLayers, mapLayers);
+    saveToStorage(ARMENIA_SECTION_STORAGE_KEY, sectionId);
+    this.persistMissionPanelOrder(applied.panelOrder);
+    clearMissionPreset();
+    this.applyPanelSettings();
+    this.callbacks.applySavedPanelOrder?.(applied.panelOrder);
+    this.ctx.unifiedSettings?.refreshPanelToggles();
+    this.ctx.map?.setLayers(mapLayers);
+    this.applyMissionMapLayerTransitions(previousMapLayers, mapLayers);
+    this.ctx.map?.setCenter(ARMENIA_CENTER.lat, ARMENIA_CENTER.lon, ARMENIA_CENTER.zoom);
+    this.ctx.map?.setTimeRange(section.timeRange);
+    this.callbacks.mountLiveNewsIfReady?.();
+    this.callbacks.syncDataFreshnessWithLayers();
+    this.scheduleMissionDataRefresh();
+    this.syncUrlState();
+    this.updateArmeniaSectionUi(sectionId);
+    if (sectionId === 'map') document.getElementById('mapSection')?.scrollIntoView({ block: 'start', behavior: silent ? 'auto' : 'smooth' });
+    if (!silent) {
+      const storedLanguage = loadFromStorage<ArmeniaLanguage>(ARMENIA_LANGUAGE_STORAGE_KEY, 'hy');
+      const language = isArmeniaLanguage(storedLanguage) ? storedLanguage : 'hy';
+      showToast(`${section.label[language]} — ${ARMENIA_UI.applied[language]}`);
+    }
+  }
+
   private renderMissionPresetControl(): void {
     const mount = document.getElementById('missionPresetMount');
     if (!mount) return;
