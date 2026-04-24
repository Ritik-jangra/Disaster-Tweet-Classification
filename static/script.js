/* ═══════════════════════════════════════════════════════════════
   DisasterAI — script.js
═══════════════════════════════════════════════════════════════ */

"use strict";

/* ── Smooth scroll for anchor links ────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", e => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
    window.scrollTo({ top: target.offsetTop - navH, behavior: "smooth" });
  });
});

/* ── Navbar: scroll class + active links ────────────────────── */
const navbar   = document.getElementById("navbar");
const sections = document.querySelectorAll("section[id], footer[id]");
const navLinks = document.querySelectorAll(".nav-link");

function onScroll() {
  /* sticky tint */
  navbar.classList.toggle("scrolled", window.scrollY > 20);

  /* active nav link */
  let current = "";
  sections.forEach(sec => {
    const top = sec.offsetTop - 100;
    if (window.scrollY >= top) current = sec.id;
  });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute("href") === `#${current}` ? "var(--text)" : "";
  });
}
window.addEventListener("scroll", onScroll, { passive: true });

/* ── Hamburger menu ─────────────────────────────────────────── */
const hamburger = document.getElementById("hamburger");
const mobileNav = document.getElementById("navLinks");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  mobileNav.classList.toggle("open");
});

/* close mobile nav on link click */
mobileNav.querySelectorAll(".nav-link").forEach(a => {
  a.addEventListener("click", () => {
    hamburger.classList.remove("open");
    mobileNav.classList.remove("open");
  });
});

/* ── Scroll-reveal (IntersectionObserver) ───────────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

/* ── Demo: character counter ────────────────────────────────── */
const tweetInput = document.getElementById("tweetInput");
const charCount  = document.getElementById("charCount");

tweetInput.addEventListener("input", () => {
  const len = tweetInput.value.length;
  charCount.textContent  = len;
  charCount.style.color  = len > 260 ? "var(--red)" : len > 200 ? "var(--yellow)" : "";
});

/* ── Demo: sample chip clicks ────────────────────────────────── */
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    tweetInput.value     = chip.dataset.tweet;
    charCount.textContent = chip.dataset.tweet.length;

    /* visual feedback */
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active-chip"));
    chip.classList.add("active-chip");

    /* hide previous result */
    hideResult();
    tweetInput.focus();
  });
});

/* ── Prediction ─────────────────────────────────────────────── */
const predictBtn  = document.getElementById("predictBtn");
const btnLabel    = document.getElementById("btnLabel");
const btnSpinner  = document.getElementById("btnSpinner");
const resultWrap  = document.getElementById("resultWrap");
const resultCard  = document.getElementById("resultCard");
const resultIcon  = document.getElementById("resultIcon");
const resultLabel = document.getElementById("resultLabel");
const confVal     = document.getElementById("confVal");
const confBar     = document.getElementById("confBar");
const cleanedText = document.getElementById("cleanedText");
const statusBadge = document.getElementById("statusBadge");

function setBusy(busy) {
  predictBtn.disabled = busy;
  btnLabel.classList.toggle("hidden", busy);
  btnSpinner.classList.toggle("hidden", !busy);
  if (busy) {
    statusBadge.textContent  = "PROCESSING";
    statusBadge.className    = "topbar-status busy";
  }
}

function hideResult() {
  resultWrap.classList.add("hidden");
}

function showResult({ prediction, confidence, cleaned, label }) {
  const isDisaster = prediction === 1;

  /* card class */
  resultCard.className = `result-card ${isDisaster ? "disaster" : "safe"}`;

  /* icon + label */
  resultIcon.textContent  = isDisaster ? "🔴" : "🔵";
  resultLabel.textContent = label;
  resultLabel.className   = `result-label ${isDisaster ? "red" : "blue"}`;

  /* confidence */
  confVal.textContent = `${confidence}%`;
  confBar.className   = `conf-bar-fill ${isDisaster ? "red" : "blue"}`;
  confBar.style.width = "0%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { confBar.style.width = `${confidence}%`; });
  });

  /* cleaned text */
  cleanedText.textContent = cleaned || "(empty after cleaning)";

  /* status badge */
  statusBadge.textContent = isDisaster ? "⚠ DISASTER" : "✓ SAFE";
  statusBadge.className   = `topbar-status ${isDisaster ? "done-disaster" : "done-safe"}`;

  /* show */
  resultWrap.classList.remove("hidden");

  /* scroll into view on mobile */
  if (window.innerWidth < 768) {
    setTimeout(() => resultWrap.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }
}

function showError(msg) {
  resultCard.className   = "result-card safe";
  resultIcon.textContent = "⚠️";
  resultLabel.textContent = "Error";
  resultLabel.className   = "result-label";
  confVal.textContent    = "";
  confBar.style.width    = "0%";
  cleanedText.textContent = msg;
  resultWrap.classList.remove("hidden");
  statusBadge.textContent = "ERROR";
  statusBadge.className   = "topbar-status busy";
}

predictBtn.addEventListener("click", async () => {
  const text = tweetInput.value.trim();
  if (!text) {
    tweetInput.focus();
    tweetInput.style.borderColor = "var(--red)";
    setTimeout(() => { tweetInput.style.borderColor = ""; }, 1200);
    return;
  }

  setBusy(true);
  hideResult();

  try {
    const res  = await fetch("/predict", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text })
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();

    if (data.error) {
      showError(data.error);
    } else {
      showResult(data);
    }
  } catch (err) {
    showError(`Request failed: ${err.message}`);
  } finally {
    setBusy(false);
  }
});

/* also trigger on Ctrl+Enter / Cmd+Enter in textarea */
tweetInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) predictBtn.click();
});

/* ── Animate hero stats on load ─────────────────────────────── */
function animateCounters() {
  document.querySelectorAll(".stat-num").forEach(el => {
    const rawText = el.textContent.trim();
    const numMatch = rawText.match(/[\d.]+/);
    if (!numMatch) return;
    const target   = parseFloat(numMatch[0]);
    const suffix   = rawText.replace(numMatch[0], "");
    const decimals = (numMatch[0].includes(".")) ? 1 : 0;
    const duration = 1200;
    const start    = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const val      = (target * eased).toFixed(decimals);
      el.innerHTML   = val + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* run after hero is visible */
const heroObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    animateCounters();
    heroObserver.disconnect();
  }
}, { threshold: 0.3 });
const heroStats = document.querySelector(".hero-stats");
if (heroStats) heroObserver.observe(heroStats);

/* ── Parallax glow on hero ──────────────────────────────────── */
const heroGlow = document.querySelector(".hero-glow");
if (heroGlow && window.innerWidth > 768) {
  document.addEventListener("mousemove", e => {
    const x = (e.clientX / window.innerWidth  - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    heroGlow.style.transform = `translate(${x}px, ${y}px)`;
  });
}