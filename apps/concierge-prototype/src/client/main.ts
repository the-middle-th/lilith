import { ROUTES, concretePath, resolveRoute } from "../shared/routes.js";
import type { Route, TemplateId } from "../shared/routes.js";
import {
  CATEGORIES,
  CONSENT_VERSION,
  NOTICE_VERSION,
} from "../shared/contracts.js";
import type {
  BootstrapData,
  Category,
  RequestRecord,
} from "../shared/contracts.js";
import {
  CONTACT_FIXTURES,
  DETAIL_PRESETS,
  IMAGE_FIXTURES,
} from "../shared/catalog.js";
import type { DetailPreset } from "../shared/catalog.js";
import {
  normaliseLocale,
  resolveLocale,
  resources,
} from "../shared/locales.js";
import type { Locale } from "../shared/locales.js";
import { ApiError, PrototypeClient } from "./api.js";
import { findDetailPreset, mayAdoptRequest, nextRequestPath } from "./state.js";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing app element");
const app: HTMLDivElement = root;
let sessionStorageAvailable: Storage | undefined;
try {
  sessionStorageAvailable = window.sessionStorage;
} catch {
  /* Session storage is optional. */
}
const client = new PrototypeClient(fetch, sessionStorageAvailable);
let locale: Locale = "th";
let translation = resolveLocale(locale);
let current: RequestRecord | null = null;
let requestIds: string[] = [];
let ready = false;
let busy = false;
let errorCode = "";
let retryAction: (() => Promise<void>) | null = null;
let generation = 0;
let selectedPreset = "";
let selectedContact = CONTACT_FIXTURES[0].id as string;
const previews = new Set<string>();
const failedImages = new Set<string>();

function escape(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
}
function t(key: string): string {
  return escape(translation.t(key));
}
function preference(key: string): string | null {
  try {
    return localStorage.getItem(`lilith.${key}`);
  } catch {
    return null;
  }
}
function remember(key: string, value: string): void {
  try {
    localStorage.setItem(`lilith.${key}`, value);
  } catch {
    /* optional preference */
  }
}
function link(path: string, label: string, className = "", extra = ""): string {
  return `<a href="${escape(path)}" class="${className}" ${extra}>${label}</a>`;
}
function externalLink(
  path: string,
  label: string,
  className = "",
  extra = "",
): string {
  return link(
    path,
    label,
    className,
    `target="_blank" rel="noopener noreferrer" ${extra}`,
  );
}
function button(
  action: string,
  label: string,
  extra = "",
  className = "button",
): string {
  return `<button type="button" class="${className}" data-action="${action}" ${extra} ${busy ? "disabled" : ""}>${label}</button>`;
}
function title(route: Route): string {
  return t(`routes.${route.content_key}.title`);
}
function routeCategory(route: Route): Category {
  if (route.category === "property") return "condo";
  if (route.category === "hospitality") return "hotel";
  if (CATEGORIES.includes(route.route_key as Category))
    return route.route_key as Category;
  if (route.route_key === "pickup_details") return "airport_transfer";
  if (route.route_key === "trip_details")
    return current?.category === "private_driver"
      ? "private_driver"
      : "car_with_driver";
  return "bespoke";
}
const categoryPaths: Record<Category, string> = {
  condo: "/condo",
  hotel: "/hotel",
  airport_transfer: "/airport-transfer",
  car_with_driver: "/car-with-driver",
  private_driver: "/private-driver",
  bespoke: "/bespoke-request",
};
const categorySymbols: Record<Category, string> = {
  condo: "⌑",
  hotel: "▥",
  airport_transfer: "↗",
  car_with_driver: "↔",
  private_driver: "⌖",
  bespoke: "✧",
};

function categories(create = false): string {
  return `<div class="category-grid" data-testid="category-select">${CATEGORIES.map(
    (category, index) => {
      const body = `<span class="category-number">0${index + 1}</span><span class="category-symbol" aria-hidden="true">${categorySymbols[category]}</span><span class="category-title">${t(`category.${category}`)}</span><span class="category-description">${t(`category.${category}.description`)}</span><span class="card-arrow" aria-hidden="true">↗</span>`;
      return create
        ? `<button class="category-card" type="button" data-category="${category}" ${busy ? "disabled" : ""}>${body}</button>`
        : link(categoryPaths[category], body, "category-card");
    },
  ).join("")}</div>`;
}

