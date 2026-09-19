import type { ArmeniaLanguage } from '@/config/armenia-sections';
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage';

export type ArmeniaScopeFilter = 'armenia' | 'south-caucasus' | 'external-impact';

export const ARMENIA_SCOPE_STORAGE_KEY = 'armenia-signal-scope-v1';

const COPY: Record<ArmeniaLanguage, {
  scope: string;
  scopes: Record<ArmeniaScopeFilter, string>;
  footer: Array<{ label: string; href: string }>;
}> = {
  hy: {
    scope: 'Տարածք',
    scopes: { armenia: 'Հայաստան', 'south-caucasus': 'Հարավային Կովկաս', 'external-impact': 'Արտաքին ազդեցություն' },
    footer: [
      { label: 'Աղբյուրներ', href: '/api/armenia/sources?lang=hy' },
      { label: 'Ուղիղ ազդակներ', href: '/api/armenia/signals?lang=hy' },
      { label: 'Ցուցանիշներ', href: '/api/armenia/indicators' },
      { label: 'Մեթոդաբանություն', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/server/armenia/relevance.ts' },
      { label: 'GitHub', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal' },
      { label: 'Լիցենզիա', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/LICENSE' },
    ],
  },
  ru: {
    scope: 'Охват',
    scopes: { armenia: 'Армения', 'south-caucasus': 'Южный Кавказ', 'external-impact': 'Внешнее влияние' },
    footer: [
      { label: 'Источники', href: '/api/armenia/sources?lang=ru' },
      { label: 'Сигналы', href: '/api/armenia/signals?lang=ru' },
      { label: 'Показатели', href: '/api/armenia/indicators' },
      { label: 'Методология', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/server/armenia/relevance.ts' },
      { label: 'GitHub', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal' },
      { label: 'Лицензия', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/LICENSE' },
    ],
  },
  en: {
    scope: 'Scope',
    scopes: { armenia: 'Armenia', 'south-caucasus': 'South Caucasus', 'external-impact': 'External impact' },
    footer: [
      { label: 'Sources', href: '/api/armenia/sources?lang=en' },
      { label: 'Live signals', href: '/api/armenia/signals?lang=en' },
      { label: 'Indicators', href: '/api/armenia/indicators' },
      { label: 'Methodology', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/server/armenia/relevance.ts' },
      { label: 'GitHub', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal' },
      { label: 'License', href: 'https://github.com/tgalstyan2100-dotcom/armenia-signal/blob/main/LICENSE' },
    ],
  },
};

function isScope(value: string | null): value is ArmeniaScopeFilter {
  return value === 'armenia' || value === 'south-caucasus' || value === 'external-impact';
}

export function readArmeniaScope(): ArmeniaScopeFilter {
  const stored = safeStorageGet(ARMENIA_SCOPE_STORAGE_KEY);
  return isScope(stored) ? stored : 'armenia';
}

function hide(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
  });
}

function replaceLinks(container: Element | null, links: Array<{ label: string; href: string }>): void {
  if (!container) return;
  container.replaceChildren(...links.map(({ label, href }) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = label;
    if (href.startsWith('http')) {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    }
    return anchor;
  }));
}

function ensureScopeControl(language: ArmeniaLanguage): void {
  const headerRight = document.querySelector<HTMLElement>('.header-right');
  if (!headerRight) return;
  let label = document.getElementById('armeniaScopeControl') as HTMLLabelElement | null;
  let select = document.getElementById('armeniaScopeSelect') as HTMLSelectElement | null;
  if (!label || !select) {
    label = document.createElement('label');
    label.id = 'armeniaScopeControl';
    label.className = 'armenia-scope-control';
    const caption = document.createElement('span');
    caption.className = 'armenia-scope-control__label';
    caption.dataset.armeniaScopeCaption = 'true';
    select = document.createElement('select');
    select.id = 'armeniaScopeSelect';
    select.className = 'armenia-scope-select';
    select.addEventListener('change', () => {
      const value = select?.value ?? '';
      if (!isScope(value)) return;
      safeStorageSet(ARMENIA_SCOPE_STORAGE_KEY, value);
      window.dispatchEvent(new CustomEvent('armenia:scope-change', { detail: { scope: value } }));
    });
    label.append(caption, select);
    headerRight.insertBefore(label, headerRight.firstChild);
  }

  const copy = COPY[language];
  label.querySelector<HTMLElement>('[data-armenia-scope-caption]')!.textContent = copy.scope;
  select.setAttribute('aria-label', copy.scope);
  const current = readArmeniaScope();
  select.replaceChildren(...(['armenia', 'south-caucasus', 'external-impact'] as const).map((scope) => {
    const option = document.createElement('option');
    option.value = scope;
    option.textContent = copy.scopes[scope];
    option.selected = scope === current;
    return option;
  }));
}

function cleanFooter(language: ArmeniaLanguage): void {
  const copy = COPY[language];
  const footer = document.querySelector<HTMLElement>('.site-footer');
  if (footer) {
    const nav = footer.querySelector('nav');
    nav?.setAttribute('aria-label', language === 'hy' ? 'Armenia Signal հղումներ' : language === 'ru' ? 'Ссылки Armenia Signal' : 'Armenia Signal links');
    replaceLinks(nav, copy.footer);
    const sub = footer.querySelector<HTMLElement>('.site-footer-sub');
    const version = document.querySelector<HTMLElement>('.header .version')?.textContent?.trim();
    if (sub) sub.textContent = `${version ?? ''}${version ? ' · ' : ''}AGPLv3`;
  }

  replaceLinks(document.querySelector('.mobile-menu-footer-links'), copy.footer);
}

export function installArmeniaShell(language: ArmeniaLanguage): void {
  // World Monitor product navigation remains in the upstream shell for
  // compatibility, but Armenia Signal does not expose it to users.
  hide('.variant-switcher');
  hide('.region-selector');
  hide('#copyLinkBtn');
  hide('#embedLinkBtn');
  hide('.credit-link');
  hide('#proBannerSlot');
  hide('#mobileMenuRegion');
  hide('#mobileMenuMission');
  hide('#missionPresetMount');
  hide('#mobileMenu .mobile-menu-variant');
  hide('#mobileMenu a[href*="x.com/eliehabib"]');
  hide('a[href*="discord.gg"]');
  hide('.discord-cta');
  hide('.discord-community-widget');

  ensureScopeControl(language);
  cleanFooter(language);
}
