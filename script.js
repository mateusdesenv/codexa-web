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

/* Portfolio stack acompanhado pelo scroll — estilo do exemplo enviado */
const portfolioSection = document.querySelector(".portfolio-cases");
const projectWindows = Array.from(document.querySelectorAll(".project-window"));
const portfolioCurrent = document.getElementById("portfolioCurrent");
const portfolioTotal = document.getElementById("portfolioTotal");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

  if (portfolioCurrent) {
    portfolioCurrent.textContent = String(activeIndex + 1).padStart(2, "0");
  }

  if (portfolioTotal) {
    portfolioTotal.textContent = String(projectWindows.length).padStart(2, "0");
  }

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
    updatePortfolioStack();
    portfolioTicking = false;
  });
}

window.addEventListener("scroll", requestPortfolioUpdate, { passive: true });
window.addEventListener("resize", requestPortfolioUpdate);
updatePortfolioStack();

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

