document.addEventListener("DOMContentLoaded", async () => {
  requireAdmin();
  const user = AuthService.getCurrentUser();
  document.getElementById("admin-name").textContent  = user.name;
  document.getElementById("admin-email").textContent = user.email;
  const navAuth = document.getElementById("nav-auth");
  if (navAuth) navAuth.innerHTML = `<span style="font-size:.85rem;color:var(--gold);font-weight:600;"><i class="ph ph-shield-check"></i> ${user.name.split(" ")[0]}</span><button class="btn btn-primary" onclick="AuthService.logout()">Sign Out</button>`;
  await populateAuthorDropdown();
  await loadOverviewStats();
  loadCuisineBars();
  await loadRecentRecipesTable();
  loadActivityLog();
});

async function showAdminSection(name) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".admin-link").forEach(l => l.classList.remove("active"));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add("active");
  document.querySelectorAll(".admin-link").forEach(l => {
    if (l.textContent.trim().toLowerCase().replace(/\s+/g,"-").includes(name)) l.classList.add("active");
  });
  if (name==="overview")    { await loadOverviewStats(); loadCuisineBars(); await loadRecentRecipesTable(); }
  if (name==="all-recipes") { await loadAllRecipesTable(); buildCuisineChips(); }
  if (name==="users")       { await loadUsersTable(); }
  if (name==="activity")    { loadActivityLog(); }
  if (name==="add-recipe")  { resetAdminRecipeForm(); document.getElementById("admin-recipe-form-title").textContent="Add New Recipe"; document.getElementById("admin-submit-btn").innerHTML='<i class="ph ph-paper-plane-tilt"></i> Publish Recipe'; await populateAuthorDropdown(); }
}

async function loadOverviewStats() {
  const [recipes, users] = await Promise.all([RecipeService.getAll(), UserService.getAll()]);
  const saved    = JSON.parse(localStorage.getItem("saved_recipes")||"[]");
  const cuisines = new Set(recipes.map(r=>r.cuisine));
  document.getElementById("stat-total-recipes").textContent = recipes.length;
  document.getElementById("stat-total-users").textContent   = users.length;
  document.getElementById("stat-saved-count").textContent   = saved.length;
  document.getElementById("stat-cuisines-count").textContent= cuisines.size;
}

