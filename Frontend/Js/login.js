// GrowPilot AI v0.3
// Login form handler

(() => {
  const loginForm = document.getElementById("loginForm");
  const status = document.getElementById("loginStatus");

  if (!loginForm) {
    console.error("GrowPilot AI: login form not found.");
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const config = window.GROWPILOT_CONFIG || {};
    const hasSupabaseConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

    if (!hasSupabaseConfig) {
      if (status) {
        status.textContent = "Authentication is not enabled yet. Please try again soon.";
        status.classList.add("error");
      }
      return;
    }

    if (status) {
      status.textContent = "Login will be enabled once authentication is configured.";
      status.classList.remove("error");
    }
  });
})();
