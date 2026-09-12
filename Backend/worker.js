// GrowPilot AI v0.3.1
// Cloudflare Worker + Workers AI
//
// IMPORTANT:
// This version explicitly handles frontend routes so Cloudflare
// does not redirect /HTML/index.html to /HTML/.

// ============================================================
// CONFIG
// ============================================================

const REQUIRED_FIELDS = [
  "business",
  "product",
  "audience",
  "platform",
  "goal",
  "tone"
];

const MAX_FIELD_LENGTH = 2000;


// ============================================================
// WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------------
    // CORS preflight
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }


    // --------------------------------------------------------
    // AI API
    // --------------------------------------------------------

    if (
      url.pathname === "/api/generate" &&
      request.method === "POST"
    ) {
      return handleGenerate(request, env);
    }


    // --------------------------------------------------------
    // FRONTEND
    // --------------------------------------------------------

    if (request.method === "GET") {
      return handleFrontend(request, env);
    }


    // --------------------------------------------------------
    // Unsupported method
    // --------------------------------------------------------

    return json(
      {
        success: false,
        error: "Method not allowed."
      },
      405
    );
  }
};


// ============================================================
// FRONTEND ROUTING
// ============================================================

async function handleFrontend(request, env) {
  const url = new URL(request.url);

  let pathname = url.pathname;


  // ----------------------------------------------------------
  // Root
  // ----------------------------------------------------------

  if (pathname === "/") {
    pathname = "/HTML/index.html";
  }


  // ----------------------------------------------------------
  // Prevent directory-style redirect
  //
  // /HTML/ should always become the actual index file.
  // ----------------------------------------------------------

  if (pathname === "/HTML/" || pathname === "/HTML") {
    pathname = "/HTML/index.html";
  }


  // ----------------------------------------------------------
  // Prevent CSS case mistakes
  // ----------------------------------------------------------

  if (pathname.startsWith("/css/")) {
    pathname =
      "/CSS/" + pathname.slice("/css/".length);
  }


  // ----------------------------------------------------------
  // Prevent JavaScript case mistakes
  // ----------------------------------------------------------

  if (pathname.startsWith("/js/")) {
    pathname =
      "/Js/" + pathname.slice("/js/".length);
  }


  // ----------------------------------------------------------
  // Build asset URL
  // ----------------------------------------------------------

  const assetURL = new URL(request.url);

  assetURL.pathname = pathname;


  // ----------------------------------------------------------
  // Ask Cloudflare Assets for the exact file.
  //
  // We deliberately do NOT request the directory URL.
  // ----------------------------------------------------------

  const assetRequest = new Request(
    assetURL.toString(),
    {
      method: "GET",
      headers: request.headers
    }
  );


  const response = await env.ASSETS.fetch(assetRequest);


  // ----------------------------------------------------------
  // If the asset does not exist, return a clean 404.
  // ----------------------------------------------------------

  if (response.status === 404) {
    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GrowPilot AI — Page Not Found</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 40px 20px;
      text-align: center;
    }

    h1 {
      font-size: 42px;
    }

    a {
      color: #2563eb;
    }
  </style>
</head>
<body>
  <h1>404</h1>
  <p>The page you requested was not found.</p>
  <p>
    <a href="/">Return to GrowPilot AI</a>
  </p>
</body>
</html>`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          ...corsHeaders()
        }
      }
    );
  }


  // ----------------------------------------------------------
  // Return the asset.
  // ----------------------------------------------------------

  const headers = new Headers(response.headers);

  headers.set(
    "Cache-Control",
    "no-cache, no-store, must-revalidate"
  );

  headers.set(
    "Pragma",
    "no-cache"
  );

  headers.set(
    "Expires",
    "0"
  );

  headers.set(
    "X-GrowPilot-Version",
    "v0.3.1"
  );

  return new Response(
    response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers
    }
  );
}


// ============================================================
// AI GENERATION
// ============================================================

async function handleGenerate(request, env) {
  let input;


  // ----------------------------------------------------------
  // Parse JSON
  // ----------------------------------------------------------

  try {
    input = await request.json();
  } catch {
    return json(
      {
        success: false,
        error: "Request body must contain valid JSON."
      },
      400
    );
  }


  // ----------------------------------------------------------
  // Validate object
  // ----------------------------------------------------------

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return json(
      {
        success: false,
        error: "Invalid request data."
      },
      400
    );
  }


  // ----------------------------------------------------------
  // Validate required fields
  // ----------------------------------------------------------

  for (const field of REQUIRED_FIELDS) {
    if (
      typeof input[field] !== "string" ||
      !input[field].trim()
    ) {
      return json(
        {
          success: false,
          error: `Missing required field: ${field}`
        },
        400
      );
    }
  }


  // ----------------------------------------------------------
  // Clean input
  // ----------------------------------------------------------

  const data = {
    business: clean(input.business),
    product: clean(input.product),
    audience: clean(input.audience),
    location: clean(input.location),
    price: clean(input.price),
    platform: clean(input.platform),
    goal: clean(input.goal),
    tone: clean(input.tone)
  };


  // ----------------------------------------------------------
  // AI prompt
  // ----------------------------------------------------------

  const prompt = `
Create a complete marketing pack for the following business.

Business:
${data.business}

Product or Service:
${data.product}

Target Audience:
${data.audience}

Location:
${data.location || "Not specified"}

Price:
${data.price || "Not specified"}

Main Platform:
${data.platform}

Marketing Goal:
${data.goal}

Marketing Tone:
${data.tone}

Return ONLY valid JSON.

The JSON must contain exactly these fields:

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
    "string"
  ],
  "hashtags": [
    "string",
    "string",
    "string",
    "string",
    "string",
    "string"
  ]
}

