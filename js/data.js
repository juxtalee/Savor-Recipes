function _map(r) {
  if (!r) return null;
  return {
    id:          r.id,
    title:       r.title,
    image:       r.image,
    description: r.description,
    category:    r.category,
    cuisine:     r.cuisine,
    mealType:    r.meal_type    || "",
    cookingTime: r.cooking_time || "",
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps:       Array.isArray(r.steps)       ? r.steps       : [],
    author:      r.author_id   || "",
    authorName:  r.profiles?.name || null,
    createdAt:   (r.created_at || "").slice(0, 10),
    saved:       false
  };
}

const RecipeService = {

  getAll: async () => {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*, profiles!recipes_author_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (error) { console.error("getAll:", error.message); return []; }
    return (data || []).map(_map);
  },

  getById: async (id) => {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*, profiles!recipes_author_id_fkey(name)")
      .eq("id", id)
      .single();
    if (error) { console.error("getById:", error.message); return null; }
    return _map(data);
  },

  create: async (recipe) => {
    const user = AuthService.getCurrentUser();
    const { data, error } = await getSupabase()
      .from("recipes")
      .insert([{
        title:        recipe.title,
        image:        recipe.image,
        description:  recipe.description,
        category:     recipe.category,
        cuisine:      recipe.cuisine,
        meal_type:    recipe.mealType,
        ingredients:  recipe.ingredients,
        steps:        recipe.steps,
        cooking_time: recipe.cookingTime,
        author_id:    recipe.author || user?.id || null
      }])
      .select()
      .single();
    if (error) { console.error("create:", error.message); return null; }
    return _map(data);
  },

  update: async (id, updates) => {
    const { data, error } = await getSupabase()
      .from("recipes")
      .update({
        title:        updates.title,
        image:        updates.image,
        description:  updates.description,
        category:     updates.category,
        cuisine:      updates.cuisine,
        meal_type:    updates.mealType,
        ingredients:  updates.ingredients,
        steps:        updates.steps,
        cooking_time: updates.cookingTime
      })
      .eq("id", id)
      .select()
      .single();
    if (error) { console.error("update:", error.message); return null; }
    return _map(data);
  },

  delete: async (id) => {
    const { error } = await getSupabase()
      .from("recipes")
      .delete()
      .eq("id", id);
    if (error) { console.error("delete:", error.message); return false; }
    return true;
  },

  filter: async ({ search, mealType, category, cuisine }) => {
    let q = getSupabase()
      .from("recipes")
      .select("*, profiles!recipes_author_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (mealType && mealType !== "all") q = q.eq("meal_type", mealType);
    if (category && category !== "all") q = q.eq("category",  category);
    if (cuisine  && cuisine  !== "all") q = q.eq("cuisine",   cuisine);
    if (search)                          q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) { console.error("filter:", error.message); return []; }
    return (data || []).map(_map);
  },

  getSaved: async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    const { data, error } = await getSupabase()
      .from("saved_recipes")
      .select("recipe_id, recipes(*, profiles!recipes_author_id_fkey(name))")
      .eq("user_id", user.id);
    if (error) { console.error("getSaved:", error.message); return []; }
    return (data || []).map(row => _map(row.recipes)).filter(Boolean);
  },

  toggleSave: async (id) => {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    const { data: existing } = await getSupabase()
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id",   user.id)
      .eq("recipe_id", id)
      .maybeSingle();
    if (existing) {
      await getSupabase().from("saved_recipes").delete()
        .eq("user_id", user.id).eq("recipe_id", id);
      return false;
    }
    await getSupabase().from("saved_recipes")
      .insert([{ user_id: user.id, recipe_id: id }]);
    return true;
  },

  isSaved: async (id) => {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    const { data } = await getSupabase()
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id",   user.id)
      .eq("recipe_id", id)
      .maybeSingle();
    return !!data;
  },

  getUserRecipes: async (userId) => {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) { console.error("getUserRecipes:", error.message); return []; }
    return (data || []).map(_map);
  }
};