async function loadCuisineBars() {
  const recipes = await RecipeService.getAll();
  const counts  = {};
  recipes.forEach(r => { counts[r.cuisine]=(counts[r.cuisine]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max    = sorted[0]?.[1]||1;
  const colors = ["#c0522a","#c8961e","#5c7a5a","#3b5bdb","#d4714a","#8b6340","#9c4a9c"];
  const CUISINE_LABELS = {pakistani:"Pakistani",italian:"Italian",chinese:"Chinese",turkish:"Turkish",american:"American",thai:"Thai",french:"French"};
  const el = document.getElementById("cuisine-bars");
  if (!el) return;
  el.innerHTML = sorted.map(([c,n],i)=>`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
      <div style="width:110px;font-size:.85rem;font-weight:600;color:var(--text-secondary);text-align:right;flex-shrink:0;">${CUISINE_LABELS[c]||c}</div>
      <div style="flex:1;background:var(--cream-dark);border-radius:4px;height:10px;overflow:hidden;">
        <div style="width:${Math.round(n/max*100)}%;background:${colors[i%colors.length]};height:100%;border-radius:4px;transition:width .8s ease;"></div>
      </div>
      <div style="width:32px;font-size:.85rem;font-weight:700;color:var(--espresso);">${n}</div>
    </div>`).join("");
}

async function loadRecentRecipesTable() {
  const recipes = (await RecipeService.getAll()).slice(0,6);
  const CUISINE_LABELS={pakistani:"Pakistani",italian:"Italian",chinese:"Chinese",turkish:"Turkish",american:"American",thai:"Thai",french:"French"};
  const MEAL_LABELS={breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",dessert:"Dessert"};
  const tbody = document.getElementById("recent-recipes-tbody");
  if (!tbody) return;
  tbody.innerHTML = recipes.map(r=>`
    <tr>
      <td><div class="td-recipe-name"><img class="td-recipe-thumb" src="${r.image}" alt="${r.title}"><div><div class="td-recipe-title">${r.title}</div><div class="td-recipe-sub">${r.cookingTime}</div></div></div></td>
      <td><span class="tag tag-cuisine">${CUISINE_LABELS[r.cuisine]||r.cuisine}</span></td>
      <td><span class="tag tag-meal">${MEAL_LABELS[r.mealType]||r.mealType}</span></td>
      <td style="color:var(--text-muted);font-size:.82rem;">${r.createdAt}</td>
      <td><div class="table-actions">
        <a href="recipe.html?id=${r.id}" class="btn btn-sm btn-ghost" target="_blank"><i class="ph ph-eye"></i></a>
        <button class="btn btn-sm btn-ghost" onclick="adminEditRecipe('${r.id}')"><i class="ph ph-pencil-simple"></i></button>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteRecipe('${r.id}')"><i class="ph ph-trash"></i></button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="5" class="table-empty"><i class="ph ph-cooking-pot"></i> No recipes yet.</td></tr>`;
}

let _activeCuisineFilter="all";
async function buildCuisineChips() {
  const recipes  = await RecipeService.getAll();
  const cuisines = ["all",...new Set(recipes.map(r=>r.cuisine))];
  const CUISINE_LABELS={pakistani:"Pakistani",italian:"Italian",chinese:"Chinese",turkish:"Turkish",american:"American",thai:"Thai",french:"French"};
  const el = document.getElementById("cuisine-filter-chips");
  if (!el) return;
  el.innerHTML = cuisines.map(c=>`<span class="chip ${_activeCuisineFilter===c?'active':''}" onclick="setCuisineFilter('${c}')">${c==="all"?"All":(CUISINE_LABELS[c]||c)}</span>`).join("");
}
async function setCuisineFilter(c) { _activeCuisineFilter=c; buildCuisineChips(); await filterAdminRecipes(); }

async function loadAllRecipesTable(recipes) {
  recipes = recipes || await RecipeService.getAll();
  const CUISINE_LABELS={pakistani:"Pakistani",italian:"Italian",chinese:"Chinese",turkish:"Turkish",american:"American",thai:"Thai",french:"French"};
  const CAT_LABELS={chicken:"Chicken",beef:"Beef",seafood:"Seafood",veg:"Vegetarian"};
  const tbody=document.getElementById("admin-recipes-tbody"),empty=document.getElementById("recipes-table-empty"),count=document.getElementById("recipes-table-count");
  if (!tbody) return;
  count.textContent=`${recipes.length} recipe${recipes.length!==1?"s":""}`;
  if (!recipes.length){tbody.innerHTML="";empty.style.display="block";return;}
  empty.style.display="none";
  tbody.innerHTML=recipes.map(r=>`
    <tr data-id="${r.id}">
      <td><div class="td-recipe-name"><img class="td-recipe-thumb" src="${r.image}" alt="${r.title}"><div><div class="td-recipe-title">${r.title}</div><div class="td-recipe-sub">${r.cookingTime} · ${CAT_LABELS[r.category]||r.category}</div></div></div></td>
      <td><span class="tag tag-meal">${CAT_LABELS[r.category]||r.category}</span></td>
      <td><span class="tag tag-cuisine">${CUISINE_LABELS[r.cuisine]||r.cuisine}</span></td>
      <td style="color:var(--text-muted);font-size:.82rem;">${r.createdAt}</td>
      <td><div class="table-actions">
        <a href="recipe.html?id=${r.id}" class="btn btn-sm btn-ghost" target="_blank"><i class="ph ph-arrow-square-out"></i></a>
        <button class="btn btn-sm btn-ghost" onclick="adminEditRecipe('${r.id}')"><i class="ph ph-pencil-simple"></i> Edit</button>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteRecipe('${r.id}')"><i class="ph ph-trash"></i></button>
      </div></td>
    </tr>`).join("");
}

async function filterAdminRecipes() {
  const q=(document.getElementById("admin-recipe-search")?.value||"").toLowerCase().trim();
  let recipes=await RecipeService.getAll();
  if (_activeCuisineFilter!=="all") recipes=recipes.filter(r=>r.cuisine===_activeCuisineFilter);
  if (q) recipes=recipes.filter(r=>r.title.toLowerCase().includes(q)||r.description.toLowerCase().includes(q));
  loadAllRecipesTable(recipes);
}

async function adminDeleteRecipe(id) {
  const recipe=await RecipeService.getById(id);
  if (!recipe||!confirm(`Delete "${recipe.title}"?`)) return;
  await RecipeService.delete(id);
  logActivity("delete",`Deleted recipe: "${recipe.title}"`,"act-delete","ph-trash");
  showToast(`"${recipe.title}" deleted.`,"info");
  await loadAllRecipesTable(); buildCuisineChips(); loadOverviewStats(); loadCuisineBars();
}

async function adminEditRecipe(id) {
  const recipe=await RecipeService.getById(id);
  if (!recipe) return;
  showAdminSection("add-recipe");
  document.getElementById("admin-recipe-form-title").textContent="Edit Recipe";
  document.getElementById("admin-submit-btn").innerHTML='<i class="ph ph-floppy-disk"></i> Save Changes';
  document.getElementById("admin-edit-id").value=id;
  document.getElementById("arf-title").value=recipe.title;
  document.getElementById("arf-image").value=recipe.image;
  document.getElementById("arf-description").value=recipe.description;
  document.getElementById("arf-category").value=recipe.category;
  document.getElementById("arf-cuisine").value=recipe.cuisine;
  document.getElementById("arf-mealtype").value=recipe.mealType;
  document.getElementById("arf-time").value=recipe.cookingTime;
  await populateAuthorDropdown(recipe.author);
  const il=document.getElementById("admin-ingredients-list");
  il.innerHTML=(recipe.ingredients||[]).map(v=>aDyn("ingredient-input",v)).join("")||aDyn("ingredient-input");
  const sl=document.getElementById("admin-steps-list");
  sl.innerHTML=(recipe.steps||[]).map(v=>aDyn("step-input",v)).join("")||aDyn("step-input");
}

async function handleAdminRecipeSubmit(e) {
  e.preventDefault();
  const editId=document.getElementById("admin-edit-id").value;
  const ingredients=[...document.querySelectorAll("#admin-ingredients-list .ingredient-input")].map(i=>i.value.trim()).filter(Boolean);
  const steps=[...document.querySelectorAll("#admin-steps-list .step-input")].map(i=>i.value.trim()).filter(Boolean);
  if (!ingredients.length){showToast("Add at least one ingredient.","error");return;}
  if (!steps.length){showToast("Add at least one step.","error");return;}
  const author=document.getElementById("arf-author")?.value||"admin_001";
  const data={title:document.getElementById("arf-title").value.trim(),image:document.getElementById("arf-image").value.trim(),description:document.getElementById("arf-description").value.trim(),category:document.getElementById("arf-category").value,cuisine:document.getElementById("arf-cuisine").value,mealType:document.getElementById("arf-mealtype").value,cookingTime:document.getElementById("arf-time").value.trim(),ingredients,steps,author};
  const btn=document.getElementById("admin-submit-btn");
  btn.disabled=true; btn.textContent="Saving...";
  if (editId){await RecipeService.update(editId,data);logActivity("edit",`Updated: "${data.title}"`,"act-create","ph-pencil-simple");showToast("Recipe updated!","success");}
  else{await RecipeService.create(data);logActivity("create",`Published: "${data.title}"`,"act-create","ph-cooking-pot");showToast("Recipe published!","success");}
  btn.disabled=false; resetAdminRecipeForm(); showAdminSection("all-recipes");
}

async function populateAuthorDropdown(selectedId="admin_001") {
  const sel=document.getElementById("arf-author"); if (!sel) return;
  const users=await UserService.getAll();
  sel.innerHTML=users.map(u=>`<option value="${u.id}" ${u.id===selectedId?"selected":""}>${u.name} (${u.role})</option>`).join("");
}

async function loadUsersTable(users) {
  users=users||await UserService.getAll();
  const tbody=document.getElementById("admin-users-tbody"),empty=document.getElementById("users-table-empty"),count=document.getElementById("users-table-count");
  if (!tbody) return;
  count.textContent=`${users.length} user${users.length!==1?"s":""}`;
  if (!users.length){tbody.innerHTML="";empty.style.display="block";return;}
  empty.style.display="none";
  const currentId=AuthService.getCurrentUser()?.id;
  tbody.innerHTML=users.map(u=>{
    const initials=u.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    const rc=UserService.getRecipeCount(u.id);
    const joined=u.createdAt?new Date(u.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
    const isMe=u.id===currentId;
    return `<tr data-uid="${u.id}">
      <td><div class="td-user"><div class="td-avatar">${initials}</div><div><div class="td-name">${u.name}${isMe?'<span style="font-size:.72rem;background:var(--terracotta-pale);color:var(--terracotta);padding:2px 7px;border-radius:10px;margin-left:4px;">You</span>':""}</div><div class="td-email">${u.email}</div></div></div></td>
      <td><span class="role-badge ${u.role==="admin"?"role-admin":"role-user"}"><i class="ph ${u.role==="admin"?"ph-shield-check":"ph-user"}"></i> ${u.role||"user"}</span></td>
      <td style="font-weight:600;color:var(--espresso);">${rc}</td>
      <td style="color:var(--text-muted);font-size:.82rem;">${joined}</td>
      <td><div class="table-actions">${u.id!=="admin_001"?`
        <button class="btn btn-sm btn-ghost" onclick="toggleUserRole('${u.id}','${u.role||"user"}')"><i class="ph ${u.role==="admin"?"ph-shield-slash":"ph-shield-check"}"></i> ${u.role==="admin"?"Revoke":"Make Admin"}</button>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${u.id}','${u.name.replace(/'/g,"\\'")}')"><i class="ph ph-trash"></i></button>`
        :'<span style="font-size:.8rem;color:var(--text-muted);">Protected</span>'}</div></td>
    </tr>`;
  }).join("");
}

async function filterAdminUsers() {
  const q=(document.getElementById("admin-user-search")?.value||"").toLowerCase().trim();
  const users=(await UserService.getAll()).filter(u=>u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q));
  loadUsersTable(users);
}

async function toggleUserRole(id,cur) {
  const nr=cur==="admin"?"user":"admin";
  await UserService.setRole(id,nr);
  const u=UserService.getById(id);
  logActivity("user",`Changed role of ${u?.name||id} to "${nr}"`,"act-user","ph-shield-check");
  showToast(`Role updated to "${nr}".`,"success");
  await loadUsersTable();
}

async function adminDeleteUser(id,name) {
  if (!confirm(`Delete user "${name}" and all their recipes?`)) return;
  await UserService.delete(id);
  logActivity("delete",`Deleted user: "${name}"`,"act-delete","ph-user-minus");
  showToast(`User "${name}" removed.`,"info");
  await loadUsersTable(); await loadOverviewStats();
}

function aDyn(cls,value="") {
  return `<div class="dynamic-item"><input type="text" class="form-input ${cls}" value="${value.replace(/"/g,"&quot;")}" placeholder="..."><button type="button" class="remove-item-btn" onclick="removeDynItem(this)"><i class="ph ph-x"></i></button></div>`;
}
function addAdminIngredient() { document.getElementById("admin-ingredients-list").insertAdjacentHTML("beforeend",aDyn("ingredient-input")); }
function addAdminStep()       { document.getElementById("admin-steps-list").insertAdjacentHTML("beforeend",aDyn("step-input")); }
function removeDynItem(btn) {
  const p=btn.closest(".dynamic-list");
  if (p?.querySelectorAll(".dynamic-item").length<=1){showToast("At least one item required.","error");return;}
  btn.closest(".dynamic-item").remove();
}
function resetAdminRecipeForm() {
  document.getElementById("admin-recipe-form").reset();
  document.getElementById("admin-edit-id").value="";
  document.getElementById("admin-ingredients-list").innerHTML=aDyn("ingredient-input");
  document.getElementById("admin-steps-list").innerHTML=aDyn("step-input");
}

function logActivity(type,message,iconClass,iconName) {
  const log=JSON.parse(localStorage.getItem("admin_activity_log")||"[]");
  log.unshift({type,message,iconClass,iconName,timestamp:new Date().toISOString()});
  localStorage.setItem("admin_activity_log",JSON.stringify(log.slice(0,50)));
}
function loadActivityLog() {
  const log=JSON.parse(localStorage.getItem("admin_activity_log")||"[]");
  const feed=document.getElementById("activity-feed"); if (!feed) return;
  if (!log.length){feed.innerHTML=`<div class="table-empty"><i class="ph ph-activity"></i> No activity recorded yet.</div>`;return;}
  feed.innerHTML=log.map(e=>{
    const t=new Date(e.timestamp).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    return `<div class="activity-item"><div class="activity-icon ${e.iconClass||"act-create"}"><i class="ph ${e.iconName||"ph-activity"}"></i></div><div class="activity-text"><strong>${e.message}</strong><span>Admin action</span></div><div class="activity-time">${t}</div></div>`;
  }).join("");
}
function clearActivityLog() {
  if (!confirm("Clear all activity log entries?")) return;
  localStorage.removeItem("admin_activity_log"); loadActivityLog(); showToast("Activity log cleared.","info");
}
