// GrowPilot AI v0.3
// Results renderer + Save Pack

(() => {
  const resultsRoot = document.getElementById("results");
  const title = document.getElementById("title");
  const summary = document.getElementById("summary");
  const saveButton = document.getElementById("save");

  if (!resultsRoot) {
    console.error("GrowPilot AI: results container not found.");
    return;
  }

  let pack = null;

  try {
    pack = JSON.parse(
      localStorage.getItem("growpilot_latest_pack") || "null"
    );
  } catch (error) {
    console.error("Could not read saved marketing pack:", error);
  }


  // Escape HTML so generated AI text cannot inject HTML.
  function esc(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
    );
  }


  // Convert text into a safe copy-button attribute.
  function encodeText(value) {
    return encodeURIComponent(String(value ?? ""));
  }


  function decodeText(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value || "";
    }
  }


  // Empty state.
  if (
    !pack ||
    !pack.input ||
    !pack.result
  ) {
    if (title) {
      title.textContent = "No Marketing Pack";
    }

    if (summary) {
      summary.textContent =
        "Create a marketing pack first.";
    }

    resultsRoot.innerHTML = `
      <div class="empty">
        <p>No marketing pack is available yet.</p>
        <a href="/HTML/create.html" class="btn primary">
          Create a Pack →
        </a>
      </div>
    `;

    if (saveButton) {
      saveButton.disabled = true;
    }

    return;
  }


  const input = pack.input;
  const output = pack.result;


  if (title) {
    title.textContent =
      `${input.business || "Business"} Marketing Pack`;
  }


  if (summary) {
    summary.textContent =
      `${input.product || ""} · ` +
      `${input.platform || ""} · ` +
      `${input.goal || ""}`;
  }


  const contentIdeas = Array.isArray(output.content_ideas)
    ? output.content_ideas
    : [];

  const hashtags = Array.isArray(output.hashtags)
    ? output.hashtags
    : [];


  const items = [
    ["Headline", output.headline],
    ["Primary Ad", output.primary_ad],
    ["CTA", output.cta],
    ["WhatsApp Message", output.whatsapp_message],
    ["WhatsApp Status", output.whatsapp_status],
    ["TikTok Hook", output.tiktok_hook],
    ["Product Description", output.product_description],
    [
      "Content Ideas",
      contentIdeas
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")
    ],
    [
      "Hashtags",
      hashtags.join(" ")
    ]
  ];


  resultsRoot.innerHTML = items
    .map(([heading, text]) => {
      const safeText = String(text ?? "");

      return `
        <article class="result-card">
          <h2>${esc(heading)}</h2>

          <div class="result-text">
            ${esc(safeText)}
          </div>

          <button
            type="button"
            class="copy"
            data-text="${encodeText(safeText)}"
          >
            Copy
          </button>
        </article>
      `;
    })
    .join("");


  // Copy buttons.
  document.querySelectorAll(".copy").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = decodeText(
        button.getAttribute("data-text")
      );

      try {
        await navigator.clipboard.writeText(text);

        const original = button.textContent;

        button.textContent = "Copied ✓";

        setTimeout(() => {
          button.textContent = original || "Copy";
        }, 1200);

      } catch (error) {
        console.error("Copy failed:", error);

        button.textContent = "Copy failed";

        setTimeout(() => {
          button.textContent = "Copy";
        }, 1200);
      }
    });
  });


  // Check whether this pack is already saved.
  function getSavedPacks() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("growpilot_saved_packs") || "[]"
      );

      return Array.isArray(saved) ? saved : [];

    } catch {
      return [];
    }
  }


  function updateSaveButton() {
    if (!saveButton) return;

    const savedPacks = getSavedPacks();

    const alreadySaved = savedPacks.some(
      (savedPack) =>
        String(savedPack.id) === String(pack.id)
    );

    if (alreadySaved) {
      saveButton.textContent = "Saved ✓";
      saveButton.disabled = true;
    } else {
      saveButton.textContent = "Save Pack";
      saveButton.disabled = false;
    }
  }


  // Explicit Save Pack button.
  if (saveButton) {
    updateSaveButton();

    saveButton.addEventListener("click", () => {
      let savedPacks = getSavedPacks();

      const alreadySaved = savedPacks.some(
        (savedPack) =>
          String(savedPack.id) === String(pack.id)
      );

      if (alreadySaved) {
        updateSaveButton();
        return;
      }

      savedPacks.unshift(pack);

      // Keep maximum of 50 packs.
      savedPacks = savedPacks.slice(0, 50);

      localStorage.setItem(
        "growpilot_saved_packs",
        JSON.stringify(savedPacks)
      );

      saveButton.textContent = "Saved ✓";
      saveButton.disabled = true;
    });
  }

})();