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
    .filter((project) => matchesAnySelectedValue(project.category, activeFilters.category))
    .filter((project) => {
      if (!activeFilters.niche.length) return true;
      return project.niches.some((niche) => matchesAnySelectedValue(niche, activeFilters.niche));
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
