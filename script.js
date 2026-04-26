const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".nav");

menuButton?.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
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

  const SPEED = 1.5; // 👈 50% mais rápido

  const rect = portfolioSection.getBoundingClientRect();
  const scrollable = portfolioSection.offsetHeight - window.innerHeight;
  // const progress = clamp(-rect.top / scrollable, 0, 1);
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

    const y = distance * 82;
    const z = -abs * 150;
    const rotateX = -9 + distance * -1.25;
    const rotateZ = distance * 5.25;
    const scale = Math.max(1.20, 1 - abs * 0.045);
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
