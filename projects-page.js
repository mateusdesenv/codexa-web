const projectsGrid = document.getElementById("projectsGrid");
const projectsState = document.getElementById("projectsState");
const projectFilterButtons = document.querySelectorAll("[data-project-filter]");

const PROJECT_FILTERS = {
  all: "Todos"
};

  const configuredPortfolioApi = window.CODEXA_PORTFOLIO_API || {};
  const projectsApiConfig = {
    baseUrl: "https://SEU-PROJETO.vercel.app",
    publicPath: "/api/v1/portfolio-items",
    status: "published",
    timeout: 15000,
    ...configuredPortfolioApi,
    limit: 100
  };

let allProjects = [];
let activeProjectFilter = PROJECT_FILTERS.all;

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

function buildProjectsApiUrl() {
  const baseUrl = normalizeProjectBaseUrl(projectsApiConfig.baseUrl);
  const path = projectsApiConfig.publicPath || "/api/v1/portfolio-items";
  const url = new URL(`${baseUrl}${path}`);

  url.searchParams.set("status", projectsApiConfig.status || "published");
  url.searchParams.set("limit", String(projectsApiConfig.limit || 100));

  return url.toString();
}

function requestProjectsWithTimeout(request, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  return request(controller.signal).finally(() => window.clearTimeout(timeout));
}

const PortfolioProjectsService = {
  async list() {
    const response = await requestProjectsWithTimeout(
      (signal) => fetch(buildProjectsApiUrl(), { signal }),
      projectsApiConfig.timeout
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = result?.error?.message || `A API retornou status ${response.status}.`;
      throw new Error(message);
    }

    return Array.isArray(result?.data) ? result.data : [];
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

function normalizeProject(item) {
  return {
    id: item.id || item.slug || crypto.randomUUID(),
    title: item.title || "Projeto Codexa",
    category: item.category || "Sem categoria",
    shortDescription: item.shortDescription || "Projeto desenvolvido pela Codexa com foco em presença digital e conversão.",
    projectUrl: item.projectUrl || "",
    desktopImageUrl: item.desktopImageUrl || item.mobileImageUrl || "../assets/prototipo-site-codexa.png",
    mobileImageUrl: item.mobileImageUrl || item.desktopImageUrl || "",
    altText: item.altText || `Projeto ${item.title || "Codexa"}`,
    order: Number(item.order || 0),
    status: item.status || "published"
  };
}

function getVisibleProjects() {
  const normalized = allProjects
    .filter((project) => project.status === "published")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (activeProjectFilter === PROJECT_FILTERS.all) return normalized;

  return normalized.filter((project) => project.category === activeProjectFilter);
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
        <span>${escapeProjectHtml(project.category)}</span>
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
      "Nenhum projeto nesta categoria",
      "Escolha outro filtro ou volte para Todos para ver os projetos publicados."
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

function setActiveFilter(filter) {
  activeProjectFilter = filter;
  projectFilterButtons.forEach((button) => {
    const isActive = button.dataset.projectFilter === filter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderProjects();
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

  showProjectsState("loading", "Carregando projetos", "Buscando os projetos publicados na API da Codexa...");

  try {
    const projects = await PortfolioProjectsService.list();
    allProjects = projects.map(normalizeProject);
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

projectFilterButtons.forEach((button) => {
  button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.projectFilter || PROJECT_FILTERS.all);
  });
});

loadProjectsPage();
