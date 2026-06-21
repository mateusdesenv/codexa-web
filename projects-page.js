const projectsGrid = document.getElementById("projectsGrid");
const projectsState = document.getElementById("projectsState");
const projectsFiltersForm = document.getElementById("projectsFilters");
const projectCategoryFilter = document.getElementById("projectCategoryFilter");
const projectNicheFilter = document.getElementById("projectNicheFilter");
const projectClearFilters = document.getElementById("projectClearFilters");
const featuredProjectsContainer = document.getElementById("featuredProjects");

const configuredPortfolioApi = window.CODEXA_PORTFOLIO_API || {};
const projectsApiConfig = {
  baseUrl: "https://SEU-PROJETO.vercel.app",
  publicPath: "/api/v1/portfolio-items",
  categoriesPath: "/api/v1/categories",
  nichesPath: "/api/v1/niches",
  status: "published",
  timeout: 15000,
  ...configuredPortfolioApi,
  limit: 100
};

const ALL_FILTER_VALUE = "";
const URL_FILTER_KEYS = {
  category: ["categoria", "category"],
  niche: ["nicho", "niche"]
};
const URL_FILTER_CANONICAL_KEYS = {
  category: "categoria",
  niche: "nicho"
};
const FILTER_LABELS = {
  category: {
    singular: "categoria selecionada",
    plural: "categorias selecionadas",
    placeholder: "Todas as categorias"
  },
  niche: {
    singular: "nicho selecionado",
    plural: "nichos selecionados",
    placeholder: "Todos os nichos"
  }
};

let allProjects = [];
let allCategories = [];
let allNiches = [];
let activeFilters = {
  category: [],
  niche: []
};

function normalizeProjectBaseUrl(url = "") {
  return String(url).replace(/\/+$/, "");
}

function escapeProjectHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeFilterValue(value = "") {
  return String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSelectedValues(values = []) {
  const list = Array.isArray(values) ? values : [values];
  const map = new Map();

  list
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeFilterValue(value);
      if (key && !map.has(key)) map.set(key, value);
    });

  return Array.from(map.values());
}

function valuesMatch(currentValue, selectedValue) {
  if (!selectedValue) return true;
  return normalizeFilterValue(currentValue) === normalizeFilterValue(selectedValue);
}

function matchesAnySelectedValue(currentValue, selectedValues = []) {
  const normalizedSelectedValues = normalizeSelectedValues(selectedValues);
  if (!normalizedSelectedValues.length) return true;
  return normalizedSelectedValues.some((selectedValue) => valuesMatch(currentValue, selectedValue));
}

function getUrlFilterValues(filterName) {
  if (!window.location?.search) return [];

  const params = new URLSearchParams(window.location.search);
  const keys = URL_FILTER_KEYS[filterName] || [];
  const values = [];

  keys.forEach((key) => {
    params.getAll(key).forEach((value) => {
      values.push(...String(value || "").split(","));
    });
  });

  return normalizeSelectedValues(values);
}

function resolveFilterValuesFromOptions(rawValues, availableValues = []) {
  const normalizedAvailableValues = new Map(
    availableValues.map((value) => [normalizeFilterValue(value), value])
  );

  return normalizeSelectedValues(rawValues)
    .map((rawValue) => normalizedAvailableValues.get(normalizeFilterValue(rawValue)))
    .filter(Boolean);
}

function applyFiltersFromUrl() {
  const categoriesFromUrl = getUrlFilterValues("category");
  const nichesFromUrl = getUrlFilterValues("niche");

  activeFilters = {
    category: resolveFilterValuesFromOptions(categoriesFromUrl, allCategories),
    niche: resolveFilterValuesFromOptions(nichesFromUrl, allNiches)
  };

  updateFilterControlsState();
  syncFiltersToUrl();
}

function syncFiltersToUrl() {
  if (!window.history?.replaceState) return;

  const url = new URL(window.location.href);
  [...URL_FILTER_KEYS.category, ...URL_FILTER_KEYS.niche].forEach((key) => {
    url.searchParams.delete(key);
  });

  if (activeFilters.category.length) {
    url.searchParams.set(URL_FILTER_CANONICAL_KEYS.category, activeFilters.category.join(","));
  }

  if (activeFilters.niche.length) {
    url.searchParams.set(URL_FILTER_CANONICAL_KEYS.niche, activeFilters.niche.join(","));
  }

  window.history.replaceState(null, "", url.toString());
}

