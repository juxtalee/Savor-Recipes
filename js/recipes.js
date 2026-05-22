async function applyFilters() {
  showLoading();
  const search   = document.getElementById("search-input")?.value.trim() || "";
  const mealType = document.getElementById("filter-meal")?.value || "all";
  const category = document.getElementById("filter-category")?.value || "all";
  const cuisine  = document.getElementById("filter-cuisine")?.value || "all";
  const results  = await RecipeService.filter({ search, mealType, category, cuisine });
  renderRecipes(results);
}

function clearFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("filter-meal").value = "all";
  document.getElementById("filter-category").value = "all";
  document.getElementById("filter-cuisine").value = "all";
  applyFilters();
}

function showLoading() {
  const grid = document.getElementById("recipes-grid");
  document.getElementById("no-results").style.display = "none";
  document.getElementById("results-count").textContent = "";
  if (grid) grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted);">
      <i class="ph ph-circle-notch" style="font-size:2rem;display:block;margin-bottom:12px;animation:spin 1s linear infinite;"></i>
      Loading recipes...
    </div>`;
}

function renderRecipes(recipes) {
  const grid     = document.getElementById("recipes-grid");
  const noRes    = document.getElementById("no-results");
  const countEl  = document.getElementById("results-count");
  if (!grid) return;
  if (!recipes.length) {
    grid.innerHTML = "";
    noRes.style.display = "block";
    countEl.textContent = "";
    return;
  }
  noRes.style.display = "none";
  countEl.textContent = `Showing ${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`;
  grid.innerHTML = recipes.map(r => buildRecipeCard(r)).join("");
  initScrollAnimations();
}

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.get("search"))   document.getElementById("search-input").value = p.get("search");
  if (p.get("cuisine") && p.get("cuisine") !== "all")   document.getElementById("filter-cuisine").value = p.get("cuisine");
  if (p.get("category") && p.get("category") !== "all") document.getElementById("filter-category").value = p.get("category");
  if (p.get("mealType") && p.get("mealType") !== "all") document.getElementById("filter-meal").value = p.get("mealType");
}

document.addEventListener("DOMContentLoaded", () => {
  readUrlParams();
  applyFilters();
  document.getElementById("search-input")?.addEventListener("keydown", e => { if (e.key === "Enter") applyFilters(); });
  document.getElementById("search-input")?.addEventListener("input", () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(applyFilters, 350);
  });
});

// inject spin keyframe
const style = document.createElement("style");
style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
document.head.appendChild(style);
