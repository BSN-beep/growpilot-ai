// GrowPilot AI — V0.3
// Cloudflare Worker + Workers AI + Static Frontend

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json"
};

const REQUIRED_FIELDS = [
  "business",
  "product",
  "audience",
  "platform",
  "goal",
  "tone"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------------------------------
    // CORS PREFLIGHT
    // ------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // ------------------------------------------
    // API
    // ------------------------------------------

    if (
      url.pathname === "/api/generate" &&
      request.method === "POST"
    ) {
      return handleGenerate(request, env);
    }

    // ------------------------------------------
    // HOMEPAGE
    // ------------------------------------------

    if (
      url.pathname === "/" &&
      request.method === "GET"
    ) {
      return env.ASSETS.fetch(
        new Request(
          new URL("/HTML/index.html", request.url),
          request
        )
      );
    }

    // ------------------------------------------
    // STATIC FRONTEND
    // ------------------------------------------

    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }

    // ------------------------------------------
    // METHOD NOT ALLOWED
    // ------------------------------------------

    return json(
      {
        error: "Method not allowed"
      },
      405
    );
  }
};


// ==========================================
// AI GENERATION
// ==========================================

async function handleGenerate(request, env) {
  try {
    let data;

    try {
      data = await request.json();
    } catch {
      return json(
        {
          error: "Invalid JSON request body"
        },
        400
      );
    }

    // ----------------------------------------
    // Validate required fields
    // ----------------------------------------

    for (const field of REQUIRED_FIELDS) {
      if (
        !data[field] ||
        typeof data[field] !== "string" ||
        !data[field].trim()
      ) {
        return json(
          {
            error: `Missing or invalid field: ${field}`
          },
          400
        );
      }
    }

    // ----------------------------------------
    // Normalize values
    // ----------------------------------------

    const business = clean(data.business);
    const product = clean(data.product);
    const audience = clean(data.audience);
    const platform = clean(data.platform);
    const goal = clean(data.goal);
    const tone = clean(data.tone);

    const location = clean(
      data.location || "Nigeria"
    );

    const price = clean(
      data.price || "Not provided"
    );

    // ----------------------------------------
    // Protect the AI prompt from excessive input
    // ----------------------------------------

    const fields = {
      business,
      product,
      audience,
      platform,
      goal,
      tone,
      location,
      price
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value.length > 2000) {
        return json(
          {
            error: `${key} is too long. Please keep it under 2000 characters.`
          },
          400
        );
      }
    }

    // ----------------------------------------
    // GrowPilot AI prompt
    // ----------------------------------------

    const prompt = `
You are GrowPilot AI, an expert marketing assistant
for small businesses, especially businesses operating
in Nigeria.

Create a practical marketing pack using ONLY the
information supplied by the user.

BUSINESS:
${business}

PRODUCT OR SERVICE:
${product}

TARGET CUSTOMER:
${audience}

LOCATION:
${location}

PRICE:
${price}

PLATFORM:
${platform}

MARKETING GOAL:
${goal}

TONE:
${tone}

Return ONLY valid JSON.

Use exactly this structure:

{
  "headline": "string",
  "primary_ad": "string",
  "cta": "string",
  "whatsapp_message": "string",
  "whatsapp_status": "string",
  "tiktok_hook": "string",
  "product_description": "string",
  "content_ideas": [
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string"
  ],
  "hashtags": [
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string",
    "string"
  ]
}

Rules:

1. Make the marketing content useful and specific.
2. Keep claims realistic.
3. Do not invent testimonials.
4. Do not invent certifications.
5. Do not invent guarantees.
6. Do not invent discounts.
7. Do not invent statistics.
8. Do not invent business achievements.
9. Do not invent facts that were not provided.
10. Do not claim that a product is the cheapest,
    best, number one, or guaranteed to work unless
    the user explicitly provided that information.
11. Make the content suitable for the selected platform.
12. Make the content practical for a Nigerian audience
    when appropriate.
13. Return JSON only.
`;

    // ----------------------------------------
    // Run Workers AI
    // ----------------------------------------

    const model =
      env.AI_MODEL ||
      "@cf/zai-org/glm-4.7-flash";

    const result = await env.AI.run(
      model,
      {
        messages: [
          {
            role: "system",
            content:
              "You are GrowPilot AI. Return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      }
    );

    let text = result?.response;

    if (!text) {
      return json(
        {
          error: "AI returned an empty response."
        },
        502
      );
    }

    // ----------------------------------------
    // Remove Markdown JSON fences if AI adds them
    // ----------------------------------------

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // ----------------------------------------
    // Parse JSON
    // ----------------------------------------

    let output;

    try {
      output = JSON.parse(text);
    } catch {
      return json(
        {
          error: "AI returned invalid JSON.",
          raw: text.slice(0, 2000)
        },
        502
      );
    }

    // ----------------------------------------
    // Validate AI output
    // ----------------------------------------

    const expectedKeys = [
      "headline",
      "primary_ad",
      "cta",
      "whatsapp_message",
      "whatsapp_status",
      "tiktok_hook",
      "product_description",
      "content_ideas",
      "hashtags"
    ];

    for (const key of expectedKeys) {
      if (!(key in output)) {
        return json(
          {
            error: `AI response is missing: ${key}`
          },
          502
        );
      }
    }

    if (!Array.isArray(output.content_ideas)) {
      output.content_ideas = [];
    }

    if (!Array.isArray(output.hashtags)) {
      output.hashtags = [];
    }

    // ----------------------------------------
    // Return successful response
    // ----------------------------------------

    return json(
      {
        success: true,
        data: output
      },
      200
    );

  } catch (error) {
    console.error(
      "GrowPilot AI error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Unexpected server error."
      },
      500
    );
  }
}


// ==========================================
// HELPERS
// ==========================================

function clean(value) {
  return String(value)
    .trim()
    .replace(/\u0000/g, "");
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: CORS_HEADERS
    }
  );
}