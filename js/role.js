async function redirectByRole() {
  const { data: userData } = await supabaseClient.auth.getUser();

  if (!userData.user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (!profile) return;

  if (location.pathname.includes("index.html")) {
    if (profile.role === "admin") window.location.href = "admin.html";
    if (profile.role === "seller") window.location.href = "seller.html";
    if (profile.role === "viewer") window.location.href = "viewer.html";
  }
}