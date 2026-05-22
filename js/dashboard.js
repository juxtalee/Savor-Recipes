document.addEventListener("DOMContentLoaded", async () => {
  requireAuth();
  const user = AuthService.getCurrentUser();

  document.getElementById("sidebar-name").textContent = user.name;
  document.getElementById("sidebar-email").textContent = user.email;
  document.getElementById("welcome-heading").textContent = `Welcome back, ${user.name.split(" ")[0]}!`;

  const navAuth = document.getElementById("nav-auth");
  if (navAuth) {
    navAuth.innerHTML = `
      <span class="btn btn-ghost" style="pointer-events:none;color:var(--text-secondary);">
        <i class="ph ph-user-circle"></i> ${user.name.split(" ")[0]}
      </span>
      <button class="btn btn-primary" onclick="AuthService.logout()">Sign Out</button>`;
  }
  const mobileAuth = document.getElementById("nav-mobile-auth");
  if (mobileAuth) {
    mobileAuth.innerHTML = `<button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="AuthService.logout()">Sign Out</button>`;
  }

  await loadOverview();
});

// ── Section nav ───────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add("active");
  document.querySelectorAll(".sidebar-link").forEach(l => {
    if (l.textContent.trim().toLowerCase().replace(/\s+/g, "-").includes(name.replace("-"," "))) l.classList.add("active");
  });
  if (name === "overview")   loadOverview();
  if (name === "saved")      loadSaved();
  if (name === "my-recipes") loadMyRecipes();
  if (name === "add-recipe") {
    resetRecipeForm();
    document.getElementById("add-recipe-title").textContent = "Add New Recipe";
    document.getElementById("submit-recipe-btn").innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Publish Recipe';
  }
}

// ── Overview ──────────────────────────────────────────────
async function loadOverview() {
  const user = AuthService.getCurrentUser();
  const [myRecipes, saved] = await Promise.all([
    RecipeService.getUserRecipes(user.id),
    RecipeService.getSaved()
  ]);
  const cuisines = new Set(saved.map(r => r.cuisine));
  document.getElementById("stat-my-recipes").textContent = myRecipes.length;
  document.getElementById("stat-saved").textContent = saved.length;
  document.getElementById("stat-cuisines").textContent = cuisines.size;

  const grid = document.getElementById("overview-saved-grid");
  const recent = saved.slice(0, 3);
  grid.innerHTML = recent.length
    ? recent.map(r => buildManageCard(r, false)).join("")
    : `<div style="color:var(--text-muted);font-size:0.9rem;padding:16px 0;">No saved recipes yet. <a href="recipes.html" style="color:var(--terracotta);">Browse recipes</a></div>`;
}