function buildApiUrl(path, params = {}) {
  const baseUrl = normalizeProjectBaseUrl(projectsApiConfig.baseUrl);
  const url = new URL(`${baseUrl}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function buildProjectsApiUrl() {
  return buildApiUrl(projectsApiConfig.publicPath || "/api/v1/portfolio-items", {
    status: projectsApiConfig.status || "published",
    showInPortfolio: true,
    limit: projectsApiConfig.limit || 100
  });
}

function requestProjectsWithTimeout(request, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  return request(controller.signal).finally(() => window.clearTimeout(timeout));
}

async function fetchList(url) {
  const response = await requestProjectsWithTimeout(
    (signal) => fetch(url, { signal }),
    projectsApiConfig.timeout
  );
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = result?.error?.message || `A API retornou status ${response.status}.`;
    throw new Error(message);
  }

  return Array.isArray(result?.data) ? result.data : [];
}

const PortfolioProjectsService = {
  list() {
    return fetchList(buildProjectsApiUrl());
  },

  listCategories() {
    return fetchList(buildApiUrl(projectsApiConfig.categoriesPath || "/api/v1/categories"));
  },

  listNiches() {
    return fetchList(buildApiUrl(projectsApiConfig.nichesPath || "/api/v1/niches"));
  }
};

function showProjectsState(type, title, description) {
  if (!projectsState) return;

  projectsState.className = `projects-state projects-state--${escapeProjectHtml(type)}`;
  projectsState.hidden = false;
  projectsState.innerHTML = `
    <span></span>
    <strong>${escapeProjectHtml(title)}</strong>
    <p>${escapeProjectHtml(description)}</p>
  `;
}

function hideProjectsState() {
  if (projectsState) projectsState.hidden = true;
}

function normalizeStringList(value) {
  if (!value) return [];

  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return list
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeProject(item) {
  const niches = normalizeStringList(item.niches || item.niche || item.tags);
  const displayMode = item.displayMode || "default";
  const fallbackTitle = item.title || item.featuredTitle || "Projeto Codexa";
  const fallbackDesktopImage = item.desktopImageUrl || item.featuredImage || item.mobileImageUrl || "../assets/prototipo-site-codexa.png";

  return {
    id: item.id || item.slug || crypto.randomUUID(),
    title: fallbackTitle,
    slug: item.slug || "",
    category: item.category || "Sem categoria",
    niches,
    shortDescription: item.shortDescription || item.featuredDescription || "Projeto desenvolvido pela Codexa com foco em presença digital e conversão.",
    projectUrl: item.projectUrl || item.primaryCtaUrl || "",
    desktopImageUrl: fallbackDesktopImage,
    mobileImageUrl: item.mobileImageUrl || item.desktopImageUrl || item.featuredImage || "",
    altText: item.altText || item.featuredImageAlt || `Projeto ${fallbackTitle}`,
    order: Number(item.order || 0),
    status: item.status || "published",
    featured: Boolean(item.featured),
    projectType: item.projectType || "website",
    displayMode,
    showInPortfolio: item.showInPortfolio !== false,
    showInHome: Boolean(item.showInHome),
    isFilterable: item.isFilterable !== false,
    featuredLabel: item.featuredLabel || "CASE ESPECIAL",
    featuredTitle: item.featuredTitle || fallbackTitle,
    featuredSubtitle: item.featuredSubtitle || "Sistema completo",
    featuredDescription: item.featuredDescription || item.shortDescription || "Projeto desenvolvido pela Codexa com estrutura completa, estratégia visual e foco em resultado.",
    featuredImage: item.featuredImage || fallbackDesktopImage,
    featuredImageAlt: item.featuredImageAlt || item.altText || `Preview do projeto ${fallbackTitle}`,
    previewUrlLabel: item.previewUrlLabel || extractPreviewLabel(item.primaryCtaUrl || item.projectUrl),
    previewStyle: item.previewStyle || "browser",
    featuredTags: normalizeStringList(item.featuredTags || item.tags).slice(0, 6),
    features: normalizeFeatures(item.features),
    primaryCtaLabel: item.primaryCtaLabel || "Ver projeto",
    primaryCtaUrl: item.primaryCtaUrl || item.projectUrl || "",
    secondaryCtaLabel: item.secondaryCtaLabel || "Entender estrutura",
    secondaryCtaUrl: item.secondaryCtaUrl || "",
    openInNewTab: item.openInNewTab !== false
  };
}

function normalizeFeatures(features) {
  return Array.isArray(features)
    ? features
        .map((feature) => ({
          icon: feature?.icon || "code",
          title: String(feature?.title || "").trim(),
          description: String(feature?.description || "").trim()
        }))
        .filter((feature) => feature.title && feature.description)
        .slice(0, 4)
    : [];
}

function extractPreviewLabel(url = "") {
  try {
    if (!url) return "";
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function normalizeTaxonomyItem(item) {
  const name = String(item?.name || item?.title || item || "").trim();
  if (!name) return null;

  return {
    id: item?.id || item?._id || item?.slug || name,
    name,
    slug: item?.slug || normalizeFilterValue(name),
    isActive: item?.isActive !== false
  };
}

function getUniqueSortedNames(values) {
  const map = new Map();

  values.forEach((value) => {
    const name = String(value || "").trim();
    if (!name) return;
    const key = normalizeFilterValue(name);
    if (!map.has(key)) map.set(key, name);
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getFallbackCategoriesFromProjects() {
  return getUniqueSortedNames(allProjects.map((project) => project.category));
}

function getFallbackNichesFromProjects() {
  return getUniqueSortedNames(allProjects.flatMap((project) => project.niches));
}

function extractTaxonomyNames(items, fallbackNames) {
  const names = getUniqueSortedNames(
    items
      .map(normalizeTaxonomyItem)
      .filter((item) => item && item.isActive)
      .map((item) => item.name)
  );

  return names.length ? names : fallbackNames;
}

function getMultiselectButton(multiselect) {
  return multiselect?.querySelector(".projects-multiselect__button");
}

function getMultiselectDropdown(multiselect) {
  return multiselect?.querySelector(".projects-multiselect__dropdown");
}

function getMultiselectOptions(multiselect) {
  return multiselect?.querySelector(".projects-multiselect__options");
}

function renderMultiSelectOptions(multiselect, filterName, values) {
  if (!multiselect) return;

  const optionsWrapper = getMultiselectOptions(multiselect);
  if (!optionsWrapper) return;

  optionsWrapper.innerHTML = values.length
    ? values.map((value) => {
        const safeValue = escapeProjectHtml(value);
        const inputId = `project-${filterName}-${normalizeFilterValue(value)}`;

        return `
          <label class="projects-multiselect__option" for="${escapeProjectHtml(inputId)}">
            <input id="${escapeProjectHtml(inputId)}" type="checkbox" value="${safeValue}" />
            <span class="projects-multiselect__checkbox" aria-hidden="true"></span>
            <span class="projects-multiselect__option-text">${safeValue}</span>
          </label>
        `;
      }).join("")
    : `<div class="projects-multiselect__empty">Nenhuma opção disponível</div>`;
}

function updateMultiSelectControl(multiselect, filterName, values) {
  if (!multiselect) return;

  const labelConfig = FILTER_LABELS[filterName];
  const selectedValues = normalizeSelectedValues(activeFilters[filterName]);
  const selectedValueKeys = new Set(selectedValues.map(normalizeFilterValue));
  const button = getMultiselectButton(multiselect);
  const dropdown = getMultiselectDropdown(multiselect);
  const valueLabel = multiselect.querySelector(".projects-multiselect__value");
  const counter = multiselect.querySelector(".projects-multiselect__counter");
  const checkboxes = multiselect.querySelectorAll('input[type="checkbox"]');
  const isDisabled = values.length === 0;

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectedValueKeys.has(normalizeFilterValue(checkbox.value));
  });

  if (button) {
    button.disabled = isDisabled;
    button.setAttribute("aria-expanded", multiselect.classList.contains("is-open") ? "true" : "false");
  }

  if (dropdown && isDisabled) {
    dropdown.hidden = true;
    multiselect.classList.remove("is-open");
  }

  if (valueLabel) {
    if (!selectedValues.length) {
      valueLabel.textContent = labelConfig.placeholder;
    } else if (selectedValues.length === 1) {
      valueLabel.textContent = selectedValues[0];
    } else {
      valueLabel.textContent = `${selectedValues.length} ${labelConfig.plural}`;
    }
  }

  if (counter) {
    counter.textContent = selectedValues.length;
    counter.hidden = selectedValues.length === 0;
  }

  multiselect.classList.toggle("is-active", selectedValues.length > 0);
  multiselect.classList.toggle("is-disabled", isDisabled);
}

function renderFilters() {
  allCategories = extractTaxonomyNames(allCategories, getFallbackCategoriesFromProjects());
  allNiches = extractTaxonomyNames(allNiches, getFallbackNichesFromProjects());

  renderMultiSelectOptions(projectCategoryFilter, "category", allCategories);
  renderMultiSelectOptions(projectNicheFilter, "niche", allNiches);
  updateFilterControlsState();
}

function updateFilterControlsState() {
  updateMultiSelectControl(projectCategoryFilter, "category", allCategories);
  updateMultiSelectControl(projectNicheFilter, "niche", allNiches);

  const hasActiveFilter = Boolean(activeFilters.category.length || activeFilters.niche.length);
  if (projectClearFilters) projectClearFilters.disabled = !hasActiveFilter;
}

function getVisibleProjects() {
  return allProjects
    .filter((project) => project.status === "published")
    .filter((project) => project.showInPortfolio !== false)
    .filter((project) => project.displayMode !== "featured")
    .filter((project) => project.isFilterable !== false)
    .filter((project) => matchesAnySelectedValue(project.category, activeFilters.category))
    .filter((project) => {
      if (!activeFilters.niche.length) return true;
      return project.niches.some((niche) => matchesAnySelectedValue(niche, activeFilters.niche));
    })
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function getFeaturedProjects() {
  return allProjects
    .filter((project) => project.status === "published")
    .filter((project) => project.showInPortfolio !== false)
    .filter((project) => project.displayMode === "featured")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function renderProjectTaxonomies(project) {
  const nicheBadges = project.niches.slice(0, 3).map((niche) => `
    <span class="projects-card__niche">${escapeProjectHtml(niche)}</span>
  `).join("");

  return `
    <div class="projects-card__taxonomies">
      <span class="projects-card__category">${escapeProjectHtml(project.category)}</span>
      ${nicheBadges}
    </div>
  `;
}

function renderProjectCard(project) {
  const safeUrl = escapeProjectHtml(project.projectUrl);
  const safeTitle = escapeProjectHtml(project.title);
  const safeDesktopImage = escapeProjectHtml(project.desktopImageUrl);
  const safeMobileImage = escapeProjectHtml(project.mobileImageUrl || project.desktopImageUrl);
  const safeAltText = escapeProjectHtml(project.altText);
  const link = project.projectUrl
    ? `<a class="projects-card__link" href="${safeUrl}" target="_blank" rel="noopener">Ver projeto <span>→</span></a>`
    : `<span class="projects-card__link projects-card__link--disabled">Projeto em breve</span>`;

  return `
    <article class="projects-card reveal">
      <a class="projects-card__media" href="${safeUrl || "#"}" ${project.projectUrl ? 'target="_blank" rel="noopener"' : ""} aria-label="Abrir projeto ${safeTitle}">
        <picture>
          <source media="(max-width: 768px)" srcset="${safeMobileImage}" />
          <img src="${safeDesktopImage}" alt="${safeAltText}" loading="lazy" />
        </picture>
      </a>
      <div class="projects-card__content">
        ${renderProjectTaxonomies(project)}
        <h3>${safeTitle}</h3>
        <p>${escapeProjectHtml(project.shortDescription)}</p>
        ${link}
      </div>
    </article>
  `;
}

function isExternalUrl(url = "") {
  return /^https?:\/\//i.test(String(url));
}

function renderFeaturedIcon(icon = "code") {
  const icons = {
    cart: '<path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h6.9a2 2 0 0 0 1.9-1.4L21 8H7" /><path d="M10 21h.01M18 21h.01" />',
    grid: '<path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />',
    database: '<path d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" /><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />',
    flow: '<path d="M18 7h-7a4 4 0 0 0 0 8h1" /><path d="m15 4 3 3-3 3" /><path d="M6 17h7a4 4 0 0 0 0-8h-1" /><path d="m9 20-3-3 3-3" />',
    shield: '<path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" /><path d="m9.5 12 1.8 1.8L15 10" />',
    chart: '<path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-3 3 2 5-7" />',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L6.6 17l.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.6-1H5v-3h.4A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h3v.7a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 8l-.1.1A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.6 1h.4v3H21a1.7 1.7 0 0 0-1.6 1Z" />',
    code: '<path d="m9 18-6-6 6-6" /><path d="m15 6 6 6-6 6" /><path d="m14 4-4 16" />'
  };

  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">${icons[icon] || icons.code}</svg>`;
}

function renderFeaturedCta(label, url, className, openInNewTab = true) {
  if (!label || !url) return "";
  const external = isExternalUrl(url);
  const target = external && openInNewTab ? 'target="_blank" rel="noopener"' : "";
  return `<a class="${className}" href="${escapeProjectHtml(url)}" ${target}>${escapeProjectHtml(label)} <span>→</span></a>`;
}

function renderFeaturedProjectCard(project) {
  const safeId = `case-${escapeProjectHtml(project.slug || project.id)}`;
  const titleId = `${safeId}-title`;
  const tags = project.featuredTags.length
    ? project.featuredTags
    : [project.projectType, project.category].filter(Boolean);
  const features = project.features.length ? project.features : [
    { icon: "code", title: "Projeto completo", description: "Estrutura digital planejada para operação, evolução e resultado." },
    { icon: "chart", title: "Foco comercial", description: "Experiência desenhada para apresentação clara e conversão." }
  ];

  return `
    <article class="featured-system-card reveal" id="${safeId}" aria-labelledby="${titleId}">
      <div class="featured-system-card__content">
        <div class="featured-system-card__eyebrow">
          <span aria-hidden="true"></span>
          ${escapeProjectHtml(project.featuredLabel)}
        </div>

        <h2 id="${titleId}">${escapeProjectHtml(project.featuredTitle)}</h2>

        <p class="featured-system-card__description">
          ${escapeProjectHtml(project.featuredDescription)}
        </p>

        <div class="featured-system-card__chips" aria-label="Tecnologias e módulos do projeto ${escapeProjectHtml(project.featuredTitle)}">
          ${tags.slice(0, 6).map((tag) => `<span>${escapeProjectHtml(tag)}</span>`).join("")}
        </div>

        <div class="featured-system-card__actions">
          ${renderFeaturedCta(project.primaryCtaLabel, project.primaryCtaUrl, "featured-system-card__primary", project.openInNewTab)}
          ${renderFeaturedCta(project.secondaryCtaLabel, project.secondaryCtaUrl, "featured-system-card__secondary", project.openInNewTab)}
        </div>
      </div>

      <div class="featured-system-card__visual" aria-hidden="false">
        <div class="featured-system-card__browser">
          <div class="featured-system-card__bar" aria-hidden="true">
            <span></span><span></span><span></span>
            <small>${escapeProjectHtml(project.previewUrlLabel || extractPreviewLabel(project.primaryCtaUrl) || project.featuredSubtitle)}</small>
          </div>
          <img src="${escapeProjectHtml(project.featuredImage)}" alt="${escapeProjectHtml(project.featuredImageAlt)}" loading="lazy" />
        </div>
      </div>

      <div class="featured-system-card__features" aria-label="Principais módulos do projeto ${escapeProjectHtml(project.featuredTitle)}">
        ${features.map((feature) => `
          <div class="featured-system-card__feature">
            ${renderFeaturedIcon(feature.icon)}
            <strong>${escapeProjectHtml(feature.title)}</strong>
            <p>${escapeProjectHtml(feature.description)}</p>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderFeaturedProjects() {
  if (!featuredProjectsContainer) return;

  const featuredProjects = getFeaturedProjects();
  featuredProjectsContainer.hidden = featuredProjects.length === 0;
  featuredProjectsContainer.innerHTML = featuredProjects.map(renderFeaturedProjectCard).join("");

  featuredProjectsContainer.querySelectorAll(".reveal").forEach((card) => {
    card.classList.add("active");
  });
}

function renderProjects() {
  if (!projectsGrid) return;

  const visibleProjects = getVisibleProjects();
  const featuredProjects = getFeaturedProjects();
  projectsGrid.innerHTML = "";

  if (!allProjects.length) {
    renderFeaturedProjects();
    showProjectsState(
      "empty",
      "Nenhum projeto publicado",
      "Assim que novos projetos forem publicados no painel, eles aparecerão nesta página."
    );
    return;
  }

  if (!visibleProjects.length && !featuredProjects.length) {
    renderFeaturedProjects();
    showProjectsState(
      "empty",
      "Nenhum projeto encontrado",
      "Não há projetos publicados para a combinação de categoria e nicho selecionada."
    );
    return;
  }

  hideProjectsState();
  projectsGrid.innerHTML = visibleProjects.map(renderProjectCard).join("");
  renderFeaturedProjects();

  const cards = projectsGrid.querySelectorAll(".reveal");
  cards.forEach((card) => {
    card.classList.add("active");
  });
}

function setActiveFilters(nextFilters = {}, options = {}) {
  const { syncUrl = true } = options;

  activeFilters = {
    ...activeFilters,
    ...Object.fromEntries(
      Object.entries(nextFilters).map(([key, values]) => [key, normalizeSelectedValues(values)])
    )
  };

  updateFilterControlsState();
  if (syncUrl) syncFiltersToUrl();
  renderProjects();
}

function resetFilters() {
  setActiveFilters({ category: [], niche: [] });
}

function closeMultiSelect(multiselect) {
  if (!multiselect) return;

  const dropdown = getMultiselectDropdown(multiselect);
  const button = getMultiselectButton(multiselect);

  multiselect.classList.remove("is-open");
  if (dropdown) dropdown.hidden = true;
  if (button) button.setAttribute("aria-expanded", "false");
}

function closeAllMultiSelects(exceptMultiselect = null) {
  [projectCategoryFilter, projectNicheFilter].forEach((multiselect) => {
    if (multiselect && multiselect !== exceptMultiselect) closeMultiSelect(multiselect);
  });
}

function toggleMultiSelect(multiselect) {
  if (!multiselect || multiselect.classList.contains("is-disabled")) return;

  const isOpen = multiselect.classList.contains("is-open");
  const dropdown = getMultiselectDropdown(multiselect);
  const button = getMultiselectButton(multiselect);

  closeAllMultiSelects(multiselect);
  multiselect.classList.toggle("is-open", !isOpen);
  if (dropdown) dropdown.hidden = isOpen;
  if (button) button.setAttribute("aria-expanded", isOpen ? "false" : "true");
}

function getValuesFromMultiselect(multiselect) {
  return Array.from(multiselect?.querySelectorAll('input[type="checkbox"]:checked') || [])
    .map((checkbox) => checkbox.value);
}

function bindMultiSelect(multiselect, filterName) {
  if (!multiselect) return;

  const button = getMultiselectButton(multiselect);

  if (button) {
    button.addEventListener("click", () => toggleMultiSelect(multiselect));
  }

  multiselect.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    setActiveFilters({ [filterName]: getValuesFromMultiselect(multiselect) });
  });
}

