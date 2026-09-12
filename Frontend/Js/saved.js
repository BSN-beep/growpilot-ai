// GrowPilot AI — v0.3
// Saved Marketing Packs

const SAVED_KEY = "growpilot_saved_packs";
const list = document.getElementById("savedList");

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
      "Unable to load saved packs:",
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

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function getPreview(pack) {
  const result = pack?.result || {};

  return (
    result.primary_ad ||
    result.product_description ||
    result.headline ||
    "Marketing pack"
  );
}

function render() {
  if (!list) return;

  const packs =
    getSavedPacks();

  if (!packs.length) {
    list.innerHTML = `
      <div class="empty">
        <p>You don't have any saved marketing packs yet.</p>
        <a href="/HTML/create.html">
          Create your first pack →
        </a>
      </div>
    `;

    return;
  }

  list.innerHTML = packs
    .map((pack, index) => {
      const input =
        pack.input || {};

      const result =
        pack.result || {};

      const business =
        input.business ||
        "Untitled business";

      const product =
        input.product ||
        "Marketing pack";

      const platform =
        input.platform ||
        "General";

      const preview =
        getPreview(pack);

      const date =
        formatDate(
          pack.createdAt
        );

      return `
        <article
          class="result-card"
          data-pack-index="${index}"
        >
          <h2>
            ${escapeHTML(business)}
          </h2>

          <p>
            ${escapeHTML(product)}
            ·
            ${escapeHTML(platform)}
          </p>

          ${
            date
              ? `<p class="status">
                  ${escapeHTML(date)}
                </p>`
              : ""
          }

          <div class="result-text">
            ${escapeHTML(preview)}
          </div>

          <div class="actions">

            <button
              class="copy"
              type="button"
              data-copy="${encodeURIComponent(
                preview
              )}"
            >
              Copy Preview
            </button>

            <button
              class="copy"
              type="button"
              data-view="${index}"
            >
              View
            </button>

            <button
              class="copy"
              type="button"
              data-delete="${index}"
            >
              Delete
            </button>

          </div>
        </article>
      `;
    })
    .join("");

  attachActions();
}

function attachActions() {
  // ----------------------------------------
  // Copy buttons
  // ----------------------------------------

  document
    .querySelectorAll("[data-copy]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const text =
            decodeURIComponent(
              button.dataset.copy ||
              ""
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
                "Copy Preview";
            }, 1200);
          }
        }
      );
    });

  // ----------------------------------------
  // View buttons
  // ----------------------------------------

  document
    .querySelectorAll("[data-view]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.view
            );

          const packs =
            getSavedPacks();

          const pack =
            packs[index];

          if (!pack) return;

          localStorage.setItem(
            "growpilot_latest_pack",
            JSON.stringify(pack)
          );

          window.location.href =
            "/HTML/results.html";
        }
      );
    });

  // ----------------------------------------
  // Delete buttons
  // ----------------------------------------

  document
    .querySelectorAll("[data-delete]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.delete
            );

          const packs =
            getSavedPacks();

          if (!packs[index]) return;

          const confirmed =
            window.confirm(
              "Delete this marketing pack?"
            );

          if (!confirmed) return;

          packs.splice(index, 1);

          setSavedPacks(packs);

          render();
        }
      );
    });
}

render();