function heading(
  route: Route,
  description: string,
  eyebrow = "discovery.kicker",
): string {
  return `<header class="page-heading"><p class="eyebrow">${t(eyebrow)}</p><h1 tabindex="-1">${title(route)}</h1><p class="lede">${t(description)}</p></header>`;
}

function stateLabel(request: RequestRecord): string {
  return `<span class="state-pill" data-testid="request-state" data-state="${request.state}"><span class="status-dot" aria-hidden="true"></span>${t(`status.${request.state}`)}</span>`;
}

function emptyRequest(): string {
  return `<section class="paper empty"><span class="lili-mark" aria-hidden="true">✧</span><h2>${t("request.empty")}</h2><p>${t("request.empty.description")}</p>${link("/lili/reception", t("hero.start"), "button")}</section>`;
}

function Welcome(route: Route): string {
  if (route.route_id === "R03")
    return `${heading(route, "locale.description")}<section class="paper language-options">${languageControls()}</section>`;
  if (route.route_id === "R04")
    return `${heading(route, "status.description")}${current ? `<section class="paper"><div class="section-top"><h2>${t(`category.${current.category}`)}</h2>${stateLabel(current)}</div>${summary(current)}${link(nextRequestPath(current), t("request.resume"), "button", 'data-testid="resume-request"')}</section>` : emptyRequest()}${requestIds.length ? `<section class="section"><h2>${t("request.history")}</h2><div class="history-list">${requestIds.map((id, index) => button("reopen", `${t("request.current")} ${index + 1} <span aria-hidden="true">↗</span>`, `data-request-id="${escape(id)}"`, "history-item")).join("")}</div></section>` : ""}${link("/lili/reception", t("request.new"), "text-link")}`;
  const hero = `<section class="hero"><div class="hero-copy"><p class="eyebrow">${t("hero.eyebrow")}</p><h1 tabindex="-1">${t("hero.title").replace("\n", "<br>")}</h1><p class="lede">${t("hero.description")}</p><div class="actions">${link("/lili/reception", `${t("hero.start")} <span aria-hidden="true">↗</span>`, "button")}${link("/explore", t("hero.explore"), "text-link")}</div><p class="hero-note"><span aria-hidden="true">○</span> ${t("app.demo")}</p></div><figure class="hero-art"><img src="/assets/welcome.svg" alt="${t("hero.art")}" width="580" height="660"><figcaption>${t("hero.caption")}</figcaption></figure></section>`;
  return `${route.route_id === "R01" ? hero : heading(route, "section.services.description")}<section class="section" id="experiences"><div class="section-top"><div><p class="eyebrow">LILITH CONNECT</p><h2>${t("section.services")}</h2></div><p>${t("section.services.description")}</p></div>${categories()}</section><section class="process-section"><h2>${t("section.process")}</h2><div class="process-grid">${["one", "two", "three"].map((key, index) => `<article><span class="process-number">0${index + 1}</span><h3>${t(`process.${key}`)}</h3><p>${t(`process.${key}.description`)}</p></article>`).join("")}</div></section>`;
}

function Discovery(route: Route): string {
  const category = routeCategory(route);
  const detailPath =
    category === "condo"
      ? "/property/mock-property-1"
      : category === "hotel"
        ? "/hotel/mock-hotel-1"
        : null;
  const related = ROUTES.filter(
    (item) =>
      item.category === route.category &&
      item.route_id !== route.route_id &&
      item.template_id === "T2",
  );
  return `${heading(route, "discovery.description")}<section class="discovery-layout"><figure class="collection-art"><img src="/assets/fixtures/mock-image-${category === "hotel" ? "02" : "01"}.svg" alt="${t("discovery.sample")}" width="600" height="460"><figcaption>${t("discovery.sample")}</figcaption></figure><div class="discovery-copy"><p class="eyebrow">${t("request.sample_only")}</p><h2>${t(`category.${category}.description`)}</h2><p>${t("detail.description")}</p><div class="actions">${button("start-category", t("discovery.begin"), `data-category-start="${category}"`)}${detailPath ? link(detailPath, t("discovery.detail"), "text-link") : ""}</div></div></section>${related.length ? `<section class="section"><h2>${t("discovery.related")}</h2><div class="pill-links">${related.map((item) => link(concretePath(item), title(item), "pill-link")).join("")}</div></section>` : ""}`;
}

