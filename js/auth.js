const AuthService = {

  register: async (name, email, password) => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { name, role: "user" } }
    });
    if (error) return { success: false, error: error.message };
    const safe = { id: data.user.id, name, email, role: "user" };
    localStorage.setItem("current_user", JSON.stringify(safe));
    return { success: true, user: safe };
  },

  login: async (email, password) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    const { data: profile } = await getSupabase()
      .from("profiles")
      .select("name, role")
      .eq("id", data.user.id)
      .single();
    const safe = {
      id:    data.user.id,
      name:  profile?.name || email.split("@")[0],
      email: data.user.email,
      role:  profile?.role || "user"
    };
    localStorage.setItem("current_user", JSON.stringify(safe));
    return { success: true, user: safe };
  },

  logout: async () => {
    await getSupabase().auth.signOut();
    localStorage.removeItem("current_user");
    window.location.href = "index.html";
  },

  getCurrentUser: () => {
    const u = localStorage.getItem("current_user");
    return u ? JSON.parse(u) : null;
  },

  isLoggedIn: () => !!localStorage.getItem("current_user"),
  isAdmin:    () => AuthService.getCurrentUser()?.role === "admin",

  updateProfile: async (updates) => {
    const current = AuthService.getCurrentUser();
    if (!current) return false;
    const { error } = await getSupabase()
      .from("profiles")
      .update(updates)
      .eq("id", current.id);
    if (error) { console.error("updateProfile:", error.message); return false; }
    localStorage.setItem("current_user", JSON.stringify({ ...current, ...updates }));
    return true;
  }
};

// ── UserService ──────────────────────────────────────────────
const UserService = {

  getAll: async () => {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("id, name, role, created_at")
      .order("created_at");
    if (error) { console.error("users getAll:", error.message); return []; }
    return data || [];
  },

  getById: async (id) => {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("id, name, role, created_at")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  delete: async (id) => {
    await getSupabase().from("recipes").delete().eq("author_id", id);
    const { error } = await getSupabase().from("profiles").delete().eq("id", id);
    if (error) { console.error("user delete:", error.message); return false; }
    return true;
  },

  setRole: async (id, role) => {
    const { error } = await getSupabase()
      .from("profiles")
      .update({ role })
      .eq("id", id);
    if (error) { console.error("setRole:", error.message); return false; }
    return true;
  },

  getRecipeCount: async (userId) => {
    const { count, error } = await getSupabase()
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId);
    if (error) return 0;
    return count || 0;
  }
};

// ── Guards ───────────────────────────────────────────────────
function requireAuth()  { if (!AuthService.isLoggedIn()) window.location.href = "login.html"; }
function requireAdmin() { if (!AuthService.isLoggedIn() || !AuthService.isAdmin()) window.location.href = "login.html"; }

// ── Navbar ───────────────────────────────────────────────────
function updateNavAuth() {
  const user = AuthService.getCurrentUser();
  const area = document.getElementById("nav-auth");
  if (!area) return;
  if (user) {
    const link = user.role === "admin"
      ? `<a href="admin.html" class="btn btn-ghost" style="color:var(--gold);"><i class="ph ph-shield-check"></i> Admin</a>`
      : `<a href="dashboard.html" class="btn btn-ghost"><i class="ph ph-user-circle"></i> ${user.name.split(" ")[0]}</a>`;
    area.innerHTML = `${link}<button class="btn btn-primary" onclick="AuthService.logout()">Sign Out</button>`;
  } else {
    area.innerHTML = `<a href="login.html" class="btn btn-ghost">Sign In</a><a href="login.html#register" class="btn btn-primary">Get Started</a>`;
  }
}