// ── Saved ─────────────────────────────────────────────────
async function loadSaved() {
  const saved = await RecipeService.getSaved();
  const grid  = document.getElementById("saved-grid");
  const empty = document.getElementById("saved-empty");
  if (!saved.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  grid.innerHTML = saved.map(r => buildManageCard(r, false)).join("");
}

// ── My Recipes ────────────────────────────────────────────
async function loadMyRecipes() {
  const user    = AuthService.getCurrentUser();
  const recipes = await RecipeService.getUserRecipes(user.id);
  const grid    = document.getElementById("my-recipes-grid");
  const empty   = document.getElementById("my-recipes-empty");
  const count   = document.getElementById("my-recipes-count");
  count.textContent = recipes.length ? `${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}` : "";
  if (!recipes.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  grid.innerHTML = recipes.map(r => buildManageCard(r, true)).join("");
}

// ── Card ─────────────────────────────────────────────────
function buildManageCard(recipe, isOwn) {
  return `
    <div class="manage-card" data-id="${recipe.id}">
      <div class="manage-card-img">
        <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
      </div>
      <div class="manage-card-body">
        <div class="manage-card-title">${recipe.title}</div>
        <div class="manage-card-meta">
          ${(CUISINE_LABELS||{})[recipe.cuisine]||recipe.cuisine} &middot;
          ${(MEAL_LABELS||{})[recipe.mealType]||recipe.mealType} &middot;
          ${recipe.cookingTime}
        </div>
        <div class="manage-card-actions">
          <a href="recipe.html?id=${recipe.id}" class="btn btn-sm btn-ghost"><i class="ph ph-eye"></i> View</a>
          ${isOwn ? `
            <button class="btn btn-sm btn-ghost" onclick="editRecipe('${recipe.id}')"><i class="ph ph-pencil-simple"></i> Edit</button>
            <button class="btn btn-sm" style="background:#fdecea;color:#c62828;" onclick="deleteRecipe('${recipe.id}')"><i class="ph ph-trash"></i></button>
          ` : `
            <button class="btn btn-sm btn-ghost" onclick="unsaveRecipe('${recipe.id}')"><i class="ph ph-bookmark-simple-fill"></i> Unsave</button>
          `}
        </div>
      </div>
    </div>`;
}

// ── Delete ────────────────────────────────────────────────
async function deleteRecipe(id) {
  const recipe = await RecipeService.getById(id);
  if (!confirm(`Delete "${recipe?.title}"? This cannot be undone.`)) return;
  await RecipeService.delete(id);
  showToast("Recipe deleted.", "info");
  await loadMyRecipes();
  await loadOverview();
}

// ── Unsave ────────────────────────────────────────────────
async function unsaveRecipe(id) {
  await RecipeService.toggleSave(id);
  showToast("Removed from saved.", "info");
  await loadSaved();
  await loadOverview();
}

// ── Edit (pre-fill) ───────────────────────────────────────
async function editRecipe(id) {
  const recipe = await RecipeService.getById(id);
  if (!recipe) return;
  showSection("add-recipe");
  document.getElementById("add-recipe-title").textContent = "Edit Recipe";
  document.getElementById("submit-recipe-btn").innerHTML = '<i class="ph ph-floppy-disk"></i> Save Changes';
  document.getElementById("edit-recipe-id").value = id;
  document.getElementById("rf-title").value       = recipe.title;
  document.getElementById("rf-image").value       = recipe.image;
  document.getElementById("rf-description").value = recipe.description;
  document.getElementById("rf-category").value    = recipe.category;
  document.getElementById("rf-cuisine").value     = recipe.cuisine;
  document.getElementById("rf-mealtype").value    = recipe.mealType;
  document.getElementById("rf-time").value        = recipe.cookingTime;

  const ingList = document.getElementById("ingredients-list");
  ingList.innerHTML = (recipe.ingredients||[]).map(v => dynItemHTML("ingredient-input", v)).join("") || dynItemHTML("ingredient-input");

  const stepList = document.getElementById("steps-list");
  stepList.innerHTML = (recipe.steps||[]).map(v => dynItemHTML("step-input", v)).join("") || dynItemHTML("step-input");
}

// ── Submit (create/update) ────────────────────────────────
async function handleRecipeSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById("edit-recipe-id").value;
  const ingredients = [...document.querySelectorAll(".ingredient-input")].map(i => i.value.trim()).filter(Boolean);
  const steps       = [...document.querySelectorAll(".step-input")].map(i => i.value.trim()).filter(Boolean);
  if (!ingredients.length) { showToast("Add at least one ingredient.", "error"); return; }
  if (!steps.length)       { showToast("Add at least one step.", "error"); return; }

  const data = {
    title:       document.getElementById("rf-title").value.trim(),
    image:       document.getElementById("rf-image").value.trim(),
    description: document.getElementById("rf-description").value.trim(),
    category:    document.getElementById("rf-category").value,
    cuisine:     document.getElementById("rf-cuisine").value,
    mealType:    document.getElementById("rf-mealtype").value,
    cookingTime: document.getElementById("rf-time").value.trim(),
    ingredients, steps
  };

  const btn = document.getElementById("submit-recipe-btn");
  btn.disabled = true; btn.textContent = "Saving...";

  if (editId) {
    await RecipeService.update(editId, data);
    showToast("Recipe updated!", "success");
  } else {
    await RecipeService.create(data);
    showToast("Recipe published!", "success");
  }

  btn.disabled = false;
  resetRecipeForm();
  showSection("my-recipes");
}

// ── Dynamic helpers ───────────────────────────────────────
function dynItemHTML(cls, value = "") {
  return `<div class="dynamic-item">
    <input type="text" class="form-input ${cls}" value="${value.replace(/"/g,"&quot;")}" placeholder="...">
    <button type="button" class="remove-item-btn" onclick="removeDynamicItem(this)"><i class="ph ph-x"></i></button>
  </div>`;
}
function addIngredient() { document.getElementById("ingredients-list").insertAdjacentHTML("beforeend", dynItemHTML("ingredient-input")); }
function addStep()       { document.getElementById("steps-list").insertAdjacentHTML("beforeend", dynItemHTML("step-input")); }
function removeDynamicItem(btn) {
  const parent = btn.closest(".dynamic-list");
  if (parent?.querySelectorAll(".dynamic-item").length <= 1) { showToast("At least one item required.", "error"); return; }
  btn.closest(".dynamic-item").remove();
}
function resetRecipeForm() {
  document.getElementById("recipe-form").reset();
  document.getElementById("edit-recipe-id").value = "";
  document.getElementById("ingredients-list").innerHTML = dynItemHTML("ingredient-input");
  document.getElementById("steps-list").innerHTML = dynItemHTML("step-input");
}