function Detail(route: Route): string {
  const category = routeCategory(route);
  return `${heading(route, "detail.description")}<figure class="detail-art"><img src="/assets/welcome.svg" alt="${t("hero.art")}" width="580" height="660"></figure><section class="paper detail-info"><p class="eyebrow">${t("discovery.sample")}</p><h2>${t(category === "condo" ? "detail.property" : "detail.hotel")}</h2><p>${t("detail.description")}</p>${button("start-category", t("discovery.begin"), `data-category-start="${category}"`)}</section>`;
}

function Request(route: Route): string {
  return `${heading(route, "request.details.description")}${current && current.category === routeCategory(route) ? detailsForm() : `<section class="paper"><h2>${t(`category.${routeCategory(route)}`)}</h2><p>${t("request.sample_only")}</p>${button("start-category", t("discovery.begin"), `data-category-start="${routeCategory(route)}"`)}</section>`}`;
}

function Reception(route: Route): string {
  return `${heading(route, "lili.description", "lili.eyebrow")}<div class="reception-banner"><span class="lili-mark" aria-hidden="true">✧</span><p>${t("lili.welcome")}</p></div>${route.route_id === "R30" && current ? detailsForm() : categories(true)}`;
}

function Intake(route: Route): string {
  if (!current)
    return `${heading(route, "request.sample_only")}${emptyRequest()}`;
  if (route.route_id === "R31")
    return `${heading(route, "request.contact.description")}<section class="paper narrow">${stateLabel(current)}<form data-form="contact"><fieldset ${busy || postReview() ? "disabled" : ""}><legend>${t("request.contact")}</legend>${CONTACT_FIXTURES.map((fixture) => `<label class="radio-card compact"><input type="radio" name="contact-fixture" value="${fixture.id}" ${selectedContact === fixture.id ? "checked" : ""}><span>${t(fixture.display_key)}</span></label>`).join("")}</fieldset><p class="muted">${t("request.sample_only")}</p>${postReview() ? link(nextRequestPath(current), t("request.resume"), "button") : `<button class="button" type="submit" data-testid="save-contact" ${busy || !current.details ? "disabled" : ""}>${t("request.save_contact")}</button>`}</form></section>`;
  if (route.route_id === "R32")
    return `${heading(route, "notice.body")}<section class="paper narrow" data-testid="consent-panel">${stateLabel(current)}${consentContent()}</section>${!postReview() ? imageGallery() : ""}`;
  return `${heading(route, "review.description")}<section class="paper narrow"><h2>${t("review.title")}</h2>${stateLabel(current)}${summary(current)}${current.state === "consented" && current.contact_fixture_id ? button("review", t("review.submit"), 'data-testid="review-submit"') : postReview() ? link(nextRequestPath(current), t("request.resume"), "button") : `<p class="notice">${t("review.blocked")}</p>${link(nextRequestPath(current), t("request.continue"), "button")}`}${!postReview() ? link("/lili/requirements", t("request.edit"), "text-link edit-link") : ""}</section>`;
}

function Operations(route: Route): string {
  if (!current)
    return `${heading(route, "status.description")}${emptyRequest()}`;
  return `${heading(route, "status.description")}<section class="paper status-card"><div class="status-symbol" aria-hidden="true">◷</div>${stateLabel(current)}<h2>${t(`status.${current.state}`)}</h2><p>${t("status.pending_notice")}</p><div class="notice"><h3>${t("routes.human_handoff.title")}</h3><p>${t("status.destination")}</p>${current.state === "human_handoff_pending" ? `<p>${t("status.handoff_note")}</p>` : ""}</div>${current.state === "review_pending" ? button("handoff", t("status.handoff"), 'data-testid="handoff-submit"') : !postReview() ? link(nextRequestPath(current), t("request.continue"), "button") : ""}<div class="status-summary">${summary(current)}</div>${link("/my-request", t("nav.request"), "text-link")}</section>`;
}

