// GrowPilot AI — v0.3
// Marketing Pack Results

const root = document.getElementById("results");
const titleEl = document.getElementById("title");
const summaryEl = document.getElementById("summary");
const saveButton = document.getElementById("save");

const LATEST_KEY = "growpilot_latest_pack";
const SAVED_KEY = "growpilot_saved_packs";

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
  );
}

function getLatestPack() {
  try {
    const raw = localStorage.getItem(LATEST_KEY);

    if (!raw) return null;

    const pack = JSON.parse(raw);

    if (!pack || !pack.input || !pack.result) {
      return null;
    }

    return pack;
  } catch (error) {
    console.error(
      "Unable to read latest marketing pack:",
      error
    );

    return null;
  }
}

function getSavedPacks() {
  try {
    const raw =
      localStorage.getItem(SAVED_KEY);

    if (!raw) return [];

    const packs = JSON.parse(raw);

    return Array.isArray(packs)
      ? packs
      : [];
  } catch (error) {
    console.error(
      "Unable to read saved packs:",
      error
    );

    return [];
  }
}

function setSavedPacks(packs) {
  localStorage.setItem(
    SAVED_KEY,
    JSON.stringify(packs)
  );
}

function showEmptyState() {
  if (titleEl) {
    titleEl.textContent =
      "No marketing pack yet";
  }

  if (summaryEl) {
    summaryEl.textContent =
      "Create a marketing pack first.";
  }

  if (root) {
    root.innerHTML = `
      <div class="empty">
        <p>Your generated marketing pack will appear here.</p>
        <a href="/HTML/create.html">
          Create a pack →
        </a>
      </div>
    `;
  }

  if (saveButton) {
    saveButton.disabled = true;
  }
}

function renderResult(pack) {
  const input = pack.input;
  const output = pack.result;

  if (titleEl) {
    titleEl.textContent =
      `${input.business} Marketing Pack`;
  }

  if (summaryEl) {
    summaryEl.textContent =
      `${input.product} · ${input.platform} · ${input.goal}`;
  }

  const contentIdeas =
    Array.isArray(output.content_ideas)
      ? output.content_ideas
          .map(
            (item, index) =>
              `${index + 1}. ${item}`
          )
          .join("\n")
      : "";

  const hashtags =
    Array.isArray(output.hashtags)
      ? output.hashtags.join(" ")
      : "";

  const items = [
    ["Headline", output.headline],
    ["Primary Ad", output.primary_ad],
    ["CTA", output.cta],
    [
      "WhatsApp Message",
      output.whatsapp_message
    ],
    [
      "WhatsApp Status",
      output.whatsapp_status
    ],
    [
      "TikTok Hook",
      output.tiktok_hook
    ],
    [
      "Product Description",
      output.product_description
    ],
    ["Content Ideas", contentIdeas],
    ["Hashtags", hashtags]
  ];

  if (!root) return;

  root.innerHTML = items
    .map(([heading, text]) => {
      const safeText =
        String(text || "");

      return `
        <article class="result-card">
          <h2>${escapeHTML(heading)}</h2>

          <div class="result-text">
            ${escapeHTML(safeText)}
          </div>

          <button
            class="copy"
            type="button"
            data-copy="${encodeURIComponent(
              safeText
            )}"
          >
            Copy
          </button>
        </article>
      `;
    })
    .join("");

  attachCopyButtons();
}

function attachCopyButtons() {
  document
    .querySelectorAll(".copy")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const text = decodeURIComponent(
            button.dataset.copy || ""
          );

          try {
            await navigator.clipboard.writeText(
              text
            );

            const original =
              button.textContent;

            button.textContent =
              "Copied ✓";

            setTimeout(() => {
              button.textContent =
                original;
            }, 1200);

          } catch (error) {
            console.error(
              "Copy failed:",
              error
            );

            button.textContent =
              "Copy failed";

            setTimeout(() => {
              button.textContent =
                "Copy";
            }, 1200);
          }
        }
      );
    });
}

function saveCurrentPack(pack) {
  const existing =
    getSavedPacks();

  const alreadySaved =
    existing.some(
      (item) =>
        item.id === pack.id
    );

  if (alreadySaved) {
    return false;
  }

  existing.unshift(pack);

  // Keep latest 50 saved packs.
  const limited =
    existing.slice(0, 50);

  setSavedPacks(limited);

  return true;
}

function updateSaveButton(pack) {
  if (!saveButton) return;

  const saved =
    getSavedPacks().some(
      (item) =>
        item.id === pack.id
    );

  if (saved) {
    saveButton.textContent =
      "Saved ✓";
    saveButton.disabled = true;
  } else {
    saveButton.textContent =
      "Save Pack";
    saveButton.disabled = false;
  }
}

const pack = getLatestPack();

if (!pack) {
  showEmptyState();
} else {
  renderResult(pack);
  updateSaveButton(pack);

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      () => {
        const saved =
          saveCurrentPack(pack);

        if (saved) {
          saveButton.textContent =
            "Saved ✓";
          saveButton.disabled =
            true;
        }
      }
    );
  }
}