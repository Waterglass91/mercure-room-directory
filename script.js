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
    barMenu: "Voir la carte du bar",
    all: "Tout",
    open: "Ouvrir",
    noResult: "Aucun résultat pour cette recherche.",
    back: "Retour",
    discoverMore: "Découvrir",
    needHelp: "Besoin d'aide ?",
    barTitle: "Bar & boissons"
  },
  en: {
    callReception: "Call reception",
    seeServices: "View services",
    writeHotel: "Email the hotel",
    openMap: "Open map",
    barMenu: "View bar menu",
    all: "All",
    open: "Open",
    noResult: "No results for this search.",
    back: "Back",
    discoverMore: "Discover",
    needHelp: "Need help?",
    barTitle: "Bar & drinks"
  }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ui = (key) => UI[state.lang]?.[key] || key;

const txt = (obj, key) => {
  return obj?.[`${key}_${state.lang}`] ?? obj?.[`${key}_fr`] ?? "";
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function inlineFormat(value) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

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
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      html += `<div class="notice-box">${inlineFormat(line.slice(2))}</div>`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      html += `<li>${inlineFormat(line.slice(2))}</li>`;
      continue;
    }

    closeList();
    html += `<p>${inlineFormat(line)}</p>`;
  }

  closeList();
  return html;
}


/* =========================================================
   CHARGEMENT DES DONNÉES
   ========================================================= */

async function loadContent() {
  const response = await fetch("./hotel.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Impossible de charger hotel.json. Statut HTTP : ${response.status}`
    );
  }

  state.data = await response.json();
}


/* =========================================================
   CONTENU GÉNÉRAL
   ========================================================= */

function applyBasics() {
  const data = state.data;
  const hotel = data?.hotel || {};

  document.documentElement.lang = state.lang;

  const langBtn = $("#langBtn");

  if (langBtn) {
    langBtn.textContent = state.lang === "fr" ? "EN" : "FR";
  }

  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const footerHotelName = $("#footerHotelName");

  if (footerHotelName) {
    footerHotelName.textContent =
      hotel.fullName || "Mercure Le Plessis-Robinson";
  }

  $$("[data-ui]").forEach((el) => {
    el.textContent = ui(el.dataset.ui);
  });

  $$("[data-ui-fr][data-ui-en]").forEach((el) => {
    const key = state.lang === "fr" ? "uiFr" : "uiEn";
    el.textContent = el.dataset[key] || el.textContent;
  });

  $$('[data-action="phone"]').forEach((el) => {
    el.href = hotel.phone ? `tel:${hotel.phone}` : "#";
  });

  $$('[data-action="email"]').forEach((el) => {
    el.href = hotel.email ? `mailto:${hotel.email}` : "#";
  });

  $$('[data-action="maps"]').forEach((el) => {
    el.href = hotel.mapsUrl || "#";
  });

  const search = $("#search");

  if (search) {
    search.placeholder =
      state.lang === "fr"
        ? "Petit-déjeuner, parking, Wi-Fi..."
        : "Breakfast, parking, Wi-Fi...";
  }

  $$("[data-content]").forEach((el) => {
    const [group, key] = el.dataset.content.split(".");
    el.textContent = txt(data?.[group], key);
  });

  const img = $("#hotelHeroImage");
  const frame = $("#hotelPhotoFrame");
  const image = hotel.heroImage || "";

  if (img && frame) {
    if (image) {
      img.src = image;

      img.onload = () => {
        frame.classList.add("has-image");
      };

      img.onerror = () => {
        frame.classList.remove("has-image");
      };
    } else {
      img.removeAttribute("src");
      frame.classList.remove("has-image");
    }
  }

  updateBarMenuLanguage();
}


/* =========================================================
   LIENS RAPIDES
   ========================================================= */

function renderHeroQuickLinks() {
  const container = $("#heroQuickLinks");

  if (!container || !state.data) return;

  const preferred = [
    "wifi",
    "breakfast",
    "discover-local"
  ];

  container.innerHTML = preferred
    .map((id) => {
      const section = (state.data.sections || [])
        .find((item) => item.id === id);

      if (!section) return "";

      return `
        <button
          type="button"
          class="mini-link"
          data-service-id="${escapeAttribute(section.id)}"
        >
          ${escapeHtml(txt(section, "title"))}
        </button>
      `;
    })
    .join("");
}