function Support(route: Route): string {
  return `${heading(route, "support.description")}<div class="support-grid">${["local", "privacy", "operations", "legal"].map((key, index) => `<article class="paper"><span class="process-number">0${index + 1}</span><h2>${t(`support.${key}.title`)}</h2><p>${t(`support.${key}.body`)}</p></article>`).join("")}</div><section class="section route-directory"><h2>${t("nav.all")}</h2><div class="pill-links">${ROUTES.map((item) => link(concretePath(item), title(item), "pill-link")).join("")}</div></section>`;
}

// Exactly eight reusable page families; routes contain data, never page implementations.
export const TEMPLATE_RENDERERS: Record<TemplateId, (route: Route) => string> =
  {
    T1: Welcome,
    T2: Discovery,
    T3: Detail,
    T4: Request,
    T5: Reception,
    T6: Intake,
    T7: Operations,
    T8: Support,
  };
export const TEMPLATE_REGISTRY = TEMPLATE_RENDERERS;

function languageControls(): string {
  return `<div class="language-switch" aria-label="${t("nav.language")}"><button type="button" data-locale="th" aria-pressed="${locale === "th"}" ${busy ? "disabled" : ""}>ไทย</button><button type="button" data-locale="en" aria-pressed="${locale === "en"}" ${busy ? "disabled" : ""}>English</button></div>`;
}
function postReview(): boolean {
  return (
    current?.state === "review_pending" ||
    current?.state === "human_handoff_pending"
  );
}

function presetForCurrent(): DetailPreset | undefined {
  return current
    ? findDetailPreset(current.category, current.details)
    : undefined;
}
function detailsForm(): string {
  if (!current) return emptyRequest();
  if (postReview())
    return `<section class="paper">${stateLabel(current)}${summary(current)}${link(nextRequestPath(current), t("request.resume"), "button")}</section>`;
  const presets = DETAIL_PRESETS.filter(
    (preset) => preset.category === current?.category,
  );
  const selected = selectedPreset || presetForCurrent()?.id || presets[0]?.id;
  return `<section class="paper"><div class="section-top"><h2>${t(`category.${current.category}`)}</h2>${stateLabel(current)}</div><p>${t("request.details.description")}</p><form data-form="details"><fieldset ${busy ? "disabled" : ""}><legend>${t("request.details")}</legend><div class="preset-grid">${presets.map((preset, index) => `<label class="radio-card"><span class="radio-heading"><input type="radio" name="detail-preset" value="${preset.id}" ${selected === preset.id ? "checked" : ""}><strong>${t(index === 0 ? "request.preset.one" : "request.preset.two")}</strong></span>${detailSummary(preset)}</label>`).join("")}</div></fieldset><p class="muted">${t("request.sample_only")}</p>${current.consent.state !== "unset" ? `<p class="notice">${t("request.edit_notice")}</p>` : ""}<button class="button" type="submit" data-testid="save-details" ${busy ? "disabled" : ""}>${t("request.save_details")}</button></form></section>${imageGallery()}`;
}

