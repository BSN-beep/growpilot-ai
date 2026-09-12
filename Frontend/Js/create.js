// GrowPilot AI v0.3
// Marketing Pack Generator

(() => {
  const form =
    document.getElementById("createForm") ||
    document.getElementById("adForm");

  const status = document.getElementById("status");
  const button = document.getElementById("generate");

  if (!form) {
    console.error("GrowPilot AI: create form not found.");
    return;
  }

  function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function setStatus(message, type = "") {
    if (!status) return;

    status.textContent = message;
    status.className = "status";

    if (type) {
      status.classList.add(type);
    }
  }

  function setLoading(loading) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading
      ? "Generating..."
      : "Generate Marketing Pack →";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const config = window.GROWPILOT_CONFIG || {};

    const apiBase =
      String(config.API_BASE_URL || "").replace(/\/+$/, "");

    if (!apiBase) {
      setStatus(
        "API is not configured. Please check Js/config.js.",
        "error"
      );
      return;
    }

    const input = {
      business: getValue("business"),
      product: getValue("product"),
      audience: getValue("audience"),
      location: getValue("location"),
      price: getValue("price"),
      platform: getValue("platform"),
      goal: getValue("goal"),
      tone: getValue("tone")
    };

    if (!input.business || !input.product || !input.audience) {
      setStatus(
        "Please complete the required business, product, and audience fields.",
        "error"
      );
      return;
    }

    setLoading(true);
    setStatus("Creating your AI marketing pack...");

    try {
      const response = await fetch(
        `${apiBase}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        }
      );

      let body;

      try {
        body = await response.json();
      } catch {
        throw new Error(
          `The server returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          body?.error ||
          `Generation failed (${response.status}).`
        );
      }

      if (!body || body.success !== true || !body.data) {
        throw new Error(
          body?.error ||
          "The AI returned an unexpected response."
        );
      }

      const pack = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        input: input,
        result: body.data
      };

      // Store the newest generated pack.
      localStorage.setItem(
        "growpilot_latest_pack",
        JSON.stringify(pack)
      );

      // Keep a local history of generated packs.
      let savedPacks = [];

      try {
        savedPacks = JSON.parse(
          localStorage.getItem("growpilot_saved_packs") || "[]"
        );

        if (!Array.isArray(savedPacks)) {
          savedPacks = [];
        }
      } catch {
        savedPacks = [];
      }

      // Add the newest pack to the beginning.
      savedPacks.unshift(pack);

      // Prevent unlimited localStorage growth.
      savedPacks = savedPacks.slice(0, 50);

      localStorage.setItem(
        "growpilot_saved_packs",
        JSON.stringify(savedPacks)
      );

      setStatus("Marketing pack created successfully.");

      // Open the results page.
      window.location.href = "/HTML/results.html";

    } catch (error) {
      console.error("GrowPilot AI generation error:", error);

      setStatus(
        error?.message ||
        "Something went wrong while generating your marketing pack.",
        "error"
      );

      setLoading(false);
    }
  });
})();