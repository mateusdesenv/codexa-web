const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".nav");

function setMenuState(isOpen) {
  if (!menuButton || !nav) return;

  nav.classList.toggle("open", isOpen);
  menuButton.classList.toggle("active", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

menuButton?.setAttribute("aria-expanded", "false");

menuButton?.addEventListener("click", () => {
  setMenuState(!nav?.classList.contains("open"));
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => setMenuState(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuState(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) setMenuState(false);
});

const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12
});

reveals.forEach((item) => observer.observe(item));

/* Portfolio dinâmico via API — usa GET /api/v1/portfolio-items */
const portfolioSection = document.querySelector(".portfolio-cases");
const portfolioStage = document.getElementById("portfolioProjects") || document.querySelector(".portfolio-stage");
let projectWindows = [];
const portfolioCurrent = document.getElementById("portfolioCurrent");
const portfolioTotal = document.getElementById("portfolioTotal");
const portfolioCaseLabel = document.getElementById("portfolioCaseLabel");

const defaultPortfolioApiConfig = {
  baseUrl: "https://SEU-PROJETO.vercel.app",
  publicPath: "/api/v1/portfolio-items",
  status: "published",
  featuredOnly: false,
  limit: 50,
  timeout: 15000
};

const portfolioApiConfig = {
  ...defaultPortfolioApiConfig,
  ...(window.CODEXA_PORTFOLIO_API || {})
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeBaseUrl(url = "") {
  return String(url).replace(/\/+$/, "");
}

function buildPortfolioApiUrl() {
  const baseUrl = normalizeBaseUrl(portfolioApiConfig.baseUrl);
  const path = portfolioApiConfig.publicPath || "/api/v1/portfolio-items";
  const url = new URL(`${baseUrl}${path}`);

  if (portfolioApiConfig.status) {
    url.searchParams.set("status", portfolioApiConfig.status);
  }

  if (portfolioApiConfig.featuredOnly) {
    url.searchParams.set("featured", "true");
  }

  if (portfolioApiConfig.limit) {
    url.searchParams.set("limit", String(portfolioApiConfig.limit));
  }

  return url.toString();
}

function withTimeout(promise, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    run: promise(controller.signal).finally(() => window.clearTimeout(timeout))
  };
}

function renderPortfolioState(type, title, description) {
  if (!portfolioStage) return;

  portfolioStage.innerHTML = `
    <div class="portfolio-state portfolio-state--${escapeHtml(type)}">
      <span class="portfolio-state-orb"></span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;

  projectWindows = [];
  updatePortfolioCounters(0, 0);
}

function updatePortfolioCounters(currentIndex = 0, total = projectWindows.length) {
  if (portfolioCurrent) {
    portfolioCurrent.textContent = total ? String(currentIndex + 1).padStart(2, "0") : "00";
  }

  if (portfolioTotal) {
    portfolioTotal.textContent = String(total).padStart(2, "0");
  }

  if (portfolioCaseLabel) {
    portfolioCaseLabel.textContent = `${total} ${total === 1 ? "case" : "cases"}`;
  }
}

function syncPortfolioHeight() {
  if (!portfolioSection) return;

  const total = Math.max(projectWindows.length, 1);
  const isMobilePortfolio = window.innerWidth <= 768;
  const height = isMobilePortfolio
    ? Math.max(350, 150 + total * 50)
    : Math.max(170, 95 + total * 18);

  portfolioSection.style.height = `${height}vh`;
}

function createPortfolioCard(item, index) {
  const number = String(index + 1).padStart(2, "0");
  const title = item.title || "Projeto Codexa";
  const description = item.shortDescription || "Projeto desenvolvido pela Codexa.";
  const projectUrl = item.projectUrl || "#";
  const desktopImage = item.desktopImageUrl || item.mobileImageUrl || "assets/prototipo-site-codexa.png";
  const mobileImage = item.mobileImageUrl || item.desktopImageUrl || desktopImage;
  const altText = item.altText || `Projeto ${title}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeProjectUrl = escapeHtml(projectUrl);
  const safeDesktopImage = escapeHtml(desktopImage);
  const safeMobileImage = escapeHtml(mobileImage);
  const safeAltText = escapeHtml(altText);

  const article = document.createElement("article");
  article.className = `project-window project-window-${index + 1}`;
  article.dataset.projectId = item.id || item.slug || String(index + 1);

  article.innerHTML = `
    <div class="window-bar">
      <div class="window-dots"><span></span><span></span><span></span></div>
      <p>${safeTitle}</p>
      <a href="${safeProjectUrl}" target="_blank" rel="noopener">Abrir ↗</a>
    </div>
    <div class="project-screen">
      <picture>
        <source media="(max-width: 768px)" srcset="${safeMobileImage}" />
        <img src="${safeDesktopImage}" alt="${safeAltText}" loading="lazy" />
      </picture>
    </div>
    <div class="mobile-project-info">
      <span class="mobile-project-number">${number}</span>
      <div class="mobile-project-copy">
        <strong>${safeTitle}</strong>
        <p>${safeDescription}</p>
      </div>
      <a href="${safeProjectUrl}" target="_blank" rel="noopener">Ver projeto <span>↗</span></a>
    </div>
  `;

  return article;
}

function renderPortfolioItems(items = []) {
  if (!portfolioStage) return;

  const sortedItems = [...items]
    .filter((item) => item && item.status === "published")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (!sortedItems.length) {
    renderPortfolioState(
      "empty",
      "Nenhum projeto publicado",
      "Cadastre e publique projetos no painel administrativo para que eles apareçam aqui."
    );
    syncPortfolioHeight();
    return;
  }

  portfolioStage.innerHTML = "";
  sortedItems.forEach((item, index) => portfolioStage.appendChild(createPortfolioCard(item, index)));
  projectWindows = Array.from(portfolioStage.querySelectorAll(".project-window"));
  updatePortfolioCounters(0, projectWindows.length);
  syncPortfolioHeight();
  updatePortfolioStack();
}

async function loadPortfolioFromApi() {
  if (!portfolioStage) return;

  if (!portfolioApiConfig.baseUrl || portfolioApiConfig.baseUrl.includes("SEU-PROJETO")) {
    renderPortfolioState(
      "config",
      "Configure a URL da API",
      "Edite o arquivo portfolio-api.config.js e informe a URL do deploy da API de portfólio."
    );
    syncPortfolioHeight();
    return;
  }

  renderPortfolioState("loading", "Carregando portfólio", "Buscando os projetos publicados na API da Codexa...");

  try {
    const request = withTimeout((signal) => fetch(buildPortfolioApiUrl(), { signal }), portfolioApiConfig.timeout);
    const response = await request.run;
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = result?.error?.message || `A API retornou status ${response.status}.`;
      throw new Error(message);
    }

    renderPortfolioItems(Array.isArray(result?.data) ? result.data : []);
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    renderPortfolioState(
      "error",
      "Não foi possível carregar o portfólio",
      isAbort
        ? "A API demorou para responder. Verifique o deploy e tente novamente."
        : error?.message || "Verifique a URL da API, o CORS e se o MongoDB está conectado."
    );
    syncPortfolioHeight();
  }
}

