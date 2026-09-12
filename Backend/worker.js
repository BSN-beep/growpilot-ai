// GrowPilot AI v0.3
// Cloudflare Worker + Workers AI

const REQUIRED_FIELDS = [
  "business",
  "product",
  "audience",
  "platform",
  "goal",
  "tone"
];

const MAX_FIELD_LENGTH = 2000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // AI generation endpoint
    if (
      url.pathname === "/api/generate" &&
      request.method === "POST"
    ) {
      return handleGenerate(request, env);
    }

    // Homepage
    if (
      url.pathname === "/" &&
      request.method === "GET"
    ) {
      const assetURL = new URL(request.url);
      assetURL.pathname = "/HTML/index.html";

      return env.ASSETS.fetch(
        new Request(assetURL, request)
      );
    }

    // Let Cloudflare Assets serve all frontend files.
    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }

    return json(
      {
        success: false,
        error: "Method not allowed."
      },
      405
    );
  }
};


async function handleGenerate(request, env) {
  let input;

  // Read JSON request
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


  // Validate required fields
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


  // Clean and limit input
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
  "content_ideas": ["string", "string", "string", "string", "string"],
  "hashtags": ["string", "string", "string", "string", "string", "string"]
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


    let raw = extractAIText(response);

    // Remove accidental markdown code fences.
    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


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


    // Normalize the AI response.
    const normalized = {
      headline: clean(result.headline),
      primary_ad: clean(result.primary_ad),
      cta: clean(result.cta),
      whatsapp_message: clean(result.whatsapp_message),
      whatsapp_status: clean(result.whatsapp_status),
      tiktok_hook: clean(result.tiktok_hook),
      product_description: clean(result.product_description),

      content_ideas: Array.isArray(result.content_ideas)
        ? result.content_ideas
            .map(clean)
            .filter(Boolean)
            .slice(0, 5)
        : [],

      hashtags: Array.isArray(result.hashtags)
        ? result.hashtags
            .map(clean)
            .filter(Boolean)
            .slice(0, 6)
        : []
    };


    return json({
      success: true,
      data: normalized
    });

  } catch (error) {
    console.error("GrowPilot AI error:", error);

    return json(
      {
        success: false,
        error: "AI generation failed. Please try again."
      },
      500
    );
  }
}


/*
 * Extract text from different Workers AI response shapes.
 */
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


/*
 * Clean user/AI text.
 */
function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}


/*
 * JSON response helper.
 */
function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        ...corsHeaders()
      }
    }
  );
}


/*
 * CORS headers.
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}