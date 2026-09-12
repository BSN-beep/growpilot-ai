// GrowPilot AI — v0.3
// Marketing Pack Generator

const form = document.getElementById("createForm");
const statusEl = document.getElementById("status");

const API_BASE_URL =
  window.GROWPILOT_CONFIG?.API_BASE_URL ||
  window.location.origin;

function setStatus(message, error = false) {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.style.color = error ? "#ff7b7b" : "#6ee7b7";
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setButtonLoading(button, loading) {
  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Generating...";
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || "Generate";
  }
}

function saveResult(data, input) {
  const pack = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    input,
    result: data
  };

  localStorage.setItem(
    "growpilot_latest_pack",
    JSON.stringify(pack)
  );

  return pack;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button[type='submit']");

    const input = {
      business: getValue("business"),
      product: getValue("product"),
      audience: getValue("audience"),
      platform: getValue("platform"),
      goal: getValue("goal"),
      tone: getValue("tone"),
      location: getValue("location"),
      price: getValue("price")
    };

    // ----------------------------------------
    // Validate required fields
    // ----------------------------------------

    const required = [
      "business",
      "product",
      "audience",
      "platform",
      "goal",
      "tone"
    ];

    const missing = required.find(
      (field) => !input[field]
    );

    if (missing) {
      setStatus(
        `Please complete the ${missing} field.`,
        true
      );
      return;
    }

    // ----------------------------------------
    // Start generation
    // ----------------------------------------

    setButtonLoading(button, true);
    setStatus("GrowPilot AI is creating your marketing pack...");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        }
      );

      let payload;

      try {
        payload = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          `Generation failed (${response.status}).`
        );
      }

      if (!payload?.success || !payload?.data) {
        throw new Error(
          payload?.error ||
          "The AI did not return a valid marketing pack."
        );
      }

      // --------------------------------------
      // Save generated pack
      // --------------------------------------

      const pack = saveResult(
        payload.data,
        input
      );

      // --------------------------------------
      // Also keep a history of generated packs
      // --------------------------------------

      const historyKey =
        "growpilot_saved_packs";

      let history = [];

      try {
        history =
          JSON.parse(
            localStorage.getItem(historyKey)
          ) || [];
      } catch {
        history = [];
      }

      history.unshift(pack);

      // Keep the most recent 20 packs locally
      history = history.slice(0, 20);

      localStorage.setItem(
        historyKey,
        JSON.stringify(history)
      );

      setStatus("Marketing pack created successfully!");

      // --------------------------------------
      // Go to results
      // --------------------------------------

      window.location.href =
        "/HTML/results.html";

    } catch (error) {
      console.error(
        "GrowPilot generation error:",
        error
      );

      setStatus(
        error?.message ||
        "Something went wrong. Please try again.",
        true
      );

      setButtonLoading(button, false);
    }
  });
}