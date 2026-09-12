// GrowPilot AI — V0.2
// Cloudflare Worker + Workers AI

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response("", {
        headers: cors
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/generate" || request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    try {
      const d = await request.json();

      const required = [
        "business",
        "product",
        "audience",
        "platform",
        "goal",
        "tone"
      ];

      for (const key of required) {
        if (!d[key]) {
          return json({
            error: `Missing ${key}`
          }, 400);
        }
      }

      const prompt = `
You are GrowPilot AI, an expert Nigerian small-business marketing assistant.

Create a useful marketing pack for this business.

Business:
${d.business}

Product or service:
${d.product}

Target customer:
${d.audience}

Location:
${d.location || "Nigeria"}

Price:
${d.price || "not provided"}

Platform:
${d.platform}

Marketing goal:
${d.goal}

Tone:
${d.tone}

Return ONLY valid JSON.

Use exactly these keys:

{
  "headline": "string",
  "primary_ad": "string",
  "cta": "string",
  "whatsapp_message": "string",
  "whatsapp_status": "string",
  "tiktok_hook": "string",
  "product_description": "string",
  "content_ideas": ["10 strings"],
  "hashtags": ["8 strings"]
}

Keep claims realistic.

Do not invent:
- testimonials
- certifications
- guarantees
- discounts
- statistics
- business achievements
- facts that were not provided.

Make the content practical for a Nigerian small business.
`;

      const result = await env.AI.run(
        env.AI_MODEL || "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8
        }
      );

      let text = result?.response;

      if (!text) {
        return json({
          error: "AI returned an empty response"
        }, 502);
      }

      // Some models may wrap JSON in markdown fences.
      text = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let output;

      try {
        output = JSON.parse(text);
      } catch {
        return json({
          error: "AI did not return valid JSON",
          raw: text.slice(0, 2000)
        }, 502);
      }

      return json(output, 200);

    } catch (error) {

      return json({
        error: error?.message || "Server error"
      }, 500);

    }
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json"
      }
    }
  );
}