function updatePortfolioStack() {
  if (!portfolioSection || !projectWindows.length) return;

  const isMobilePortfolio = window.innerWidth <= 768;
  const SPEED = isMobilePortfolio ? 1 : 1;

  const rect = portfolioSection.getBoundingClientRect();
  const scrollable = Math.max(portfolioSection.offsetHeight - window.innerHeight, 1);
  const progress = clamp((-rect.top / scrollable) * SPEED, 0, 1);
  const activeFloat = progress * (projectWindows.length - 1);
  const activeIndex = Math.round(activeFloat);

  updatePortfolioCounters(activeIndex, projectWindows.length);

  projectWindows.forEach((card, index) => {
    const distance = index - activeFloat;
    const abs = Math.abs(distance);
    const isActive = activeIndex === index;

    card.classList.toggle("is-active", isActive);

    if (isMobilePortfolio) {
      const y = distance * 184;
      const z = -abs * 80;
      const rotateY = distance * -10;
      const rotateZ = distance * 2.4;
      const scale = Math.max(0.82, 1 - abs * 0.12);
      const opacity = clamp(1 - abs * 0.42, 0.08, 1);
      const brightness = clamp(1 - abs * 0.2, 0.68, 1);
      const blur = Math.min(abs * 1, 2);

      card.style.transform = `translate(-50%, -50%) translateY(${y}px) translateZ(${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.filter = `blur(${blur}px) brightness(${brightness})`;
      card.style.zIndex = String(100 - Math.round(abs * 12));
      return;
    }

    const y = distance * 82;
    const z = -abs * 150;
    const rotateX = -9 + distance * -1.25;
    const rotateZ = distance * 5.25;
    const scale = Math.max(1.0, 1 - abs * 0.045);
    const opacity = clamp(1 - abs * 0.16, 0.18, 1);
    const brightness = (clamp(1 - abs * 0.18, 0.42, 1)) + 0.8;
    const blur = Math.min(abs * 0.35, 1.6);

    card.style.transform = `translate(-50%, -50%) translateY(${y}px) translateZ(${z}px) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
    card.style.opacity = opacity;
    card.style.filter = `blur(${blur}px) brightness(${brightness})`;
    card.style.zIndex = String(100 - Math.round(abs * 10));
  });
}

let portfolioTicking = false;
function requestPortfolioUpdate() {
  if (portfolioTicking) return;
  portfolioTicking = true;

  requestAnimationFrame(() => {
    syncPortfolioHeight();
    updatePortfolioStack();
    portfolioTicking = false;
  });
}

window.addEventListener("scroll", requestPortfolioUpdate, { passive: true });
window.addEventListener("resize", requestPortfolioUpdate);
loadPortfolioFromApi();

/* Animações premium v2 — microinterações seguras */
document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

window.addEventListener("load", () => {
  requestAnimationFrame(() => document.body.classList.add("site-loaded"));
});

function initScrollProgress() {
  if (document.querySelector(".scroll-progress")) return;

  const progress = document.createElement("span");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  function updateProgress() {
    const scrollHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const amount = window.scrollY / scrollHeight;
    progress.style.transform = `scaleX(${clamp(amount, 0, 1)})`;
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();
}

function initCursorGlow() {
  if (prefersReducedMotion.matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (document.querySelector(".premium-cursor-glow")) return;

  const glow = document.createElement("span");
  glow.className = "premium-cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let isRunning = true;

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    isRunning = !document.hidden;
    if (isRunning) renderGlow();
  });

  function renderGlow() {
    if (!isRunning) return;
    currentX += (targetX - currentX) * 0.085;
    currentY += (targetY - currentY) * 0.085;
    glow.style.transform = `translate3d(${currentX - 210}px, ${currentY - 210}px, 0)`;
    requestAnimationFrame(renderGlow);
  }

  renderGlow();
}

function initPremiumTilt() {
  if (prefersReducedMotion.matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const tiltItems = document.querySelectorAll(".service, .about-v2-window, .about-v2-stats article, .final-cta");

  tiltItems.forEach((item) => {
    item.classList.add("premium-tilt");

    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 6;
      const rotateX = -((y / rect.height) - 0.5) * 6;

      item.classList.add("is-tilting");
      item.style.setProperty("--tilt-rx", `${rotateX.toFixed(2)}deg`);
      item.style.setProperty("--tilt-ry", `${rotateY.toFixed(2)}deg`);
      item.style.setProperty("--glow-x", `${((x / rect.width) * 100).toFixed(1)}%`);
      item.style.setProperty("--glow-y", `${((y / rect.height) * 100).toFixed(1)}%`);
    });

    item.addEventListener("pointerleave", () => {
      item.classList.remove("is-tilting");
      item.style.setProperty("--tilt-rx", "0deg");
      item.style.setProperty("--tilt-ry", "0deg");
      item.style.setProperty("--glow-x", "50%");
      item.style.setProperty("--glow-y", "50%");
    });
  });
}

initScrollProgress();
initCursorGlow();
initPremiumTilt();

