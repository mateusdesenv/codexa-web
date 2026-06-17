const projectsGrid = document.getElementById("projectsGrid");
const projectsState = document.getElementById("projectsState");
const projectsFiltersForm = document.getElementById("projectsFilters");
const projectCategoryFilter = document.getElementById("projectCategoryFilter");
const projectNicheFilter = document.getElementById("projectNicheFilter");
const projectClearFilters = document.getElementById("projectClearFilters");

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

let allProjects = [];
let allCategories = [];
let allNiches = [];
let activeFilters = {
  category: ALL_FILTER_VALUE,
  niche: ALL_FILTER_VALUE
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

function valuesMatch(currentValue, selectedValue) {
  if (!selectedValue) return true;
  return normalizeFilterValue(currentValue) === normalizeFilterValue(selectedValue);
}

function getUrlFilterValue(filterName) {
  if (!window.location?.search) return ALL_FILTER_VALUE;

  const params = new URLSearchParams(window.location.search);
  const keys = URL_FILTER_KEYS[filterName] || [];

  for (const key of keys) {
    const value = params.get(key);
    if (value) return value.trim();
  }

  return ALL_FILTER_VALUE;
}

function resolveFilterValueFromOptions(rawValue, availableValues = []) {
  const normalizedRawValue = normalizeFilterValue(rawValue);
  if (!normalizedRawValue) return ALL_FILTER_VALUE;

  return availableValues.find((value) => normalizeFilterValue(value) === normalizedRawValue) || ALL_FILTER_VALUE;
}

function applyFiltersFromUrl() {
  const categoryFromUrl = getUrlFilterValue("category");
  const nicheFromUrl = getUrlFilterValue("niche");

  activeFilters = {
    category: resolveFilterValueFromOptions(categoryFromUrl, allCategories),
    niche: resolveFilterValueFromOptions(nicheFromUrl, allNiches)
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

  if (activeFilters.category) {
    url.searchParams.set(URL_FILTER_CANONICAL_KEYS.category, activeFilters.category);
  }

  if (activeFilters.niche) {
    url.searchParams.set(URL_FILTER_CANONICAL_KEYS.niche, activeFilters.niche);
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

  return {
    id: item.id || item.slug || crypto.randomUUID(),
    title: item.title || "Projeto Codexa",
    category: item.category || "Sem categoria",
    niches,
    shortDescription: item.shortDescription || "Projeto desenvolvido pela Codexa com foco em presença digital e conversão.",
    projectUrl: item.projectUrl || "",
    desktopImageUrl: item.desktopImageUrl || item.mobileImageUrl || "../assets/prototipo-site-codexa.png",
    mobileImageUrl: item.mobileImageUrl || item.desktopImageUrl || "",
    altText: item.altText || `Projeto ${item.title || "Codexa"}`,
    order: Number(item.order || 0),
    status: item.status || "published"
  };
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

function renderSelectOptions(select, placeholder, values) {
  if (!select) return;

  select.innerHTML = [
    `<option value="${ALL_FILTER_VALUE}">${escapeProjectHtml(placeholder)}</option>`,
    ...values.map((value) => `<option value="${escapeProjectHtml(value)}">${escapeProjectHtml(value)}</option>`)
  ].join("");

  select.disabled = values.length === 0;
}

function renderFilters() {
  allCategories = extractTaxonomyNames(allCategories, getFallbackCategoriesFromProjects());
  allNiches = extractTaxonomyNames(allNiches, getFallbackNichesFromProjects());

  renderSelectOptions(projectCategoryFilter, "Todas as categorias", allCategories);
  renderSelectOptions(projectNicheFilter, "Todos os nichos", allNiches);
  updateFilterControlsState();
}

function updateFilterControlsState() {
  if (projectCategoryFilter) projectCategoryFilter.value = activeFilters.category;
  if (projectNicheFilter) projectNicheFilter.value = activeFilters.niche;

  const hasActiveFilter = Boolean(activeFilters.category || activeFilters.niche);
  if (projectClearFilters) projectClearFilters.disabled = !hasActiveFilter;
}

function getVisibleProjects() {
  return allProjects
    .filter((project) => project.status === "published")
    .filter((project) => valuesMatch(project.category, activeFilters.category))
    .filter((project) => {
      if (!activeFilters.niche) return true;
      return project.niches.some((niche) => valuesMatch(niche, activeFilters.niche));
    })
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
  const link = project.projectUrl
    ? `<a class="projects-card__link" href="${safeUrl}" target="_blank" rel="noopener">Ver projeto <span>→</span></a>`
    : `<span class="projects-card__link projects-card__link--disabled">Projeto em breve</span>`;

  return `
    <article class="projects-card reveal">
      <a class="projects-card__media" href="${safeUrl || "#"}" ${project.projectUrl ? 'target="_blank" rel="noopener"' : ""} aria-label="Abrir projeto ${escapeProjectHtml(project.title)}">
        <img src="${escapeProjectHtml(project.desktopImageUrl)}" alt="${escapeProjectHtml(project.altText)}" loading="lazy" />
      </a>
      <div class="projects-card__content">
        ${renderProjectTaxonomies(project)}
        <h3>${escapeProjectHtml(project.title)}</h3>
        <p>${escapeProjectHtml(project.shortDescription)}</p>
        ${link}
      </div>
    </article>
  `;
}

function renderProjects() {
  if (!projectsGrid) return;

  const visibleProjects = getVisibleProjects();
  projectsGrid.innerHTML = "";

  if (!allProjects.length) {
    showProjectsState(
      "empty",
      "Nenhum projeto publicado",
      "Assim que novos projetos forem publicados no painel, eles aparecerão nesta página."
    );
    return;
  }

  if (!visibleProjects.length) {
    showProjectsState(
      "empty",
      "Nenhum projeto encontrado",
      "Não há projetos publicados para a combinação de categoria e nicho selecionada."
    );
    return;
  }

  hideProjectsState();
  projectsGrid.innerHTML = visibleProjects.map(renderProjectCard).join("");

  const cards = projectsGrid.querySelectorAll(".reveal");
  cards.forEach((card) => {
    card.classList.add("active");
  });
}

function setActiveFilters(nextFilters = {}, options = {}) {
  const { syncUrl = true } = options;

  activeFilters = {
    ...activeFilters,
    ...nextFilters
  };

  updateFilterControlsState();
  if (syncUrl) syncFiltersToUrl();
  renderProjects();
}

function resetFilters() {
  setActiveFilters({ category: ALL_FILTER_VALUE, niche: ALL_FILTER_VALUE });
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

if (projectCategoryFilter) {
  projectCategoryFilter.addEventListener("change", (event) => {
    setActiveFilters({ category: event.target.value });
  });
}

if (projectNicheFilter) {
  projectNicheFilter.addEventListener("change", (event) => {
    setActiveFilters({ niche: event.target.value });
  });
}

if (projectClearFilters) {
  projectClearFilters.addEventListener("click", resetFilters);
}

loadProjectsPage();