Rules:

- Make the content persuasive but natural.
- Make the headline attention-grabbing.
- Make the primary ad ready to publish.
- Make the CTA action-oriented.
- Make the WhatsApp message conversational.
- Make the WhatsApp status short and engaging.
- Make the TikTok hook suitable for the first few seconds of a video.
- Make the product description useful for customers.
- Provide exactly 5 content ideas.
- Provide exactly 6 relevant hashtags.
- Do not use markdown.
- Do not wrap the JSON in code fences.
- Do not add explanations outside the JSON.
`;


  // ----------------------------------------------------------
  // Run AI
  // ----------------------------------------------------------

  try {
    const model =
      env.AI_MODEL ||
      "@cf/zai-org/glm-4.7-flash";


    const response = await env.AI.run(
      model,
      {
        messages: [
          {
            role: "system",
            content:
              "You are GrowPilot AI, an expert marketing assistant. Return only valid JSON when JSON is requested."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }
    );


    // --------------------------------------------------------
    // Extract AI text
    // --------------------------------------------------------

    let raw = extractAIText(response);


    // --------------------------------------------------------
    // Remove markdown fences if AI accidentally adds them
    // --------------------------------------------------------

    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


    // --------------------------------------------------------
    // Parse JSON
    // --------------------------------------------------------

    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      return json(
        {
          success: false,
          error: "The AI returned invalid JSON.",
          details: raw.slice(0, 1000)
        },
        502
      );
    }


    // --------------------------------------------------------
    // Normalize result
    // --------------------------------------------------------

    const normalized = {
      headline: clean(result.headline),

      primary_ad: clean(result.primary_ad),

      cta: clean(result.cta),

      whatsapp_message:
        clean(result.whatsapp_message),

      whatsapp_status:
        clean(result.whatsapp_status),

      tiktok_hook:
        clean(result.tiktok_hook),

      product_description:
        clean(result.product_description),

      content_ideas:
        Array.isArray(result.content_ideas)
          ? result.content_ideas
              .map(clean)
              .filter(Boolean)
              .slice(0, 5)
          : [],

      hashtags:
        Array.isArray(result.hashtags)
          ? result.hashtags
              .map(clean)
              .filter(Boolean)
              .slice(0, 6)
          : []
    };


    // --------------------------------------------------------
    // Return successful result
    // --------------------------------------------------------

    return json({
      success: true,
      data: normalized
    });

  } catch (error) {
    console.error(
      "GrowPilot AI generation error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "AI generation failed. Please try again."
      },
      500
    );
  }
}


// ============================================================
// AI RESPONSE EXTRACTION
// ============================================================

function extractAIText(response) {
  if (typeof response === "string") {
    return response;
  }

  if (!response) {
    return "";
  }

  if (typeof response.response === "string") {
    return response.response;
  }

  if (typeof response.result === "string") {
    return response.result;
  }

  if (
    response.result &&
    typeof response.result.response === "string"
  ) {
    return response.result.response;
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  return JSON.stringify(response);
}


// ============================================================
// TEXT CLEANER
// ============================================================

function clean(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}


// ============================================================
// JSON RESPONSE
// ============================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",

        ...corsHeaders()
      }
    }
  );
}


// ============================================================
// CORS
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}