function detailSummary(preset: DetailPreset): string {
  const values: Array<[string, string]> = [];
  const second = preset.id.endsWith("02");
  const number = (value: number) =>
    new Intl.NumberFormat(translation.locale).format(value);
  const date = (value: string) =>
    new Intl.DateTimeFormat(translation.locale, {
      dateStyle: "medium",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  const datetime = (value: string) =>
    new Intl.DateTimeFormat(translation.locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  if (preset.category === "condo") {
    const details = preset.details;
    values.push(
      ["intent", t(`value.${details.intent}`)],
      ["area", t(second ? "value.sample_area_two" : "value.sample_area_one")],
      [
        "budget",
        `฿${number(details.budget.min)} – ฿${number(details.budget.max)}`,
      ],
      ["bedrooms", number(details.bedrooms)],
      [
        "timeframe",
        t(second ? "value.sample_time_two" : "value.sample_time_one"),
      ],
    );
  } else if (preset.category === "hotel") {
    const details = preset.details;
    values.push(
      [
        "location",
        t(second ? "value.sample_area_two" : "value.sample_area_one"),
      ],
      [
        "dates",
        `${escape(date(details.check_in))} – ${escape(date(details.check_out))}`,
      ],
      ["guests", number(details.guests)],
      [
        "preferences",
        t(second ? "value.sample_preference_two" : "value.sample_preference"),
      ],
    );
  } else if (preset.category === "airport_transfer") {
    const details = preset.details;
    values.push(
      [
        "pickup",
        t(second ? "value.sample_destination" : "value.sample_pickup"),
      ],
      [
        "destination",
        t(second ? "value.sample_pickup" : "value.sample_destination"),
      ],
      ["datetime", escape(datetime(details.date_time))],
      ["passengers", number(details.passengers)],
    );
  } else if (
    preset.category === "car_with_driver" ||
    preset.category === "private_driver"
  ) {
    const details = preset.details;
    values.push(
      ["datetime", escape(datetime(details.date_time))],
      [
        "pickup",
        t(second ? "value.sample_garden_lobby" : "value.sample_destination"),
      ],
      [
        "itinerary",
        t(second ? "value.sample_itinerary_two" : "value.sample_itinerary"),
      ],
      ["passengers", number(details.passengers)],
    );
  } else if (preset.category === "bespoke")
    values.push(
      [
        "description",
        t(second ? "value.sample_description_two" : "value.sample_description"),
      ],
      ["timing", t(second ? "value.sample_week" : "value.sample_evening")],
    );
  return `<dl class="detail-list">${values.map(([key, value]) => `<div><dt>${t(`field.${key}`)}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}

function summary(request: RequestRecord): string {
  const preset = findDetailPreset(request.category, request.details);
  const contact = CONTACT_FIXTURES.find(
    (item) => item.id === request.contact_fixture_id,
  );
  return `${preset ? detailSummary(preset) : ""}<dl class="detail-list summary"><div><dt>${t("field.contact")}</dt><dd>${contact ? t(contact.display_key) : t("value.not_selected")}</dd></div><div><dt>${t("field.consent")}</dt><dd>${t(`value.consent_${request.consent.state}`)}</dd></div><div><dt>${t("field.images")}</dt><dd>${request.images.length} / 4</dd></div></dl>${savedGallery(request)}`;
}

function consentContent(): string {
  if (!current) return "";
  if (!current.notice.acknowledged)
    return `<div class="consent-copy"><h2>${t("notice.title")}</h2><p>${t("notice.body")}</p>${current.details ? button("notice", t("notice.acknowledge"), 'data-testid="notice-acknowledge"') : `<p>${t("consent.required")}</p>${link("/lili/requirements", t("request.continue"), "button")}`}</div>`;
  const recorded = postReview();
  return `<div class="consent-copy"><h2>${t("consent.title")}</h2><p class="review-label">${t("consent.review_required")}</p><p>${t("consent.body")}</p><p class="muted">${t("consent.version")}</p>${recorded ? `<p>${t("consent.recorded")}</p><p>${t(`value.consent_${current.consent.state}`)}</p>` : `<div class="consent-actions">${button("accept", t("consent.accept"), 'data-testid="consent-accept"', "button choice-button")}${button("decline", t("consent.decline"), 'data-testid="consent-decline"', "button choice-button")}</div>`}${current.consent.state === "declined" ? `<p class="notice" role="status" data-testid="consent-declined">${t("consent.declined")}</p>` : current.consent.state === "accepted" ? `<p class="notice" role="status">${t("consent.accepted")}</p>${link(recorded ? nextRequestPath(current) : "/intake/review", t("request.continue"), "button", 'data-testid="review-link"')}` : ""}</div>`;
}

function savedGallery(request: RequestRecord): string {
  return `<div class="saved-gallery" data-testid="saved-images">${request.images.map((image) => `<figure data-saved-image="${escape(image.image_fixture_id)}"><img src="/api/prototype/requests/${encodeURIComponent(request.id)}/images/${encodeURIComponent(image.id)}" alt="${t(IMAGE_FIXTURES.find((fixture) => fixture.id === image.image_fixture_id)?.label_key ?? "discovery.sample")}" width="240" height="180"><figcaption>${t("images.saved")}</figcaption>${request.state === "consented" ? button("image-remove", t("images.remove"), `data-image-remove="${escape(image.id)}"`, "small-button") : ""}</figure>`).join("")}</div>`;
}

function imageGallery(): string {
  if (!current) return "";
  const saved = new Set(current.images.map((image) => image.image_fixture_id));
  return `<section class="section image-section"><h2>${t("images.title")}</h2><p>${t("images.description")}</p>${savedGallery(current)}<div class="image-picker">${IMAGE_FIXTURES.map(
    (fixture) => {
      const selected = previews.has(fixture.id);
      return `<article class="image-option ${selected ? "selected" : ""}"><img src="${fixture.src}" alt="${t(fixture.label_key)}" width="240" height="180"><h3>${t(fixture.label_key)}</h3>${saved.has(fixture.id) ? `<p>${t("images.saved")}</p>` : `${button("image-preview", selected ? t("images.remove") : t("images.preview"), `data-image-preview="${fixture.id}" aria-pressed="${selected}"`, "small-button")}${selected ? `<p class="muted">${t("images.preview_only")}</p>${current?.state === "consented" ? button("image-save", failedImages.has(fixture.id) ? t("images.retry") : t("images.save"), `data-image-save="${fixture.id}"`, "small-button") : ""}` : ""}`}${failedImages.has(fixture.id) ? `<p class="error-inline" data-testid="image-error">${t("images.failed")}</p>` : ""}</article>`;
    },
  ).join("")}</div></section>`;
}

function render(): void {
  try {
    translation = resolveLocale(locale);
    document.documentElement.lang = translation.locale;
    const route = resolveRoute(location.pathname);
    document.title = `${route ? translation.t(`routes.${route.content_key}.title`) : translation.t("app.not_found")} · LILITH Connect`;
    app.innerHTML = `<a class="skip-link" href="#content">${t("nav.skip")}</a><div class="prototype-strip"><span class="tiny-dot" aria-hidden="true"></span>${t("app.prototype")}</div><header class="site-header">${link("/welcome", '<span class="wordmark">LILITH</span><span class="wordmark-sub">CONNECT</span>', "brand", 'aria-label="LILITH Connect"')}<nav aria-label="${t("nav.explore")}">${link("/explore", t("nav.explore"))}${link("/my-request", t("nav.request"))}${externalLink("https://www.yacht.day/", t("nav.yacht"))}${link("/lili/reception", t("hero.start"), "nav-lili")}</nav>${languageControls()}</header>${translation.fallback ? `<p class="fallback-notice" role="status">${t("locale.fallback")}</p>` : ""}<div class="feedback" aria-live="polite">${busy ? `<p class="saving-note">${t("app.saving")}</p>` : ""}${errorCode ? `<div class="error-box" role="alert"><p>${errorCode === "NETWORK" ? t("app.offline") : t(resources[translation.locale][`error.${errorCode}`] ? `error.${errorCode}` : "error.INTERNAL_ERROR")}</p>${retryAction ? button("retry", t("app.retry"), 'data-testid="retry-operation"', "small-button") : ""}</div>` : ""}</div><main id="content" data-route-id="${route?.route_id ?? "unknown"}" data-template-id="${route?.template_id ?? ""}">${!ready ? `<p class="loading" role="status">${t("app.loading")}</p>` : route ? TEMPLATE_RENDERERS[route.template_id](route) : `<section class="paper empty"><p class="eyebrow">404</p><h1 tabindex="-1">${t("app.not_found")}</h1><p>${t("app.not_found.description")}</p>${link("/welcome", t("nav.home"), "button")}</section>`}</main><footer class="site-footer"><div><span class="wordmark">LILITH</span><p>${t("footer.signature")}</p></div><div><p>${t("footer.note")}</p>${link("/support", t("routes.help_support.title"))}${link("/privacy-safety", t("routes.privacy_safety.title"))}${externalLink("https://www.yacht.day/", t("footer.yacht"))}</div></footer>`;
  } catch {
    // English completeness is a build gate. Unexpected runtime corruption fails closed.
    app.replaceChildren();
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    error.textContent = "Content unavailable. Reload the local prototype.";
    document.documentElement.lang = "en";
    app.append(error);
  }
}

function navigate(path: string): void {
  history.pushState({}, "", path);
  errorCode = "";
  render();
  document.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function invalidateImages(): void {
  generation += 1;
  previews.clear();
  failedImages.clear();
}
async function refresh(
  id: string,
  responseGeneration = generation,
  operation?: string,
): Promise<void> {
  const path = `/requests/${encodeURIComponent(id)}`;
  const record = operation
    ? await client.confirm<RequestRecord>(operation, path)
    : await client.get<RequestRecord>(path);
  if (mayAdoptRequest(current, record, generation, responseGeneration)) {
    current = record;
    remember("request", record.id);
    selectedPreset = presetForCurrent()?.id ?? "";
    selectedContact = record.contact_fixture_id ?? CONTACT_FIXTURES[0].id;
    if (!requestIds.includes(record.id)) requestIds.push(record.id);
  }
}
async function operation(action: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  errorCode = "";
  retryAction = action;
  render();
  try {
    await action();
    retryAction = null;
  } catch (error) {
    errorCode = error instanceof ApiError ? error.code : "NETWORK";
    if (error instanceof ApiError && error.status < 500) {
      retryAction = null;
      if (current) {
        try {
          await refresh(current.id);
        } catch {
          /* original error remains visible */
        }
      }
    }
  } finally {
    busy = false;
    render();
  }
}

async function start(category: Category): Promise<void> {
  const captured = category;
  await operation(async () => {
    invalidateImages();
    const record = await client.write<RequestRecord>(
      `create-${captured}`,
      "POST",
      "/drafts",
      { category: captured },
    );
    current = null;
    await refresh(record.id, generation, `create-${captured}`);
    selectedPreset = "";
    navigate("/lili/requirements");
  });
}

async function mutate(
  suffix: string,
  values: Record<string, unknown>,
  redirect?: string,
  invalidate = false,
): Promise<void> {
  if (!current) return;
  const request = current;
  if (invalidate) invalidateImages();
  const capturedGeneration = generation;
  const body = { revision: request.revision, ...values };
  await operation(async () => {
    await client.write<RequestRecord>(
      `${request.id}-${suffix}-${request.revision}`,
      "POST",
      `/requests/${request.id}/${suffix}`,
      body,
    );
    await refresh(
      request.id,
      capturedGeneration,
      `${request.id}-${suffix}-${request.revision}`,
    );
    if (redirect && capturedGeneration === generation) navigate(redirect);
  });
}

async function saveDraft(
  preset: DetailPreset,
  contact: string | null,
  redirect: string,
): Promise<void> {
  if (!current || postReview()) return;
  const request = current;
  invalidateImages();
  const capturedGeneration = generation;
  await operation(async () => {
    await client.write<RequestRecord>(
      `${request.id}-details-${request.revision}`,
      "PUT",
      `/drafts/${request.id}`,
      {
        revision: request.revision,
        category: preset.category,
        details: preset.details,
        contact_fixture_id: contact,
      },
    );
    await refresh(
      request.id,
      capturedGeneration,
      `${request.id}-details-${request.revision}`,
    );
    navigate(redirect);
  });
}

app.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const fields = new FormData(form);
  if (form.dataset.form === "details") {
    const preset = DETAIL_PRESETS.find(
      (item) =>
        item.id === fields.get("detail-preset") &&
        item.category === current?.category,
    );
    if (preset) {
      selectedPreset = preset.id;
      void saveDraft(
        preset,
        current?.contact_fixture_id ?? null,
        "/intake/contact",
      );
    }
  } else if (form.dataset.form === "contact") {
    const preset = presetForCurrent();
    const fixture = CONTACT_FIXTURES.find(
      (item) => item.id === fields.get("contact-fixture"),
    );
    if (preset && fixture) {
      selectedContact = fixture.id;
      void saveDraft(preset, fixture.id, "/intake/consent");
    }
  }
});

app.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (
    anchor &&
    anchor.origin === location.origin &&
    !anchor.hash &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey
  ) {
    event.preventDefault();
    navigate(anchor.pathname);
    return;
  }
  const control = target.closest<HTMLButtonElement>("button");
  if (!control || control.disabled || busy) return;
  const choice = control.dataset.category ?? control.dataset.categoryStart;
  if (choice && CATEGORIES.includes(choice as Category)) {
    void start(choice as Category);
    return;
  }
  if (control.dataset.locale) {
    const selected = normaliseLocale(control.dataset.locale);
    void operation(async () => {
      await client.write(`locale-${selected}`, "PUT", "/locale", {
        locale: selected,
      });
      client.resolve(`locale-${selected}`);
      locale = selected;
      remember("locale", locale);
    });
    return;
  }
  const action = control.dataset.action;
  if (action === "retry" && retryAction) {
    void operation(retryAction);
    return;
  }
  if (action === "reopen" && control.dataset.requestId) {
    const id = control.dataset.requestId;
    void operation(async () => {
      invalidateImages();
      current = null;
      await refresh(id);
      if (current) navigate(nextRequestPath(current));
    });
    return;
  }
  if (action === "notice") {
    void mutate("notice", { notice_version: NOTICE_VERSION });
    return;
  }
  if (action === "accept" || action === "decline") {
    void mutate(
      "consent",
      { decision: action, consent_version: CONSENT_VERSION },
      undefined,
      action === "decline",
    );
    return;
  }
  if (action === "review") {
    void mutate("review", {}, "/status/pending");
    return;
  }
  if (action === "handoff") {
    void mutate("handoff", {}, "/status/handoff");
    return;
  }
  if (action === "image-preview") {
    const id = control.dataset.imagePreview;
    if (!id || !current) return;
    if (previews.has(id)) previews.delete(id);
    else if (current.images.length + previews.size < 4) previews.add(id);
    else errorCode = "IMAGE_LIMIT";
    render();
    return;
  }
  if (action === "image-save" && current && control.dataset.imageSave) {
    const fixture = control.dataset.imageSave;
    const request = current;
    const capturedGeneration = generation;
    void operation(async () => {
      try {
        await client.write<RequestRecord>(
          `${request.id}-image-${fixture}-${request.revision}`,
          "POST",
          `/requests/${request.id}/images`,
          { revision: request.revision, image_fixture_id: fixture },
        );
        await refresh(
          request.id,
          capturedGeneration,
          `${request.id}-image-${fixture}-${request.revision}`,
        );
        if (capturedGeneration === generation) {
          previews.delete(fixture);
          failedImages.delete(fixture);
        }
      } catch (error) {
        if (capturedGeneration === generation) failedImages.add(fixture);
        throw error;
      }
    });
    return;
  }
  if (action === "image-remove" && current && control.dataset.imageRemove) {
    const request = current;
    const imageId = control.dataset.imageRemove;
    const capturedGeneration = generation;
    void operation(async () => {
      await client.write(
        `${request.id}-remove-${imageId}-${request.revision}`,
        "DELETE",
        `/requests/${request.id}/images/${imageId}`,
        { revision: request.revision },
      );
      await refresh(
        request.id,
        capturedGeneration,
        `${request.id}-remove-${imageId}-${request.revision}`,
      );
    });
  }
});

window.addEventListener("popstate", () => {
  render();
});
async function bootstrap(): Promise<void> {
  locale = normaliseLocale(preference("locale"));
  render();
  await operation(async () => {
    const data = await client.get<BootstrapData>("/bootstrap");
    client.csrf = data.csrf_token;
    const saved = preference("locale");
    locale =
      saved === null ? normaliseLocale(data.locale) : normaliseLocale(saved);
    if (locale !== data.locale) {
      await client.write(`locale-${locale}`, "PUT", "/locale", { locale });
      client.resolve(`locale-${locale}`);
    }
    requestIds = data.request_ids;
    const id = preference("request");
    if (id && requestIds.includes(id)) {
      try {
        await refresh(id);
      } catch {
        current = null;
      }
    }
    ready = true;
  });
}
void bootstrap();
