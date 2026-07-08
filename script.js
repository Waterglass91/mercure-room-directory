
const state = {
  lang: localStorage.getItem("directoryLang") || "fr",
  category: "all",
  query: "",
  data: null
};

const UI = {
  fr: {
    callReception: "Appeler la réception",
    seeServices: "Voir les services",
    writeHotel: "Écrire à l'hôtel",
    openMap: "Ouvrir la carte",
    all: "Tout",
    open: "Ouvrir",
    noResult: "Aucun résultat pour cette recherche.",
    back: "Retour",
    discoverMore: "Découvrir",
    needHelp: "Besoin d'aide ?"
  },
  en: {
    callReception: "Call reception",
    seeServices: "View services",
    writeHotel: "Email the hotel",
    openMap: "Open map",
    all: "All",
    open: "Open",
    noResult: "No results for this search.",
    back: "Back",
    discoverMore: "Discover",
    needHelp: "Need help?"
  }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const ui = (key) => UI[state.lang][key] || key;
const txt = (obj, key) => obj?.[`${key}_${state.lang}`] ?? obj?.[`${key}_fr`] ?? "";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineFormat(value) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = false;

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${inlineFormat(line.slice(4))}</h3>`;
    } else if (line.startsWith("> ")) {
      closeList();
      html += `<div class="notice-box">${inlineFormat(line.slice(2))}</div>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>`;
    } else {
      closeList();
      html += `<p>${inlineFormat(line)}</p>`;
    }
  }

  closeList();
  return html;
}

async function loadContent() {
  const response = await fetch("./hotel.json", { cache: "no-store" });
  state.data = await response.json();
}

function applyBasics() {
  const data = state.data;
  const hotel = data.hotel || {};
  document.documentElement.lang = state.lang;
  $("#langBtn").textContent = state.lang === "fr" ? "EN" : "FR";
  $("#year").textContent = new Date().getFullYear();
  $("#footerHotelName").textContent = hotel.fullName || "Mercure Le Plessis-Robinson";

  $$("[data-ui]").forEach(el => el.textContent = ui(el.dataset.ui));
  $$('[data-action="phone"]').forEach(el => el.href = `tel:${hotel.phone || ""}`);
  $$('[data-action="email"]').forEach(el => el.href = `mailto:${hotel.email || ""}`);
  $$('[data-action="maps"]').forEach(el => el.href = hotel.mapsUrl || "#");

  $("#search").placeholder = state.lang === "fr" ? "Petit-déjeuner, parking, Wi‑Fi..." : "Breakfast, parking, Wi‑Fi...";

  $$("[data-content]").forEach(el => {
    const [group, key] = el.dataset.content.split(".");
    el.textContent = txt(data[group], key);
  });

  const img = $("#hotelHeroImage");
  const frame = $("#hotelPhotoFrame");
  const image = hotel.heroImage || "";
  if (image) {
    img.src = image;
    img.onload = () => frame.classList.add("has-image");
    img.onerror = () => frame.classList.remove("has-image");
  } else {
    img.removeAttribute("src");
    frame.classList.remove("has-image");
  }
}

function renderHeroQuickLinks() {
  const preferred = ["wifi", "breakfast", "parc-de-sceaux"];
  $("#heroQuickLinks").innerHTML = preferred.map(id => {
    const section = state.data.sections.find(s => s.id === id);
    if (!section) return "";
    return `<a class="mini-link" href="#service/${escapeHtml(section.id)}">${escapeHtml(txt(section, "title"))}</a>`;
  }).join("");
}

function renderQuickActions() {
  $("#quickActions").innerHTML = (state.data.quickActions || []).map(item => `
    <a class="quick-card" href="#service/${escapeHtml(item.id)}">
      <span class="emoji">${escapeHtml(item.icon)}</span>
      <strong>${escapeHtml(txt(item, "title"))}</strong>
      <small>${escapeHtml(txt(item, "text"))}</small>
    </a>
  `).join("");
}

function renderTabs() {
  const tabs = [{ id: "all", label_fr: ui("all"), label_en: ui("all") }, ...(state.data.categories || [])];
  $("#tabs").innerHTML = tabs.map(cat => `
    <button type="button" class="tab ${state.category === cat.id ? "active" : ""}" data-category="${escapeHtml(cat.id)}">
      ${escapeHtml(txt(cat, "label"))}
    </button>
  `).join("");
}

function matches(section) {
  const q = state.query.trim().toLowerCase();
  const categoryOk = state.category === "all" || section.category === state.category;
  if (!categoryOk) return false;
  if (!q) return true;
  const searchable = [txt(section, "title"), txt(section, "summary"), section.tags, txt(section, "body")].join(" ").toLowerCase();
  return searchable.includes(q);
}

function renderServices() {
  const items = (state.data.sections || []).filter(matches);
  $("#serviceGrid").innerHTML = items.length ? items.map(section => `
    <a class="service-card" href="#service/${escapeHtml(section.id)}">
      <div>
        <div class="icon">${escapeHtml(section.icon)}</div>
        <h3>${escapeHtml(txt(section, "title"))}</h3>
        <p>${escapeHtml(txt(section, "summary"))}</p>
      </div>
      <span class="open">${ui("open")} →</span>
    </a>
  `).join("") : `<div class="empty">${ui("noResult")}</div>`;
}

function renderLocalItems() {
  $("#localList").innerHTML = (state.data.localItems || []).map(item => `
    <div class="local-item">
      <strong>${escapeHtml(txt(item, "title"))}</strong>
      <span>${escapeHtml(txt(item, "text"))}</span>
    </div>
  `).join("");
}

function actionButton(type) {
  const hotel = state.data.hotel || {};
  if (type === "phone") return `<a class="btn btn-primary" href="tel:${escapeHtml(hotel.phone)}">${ui("callReception")}</a>`;
  if (type === "email") return `<a class="btn btn-light" href="mailto:${escapeHtml(hotel.email)}">${ui("writeHotel")}</a>`;
  if (type === "maps") return `<a class="btn btn-soft" href="${escapeHtml(hotel.mapsUrl)}" target="_blank" rel="noopener">${ui("openMap")}</a>`;
  return "";
}

function renderDetail(id) {
  const section = (state.data.sections || []).find(s => s.id === id);
  if (!section) return showHome("services");

  $("#viewHome").classList.add("hidden");
  $("#viewDetail").classList.add("active");
  $("#viewDetail").innerHTML = `
    <a class="btn btn-light back-btn" href="#services">← ${ui("back")}</a>
    <section class="detail-card">
      <article class="detail-content">
        <div class="detail-title-row">
          <div class="detail-icon">${escapeHtml(section.icon)}</div>
          <p class="eyebrow">Room Directory</p>
        </div>
        <h2>${escapeHtml(txt(section, "title"))}</h2>
        <p class="summary">${escapeHtml(txt(section, "summary"))}</p>
        <div class="content-block">${markdownToHtml(txt(section, "body"))}</div>
        <div class="actions">${(section.actions || []).map(actionButton).join("")}</div>
      </article>
      <aside class="side-card">
        <h3>${escapeHtml(state.data.hotel?.fullName || "Mercure Le Plessis-Robinson")}</h3>
        <p>${state.lang === "fr" ? "Notre équipe est disponible 24h/24 pour vous accompagner pendant votre séjour." : "Our team is available 24/7 to assist you during your stay."}</p>
        ${actionButton("phone")}
        ${actionButton("email")}
      </aside>
    </section>
  `;
  setActiveNav("services");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showHome(anchor) {
  $("#viewDetail").classList.remove("active");
  $("#viewHome").classList.remove("hidden");
  renderAll();
  const target = anchor ? document.getElementById(anchor) : document.getElementById("home");
  if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  setActiveNav(anchor || "home");
}

function setActiveNav(key) {
  $$(".mobile-nav a").forEach(a => a.classList.remove("active"));
  const map = key === "contact" ? "contact" : key === "local" ? "local" : key === "services" ? "services" : "home";
  document.querySelector(`.mobile-nav a[data-link="${map}"]`)?.classList.add("active");
}

function route() {
  const hash = location.hash.replace("#", "") || "home";
  if (hash.startsWith("service/")) return renderDetail(hash.split("/")[1]);
  showHome(hash);
}

function renderAll() {
  applyBasics();
  renderHeroQuickLinks();
  renderQuickActions();
  renderTabs();
  renderServices();
  renderLocalItems();
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-category]");
  if (tab) {
    state.category = tab.dataset.category;
    renderTabs();
    renderServices();
  }
});

$("#search").addEventListener("input", e => {
  state.query = e.target.value;
  renderServices();
});

$("#langBtn").addEventListener("click", () => {
  state.lang = state.lang === "fr" ? "en" : "fr";
  localStorage.setItem("directoryLang", state.lang);
  route();
});

window.addEventListener("hashchange", route);

loadContent().then(() => {
  renderAll();
  route();
}).catch(error => {
  document.body.innerHTML = "<p style='padding:24px;font-family:sans-serif'>Erreur de chargement du fichier content/hotel.json. Vérifiez que le site est ouvert via GitHub Pages ou un serveur local.</p>";
  console.error(error);
});
Fix hotel content path
// Correction affichage photo hôtel
(async function forceHotelHeroImage() {
  const img = document.querySelector("#hotelHeroImage");
  const frame = document.querySelector("#hotelPhotoFrame");

  if (!img || !frame) return;

  const style = document.createElement("style");
  style.textContent = `
    #hotelPhotoFrame.has-image .photo-placeholder {
      display: none !important;
    }
    #hotelHeroImage {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;
  document.head.appendChild(style);

  let image = "hotel-hero.png";

  try {
    const response = await fetch("./hotel.json?v=" + Date.now(), {
      cache: "no-store"
    });

    if (response.ok) {
      const data = await response.json();
      if (data.hotel && data.hotel.heroImage) {
        image = data.hotel.heroImage;
      }
    }
  } catch (error) {
    console.warn("Impossible de lire hotel.json, image par défaut utilisée.");
  }

  frame.classList.remove("has-image");

  img.onload = function () {
    frame.classList.add("has-image");
  };

  img.onerror = function () {
    frame.classList.remove("has-image");
    console.error("Image introuvable :", image);
  };

  img.src = image + "?v=" + Date.now();
})();
