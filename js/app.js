function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "ph-check-circle", error: "ph-x-circle", info: "ph-info" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Modal ─────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add("open"); document.body.style.overflow = "hidden"; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove("open"); document.body.style.overflow = ""; }
}
document.addEventListener("click", e => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open"); document.body.style.overflow = "";
  }
  if (e.target.closest(".modal-close")) {
    const ov = e.target.closest(".modal-overlay");
    if (ov) { ov.classList.remove("open"); document.body.style.overflow = ""; }
  }
});

// ── Navbar ────────────────────────────────────────────────
function initNavbar() {
  const navbar   = document.querySelector(".navbar");
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  window.addEventListener("scroll", () => {
    navbar?.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });

  hamburger?.addEventListener("click", () => {
    const open = mobileMenu?.classList.toggle("open");
    // animate hamburger to X
    const spans = hamburger.querySelectorAll("span");
    if (open) {
      spans[0].style.cssText = "transform: rotate(45deg) translate(5px,5px)";
      spans[1].style.cssText = "opacity:0";
      spans[2].style.cssText = "transform: rotate(-45deg) translate(5px,-5px)";
    } else {
      spans.forEach(s => s.style.cssText = "");
    }
  });

  // Close mobile menu when a link is tapped
  mobileMenu?.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      hamburger?.querySelectorAll("span").forEach(s => s.style.cssText = "");
    });
  });

  // Highlight active page link
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .nav-mobile-menu a").forEach(link => {
    const href = link.getAttribute("href")?.split("?")[0];
    if (href === page || (page === "" && href === "index.html")) link.classList.add("active");
  });

  updateNavAuth();
}

// ── Scroll reveal ─────────────────────────────────────────
function initScrollAnimations() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".fade-in").forEach(el => obs.observe(el));
}

// ── Recipe Card ───────────────────────────────────────────
const CUISINE_LABELS = { pakistani:"Pakistani", italian:"Italian", chinese:"Chinese", turkish:"Turkish", american:"American", thai:"Thai", french:"French" };
const MEAL_LABELS    = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", dessert:"Dessert" };
const CAT_LABELS     = { chicken:"Chicken", beef:"Beef", seafood:"Seafood", veg:"Vegetarian" };

function buildRecipeCard(recipe) {
  const saved = false; // updated async per card via toggleSave
  return `
    <div class="recipe-card fade-in" data-id="${recipe.id}">
      <div class="card-image">
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
        <span class="card-badge">${MEAL_LABELS[recipe.mealType] || recipe.mealType}</span>
        <button class="card-save ${saved ? "saved" : ""}"
          onclick="handleSave('${recipe.id}', this)"
          title="${saved ? "Unsave" : "Save recipe"}">
          <i class="ph ${saved ? "ph-bookmark-simple-fill" : "ph-bookmark-simple"}"></i>
        </button>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span><i class="ph ph-clock"></i> ${recipe.cookingTime}</span>
          <span><i class="ph ph-fork-knife"></i> ${CAT_LABELS[recipe.category] || recipe.category}</span>
        </div>
        <h3 class="card-title">${recipe.title}</h3>
        <p class="card-desc">${recipe.description}</p>
        <div class="card-footer">
          <span class="card-cuisine">
            <i class="ph ph-globe-simple"></i> ${CUISINE_LABELS[recipe.cuisine] || recipe.cuisine}
          </span>
          <a href="recipe.html?id=${recipe.id}" class="btn btn-sm btn-outline">
            View Recipe <i class="ph ph-arrow-right"></i>
          </a>
        </div>
      </div>
    </div>`;
}

// ── Save handler (async) ──────────────────────────────────
async function handleSave(id, btn) {
  if (!AuthService.isLoggedIn()) { openModal("login-required-modal"); return; }
  btn.disabled = true;
  const isSaved = await RecipeService.toggleSave(id);
  btn.disabled = false;
  const icon = btn.querySelector("i");
  if (isSaved) {
    icon.className = "ph ph-bookmark-simple-fill";
    btn.classList.add("saved");
    showToast("Recipe saved!", "success");
  } else {
    icon.className = "ph ph-bookmark-simple";
    btn.classList.remove("saved");
    showToast("Removed from saved.", "info");
  }
}

// ── Login-required modal ──────────────────────────────────
function injectLoginRequiredModal() {
  if (document.getElementById("login-required-modal")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-overlay" id="login-required-modal">
      <div class="modal">
        <div class="modal-header">
          <h3>Sign In Required</h3>
          <button class="modal-close"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body">
          <p>You need to be signed in to save recipes and access your personal dashboard.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal('login-required-modal')">Cancel</button>
          <a href="login.html" class="btn btn-primary"><i class="ph ph-sign-in"></i> Sign In</a>
        </div>
      </div>
    </div>`);
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initScrollAnimations();
  injectLoginRequiredModal();
});