/* =========================================================
   CATÉGORIES
   ========================================================= */

function renderTabs() {
  const container = $("#tabs");

  if (!container || !state.data) return;

  const tabs = [
    {
      id: "all",
      label_fr: UI.fr.all,
      label_en: UI.en.all
    },
    ...(state.data.categories || [])
  ];

  container.innerHTML = tabs
    .map(
      (cat) => `
        <button
          type="button"
          class="tab ${state.category === cat.id ? "active" : ""}"
          data-category="${escapeAttribute(cat.id)}"
        >
          ${escapeHtml(txt(cat, "label"))}
        </button>
      `
    )
    .join("");
}


/* =========================================================
   RECHERCHE
   ========================================================= */

function matches(section) {
  const query = state.query
    .trim()
    .toLowerCase();

  const categoryOk =
    state.category === "all" ||
    section.category === state.category;

  if (!categoryOk) return false;

  if (!query) return true;

  const searchable = [
    txt(section, "title"),
    txt(section, "summary"),
    section.tags || "",
    txt(section, "body")
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}


/* =========================================================
   SERVICES
   ========================================================= */

function renderServices() {
  const container = $("#serviceGrid");

  if (!container || !state.data) return;

  const items = (state.data.sections || [])
    .filter(matches);

  container.innerHTML = items.length
    ? items
        .map(
          (section) => `
            <a
              class="service-card"
              href="#"
              data-service-id="${escapeAttribute(section.id)}"
              aria-haspopup="dialog"
            >

              <div>

                <h3>
                  ${escapeHtml(txt(section, "title"))}
                </h3>

                <p>
                  ${escapeHtml(txt(section, "summary"))}
                </p>

              </div>

              <span class="open">
                ${escapeHtml(ui("open"))} →
              </span>

            </a>
          `
        )
        .join("")
    : `
      <div class="empty">
        ${escapeHtml(ui("noResult"))}
      </div>
    `;
}


/* =========================================================
   GUIDE LOCAL
   ========================================================= */

function renderLocalItems() {
  const localList = $("#localList");

  if (!localList || !state.data) return;

  const items = state.data.localItems || [];

  localList.innerHTML = items
    .map((item) => {

      const title = txt(item, "title");
      const text = txt(item, "text");
      const alt = txt(item, "alt") || title;

      const imageHtml = item.image
        ? `
          <div class="local-list-thumbnail">

            <img
              src="${escapeAttribute(item.image)}"
              alt="${escapeAttribute(alt)}"
              loading="lazy"
            >

          </div>
        `
        : `
          <div
            class="local-list-thumbnail local-list-thumbnail-empty"
            aria-hidden="true"
          ></div>
        `;

      const cardContent = `
        ${imageHtml}

        <div class="local-list-content">

          <h3>
            ${escapeHtml(title)}
          </h3>

          <p>
            ${escapeHtml(text)}
          </p>

        </div>
      `;

      if (item.url) {
        return `
          <a
            class="local-list-item local-list-link"
            href="${escapeAttribute(item.url)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${escapeAttribute(title)}"
          >

            ${cardContent}

          </a>
        `;
      }

      return `
        <article class="local-list-item">

          ${cardContent}

        </article>
      `;
    })
    .join("");
}


/* =========================================================
   BOUTONS D'ACTION DES SERVICES
   ========================================================= */

function actionButton(type) {
  const hotel = state.data?.hotel || {};

  if (type === "phone") {
    return `
      <a
        class="btn btn-primary"
        href="tel:${escapeAttribute(hotel.phone || "")}"
      >
        ${escapeHtml(ui("callReception"))}
      </a>
    `;
  }

  if (type === "email") {
    return `
      <a
        class="btn btn-light"
        href="mailto:${escapeAttribute(hotel.email || "")}"
      >
        ${escapeHtml(ui("writeHotel"))}
      </a>
    `;
  }

  if (type === "maps") {
    return `
      <a
        class="btn btn-soft"
        href="${escapeAttribute(hotel.mapsUrl || "#")}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(ui("openMap"))}
      </a>
    `;
  }

  if (type === "bar-menu") {
    return `
      <button
        type="button"
        class="btn btn-primary"
        data-open-bar-menu
      >
        ${escapeHtml(ui("barMenu"))}
      </button>
    `;
  }

  return "";
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setActiveNav(key) {
  $$(".mobile-nav a")
    .forEach((a) => {
      a.classList.remove("active");
    });

  const map =
    key === "contact"
      ? "contact"
      : key === "local"
        ? "local"
        : key === "services"
          ? "services"
          : "home";

  if (map === "contact") {
    $('.mobile-nav a[href="#contact"]')
      ?.classList
      .add("active");

    return;
  }

  $(`.mobile-nav a[data-link="${map}"]`)
    ?.classList
    .add("active");
}


function showHome(anchor) {
  const viewDetail = $("#viewDetail");
  const viewHome = $("#viewHome");

  if (viewDetail) {
    viewDetail.classList.remove("active");
  }

  if (viewHome) {
    viewHome.classList.remove("hidden");
  }

  renderAll();

  const target = anchor
    ? document.getElementById(anchor)
    : document.getElementById("home");

  if (target) {
    setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 0);
  }

  setActiveNav(anchor || "home");
}


function route() {
  const hash =
    location.hash.replace("#", "") ||
    "home";

  if (hash.startsWith("service/")) {

    const id = decodeURIComponent(
      hash.split("/")[1] || ""
    );

    history.replaceState(
      null,
      "",
      "#services"
    );

    openServiceModal(id);

    return;
  }

  showHome(hash);
}


function renderAll() {
  applyBasics();
  renderHeroQuickLinks();
  renderTabs();
  renderServices();
  renderLocalItems();
}


/* =========================================================
   POP-UP SERVICES
   ========================================================= */

function ensureServiceModal() {
  let modal = $("#serviceModal");

  if (modal) return modal;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="service-modal"
        id="serviceModal"
        aria-hidden="true"
      >

        <div
          class="service-modal-backdrop"
          data-modal-close
        ></div>

        <article
          class="service-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="serviceModalTitle"
        >

          <button
            class="service-modal-close"
            type="button"
            data-modal-close
            aria-label="Fermer"
          >
            ×
          </button>

          <div class="service-modal-head">

            <div
              class="service-modal-icon"
              id="serviceModalIcon"
            ></div>

            <h2
              class="service-modal-title"
              id="serviceModalTitle"
            ></h2>

          </div>

          <p
            class="service-modal-summary"
            id="serviceModalSummary"
          ></p>

          <div
            class="service-modal-content"
            id="serviceModalContent"
          ></div>

          <div
            class="service-modal-actions"
            id="serviceModalActions"
          ></div>

        </article>

      </div>
    `
  );

  modal = $("#serviceModal");

  modal
    ?.querySelectorAll("[data-modal-close]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        closeServiceModal
      );

    });

  return modal;
}


function openServiceModal(id) {
  if (!state.data?.sections) return;

  const section =
    state.data.sections.find(
      (item) => item.id === id
    );

  if (!section) return;

  const modal = ensureServiceModal();

  if (!modal) return;

  const icon =
    $("#serviceModalIcon", modal);

  const title =
    $("#serviceModalTitle", modal);

  const summary =
    $("#serviceModalSummary", modal);

  const content =
    $("#serviceModalContent", modal);

  const actions =
    $("#serviceModalActions", modal);

  if (icon) {
    icon.textContent =
      section.icon || "";
  }

  if (title) {
    title.textContent =
      txt(section, "title");
  }

  if (summary) {
    summary.textContent =
      txt(section, "summary");
  }

  if (content) {
    content.innerHTML =
      markdownToHtml(
        txt(section, "body")
      );
  }

  if (actions) {
    actions.innerHTML =
      (section.actions || [])
        .map(actionButton)
        .join("");
  }

  modal.classList.add("is-open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

  const closeButton =
    $(".service-modal-close", modal);

  closeButton?.focus({
    preventScroll: true
  });
}


function closeServiceModal() {
  const modal =
    $("#serviceModal");

  if (!modal) return;

  modal.classList.remove(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  if (
    !$("#barMenuModal")
      ?.classList
      .contains("is-open")
  ) {
    document.body
      .classList
      .remove("modal-open");
  }
}


/* =========================================================
   CARTE DU BAR
   ========================================================= */

function updateBarMenuLanguage() {
  const modal =
    $("#barMenuModal");

  if (!modal) return;

  const title =
    $(".bar-menu-top h2", modal);

  if (title) {
    title.textContent =
      ui("barTitle");
  }

  const closeButton =
    $(".bar-menu-close", modal);

  if (closeButton) {
    closeButton.setAttribute(
      "aria-label",
      state.lang === "fr"
        ? "Fermer la carte du bar"
        : "Close bar menu"
    );
  }
}


function openBarMenu() {
  const modal =
    $("#barMenuModal");

  if (!modal) {

    console.error(
      "La fenêtre #barMenuModal est absente du fichier index.html."
    );

    return;
  }

  closeServiceModal();

  updateBarMenuLanguage();

  modal.classList.add(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

  const closeButton =
    $(".bar-menu-close", modal);

  closeButton?.focus({
    preventScroll: true
  });
}


function closeBarMenu() {
  const modal =
    $("#barMenuModal");

  if (!modal) return;

  modal.classList.remove(
    "is-open"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  if (
    !$("#serviceModal")
      ?.classList
      .contains("is-open")
  ) {
    document.body
      .classList
      .remove("modal-open");
  }
}


/* =========================================================
   ÉVÉNEMENTS
   ========================================================= */

document.addEventListener(
  "click",
  function (event) {


    /* OUVRIR CARTE DU BAR */

    const openBarButton =
      event.target.closest(
        "[data-open-bar-menu]"
      );

    if (openBarButton) {

      event.preventDefault();

      event.stopPropagation();

      openBarMenu();

      return;
    }


    /* FERMER CARTE DU BAR */

    const closeBarButton =
      event.target.closest(
        "[data-bar-menu-close]"
      );

    if (closeBarButton) {

      event.preventDefault();

      event.stopPropagation();

      closeBarMenu();

      return;
    }


    /* CATÉGORIES */

    const tab =
      event.target.closest(
        "[data-category]"
      );

    if (tab) {

      state.category =
        tab.dataset.category;

      renderTabs();

      renderServices();

      return;
    }


    /* SERVICES */

    const trigger =
      event.target.closest(
        "[data-service-id]"
      );

    if (trigger) {

      event.preventDefault();

      event.stopPropagation();

      openServiceModal(
        trigger.dataset.serviceId
      );
    }

  },
  true
);


/* =========================================================
   TOUCHE ÉCHAP
   ========================================================= */

document.addEventListener(
  "keydown",
  function (event) {

    if (event.key !== "Escape") {
      return;
    }

    if (
      $("#barMenuModal")
        ?.classList
        .contains("is-open")
    ) {

      closeBarMenu();

      return;
    }

    closeServiceModal();
  }
);


/* =========================================================
   CHANGEMENT URL
   ========================================================= */

window.addEventListener(
  "hashchange",
  route
);


/* =========================================================
   DÉMARRAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const search =
      $("#search");

    const langBtn =
      $("#langBtn");


    /* RECHERCHE */

    if (search) {

      search.addEventListener(
        "input",
        (event) => {

          state.query =
            event.target.value;

          renderServices();

        }
      );
    }


    /* LANGUE */

    if (langBtn) {

      langBtn.addEventListener(
        "click",
        () => {

          state.lang =
            state.lang === "fr"
              ? "en"
              : "fr";

          localStorage.setItem(
            "directoryLang",
            state.lang
          );

          renderAll();

          if (
            $("#serviceModal")
              ?.classList
              .contains("is-open")
          ) {
            closeServiceModal();
          }
        }
      );
    }


    /* CHARGEMENT DU JSON */

    loadContent()

      .then(() => {

        renderAll();

        route();

      })

      .catch((error) => {

        console.error(error);

        document.body.innerHTML = `

          <div
            style="
              padding:24px;
              font-family:Arial,sans-serif;
              line-height:1.5
            "
          >

            <h2>
              Erreur de chargement
            </h2>

            <p>
              Le site n'arrive pas à charger correctement les données.
            </p>

            <p>
              <strong>Détail technique :</strong>
              ${escapeHtml(error.message)}
            </p>

            <p>
              Vérifie surtout le fichier
              <strong>hotel.json</strong> :
              une virgule mal placée ou supprimée peut casser toute la page.
            </p>

          </div>

        `;
      });
  }
);