async function loadProjectsPage() {
  if (!projectsGrid) return;

  if (!projectsApiConfig.baseUrl || projectsApiConfig.baseUrl.includes("SEU-PROJETO")) {
    showProjectsState(
      "config",
      "Configure a URL da API",
      "Informe a baseUrl no arquivo portfolio-api.config.js para carregar os projetos."
    );
    return;
  }

  showProjectsState("loading", "Carregando projetos", "Buscando os projetos, categorias e nichos publicados na API da Codexa...");

  try {
    const [projectsResult, categoriesResult, nichesResult] = await Promise.allSettled([
      PortfolioProjectsService.list(),
      PortfolioProjectsService.listCategories(),
      PortfolioProjectsService.listNiches()
    ]);

    if (projectsResult.status === "rejected") {
      throw projectsResult.reason;
    }

    allProjects = projectsResult.value.map(normalizeProject);
    allCategories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
    allNiches = nichesResult.status === "fulfilled" ? nichesResult.value : [];

    renderFilters();
    applyFiltersFromUrl();
    renderProjects();
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    showProjectsState(
      "error",
      "Não foi possível carregar os projetos",
      isAbort
        ? "A API demorou para responder. Verifique o deploy e tente novamente."
        : error?.message || "Verifique a URL da API, o CORS e a conexão com o MongoDB."
    );
  }
}

if (projectsFiltersForm) {
  projectsFiltersForm.addEventListener("submit", (event) => event.preventDefault());
}

bindMultiSelect(projectCategoryFilter, "category");
bindMultiSelect(projectNicheFilter, "niche");

if (projectClearFilters) {
  projectClearFilters.addEventListener("click", () => {
    closeAllMultiSelects();
    resetFilters();
  });
}

document.addEventListener("click", (event) => {
  const isInsideFilter = event.target.closest(".projects-multiselect");
  if (!isInsideFilter) closeAllMultiSelects();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllMultiSelects();
});

loadProjectsPage();
