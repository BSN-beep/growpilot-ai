// GrowPilot AI — v0.3
// Cloudflare Worker + Workers AI + Static Frontend

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export default {
  async fetch(request, env) {

    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response("", {
        headers: cors
      });
    }

    /*
     * ==========================================
     * FRONTEND ASSETS
     * ==========================================
     */

    // Root path → index.html
    if (pathname === "/" && request.method === "GET") {
      try {
        return await env.ASSETS.fetch(
          new Request(
            new URL("/HTML/index.html", "https://assets"),
            request
          )
        );
      } catch (error) {
        console.error("Root asset error:", error);
        return new Response("Not found", { status: 404 });
      }
    }

    // HTML files
    if (request.method === "GET" && pathname.endsWith(".html")) {
      try {
        return await env.ASSETS.fetch(
          new Request(
            new URL(pathname, "https://assets"),
            request
          )
        );
      } catch (error) {
        console.error(`HTML asset error for ${pathname}:`, error);
        return new Response("Not found", { status: 404 });
      }
    }

    // CSS files
    if (request.method === "GET" && (pathname.startsWith("/CSS/") || pathname.startsWith("/css/"))) {
      const normalizedPath = pathname.startsWith("/css/")
        ? "/CSS/" + pathname.slice(5)
        : pathname;

      try {
        const response = await env.ASSETS.fetch(
          new Request(
            new URL(normalizedPath, "https://assets"),
            request
          )
        );

        const headers = new Headers(response.headers);
        headers.set("Content-Type", "text/css; charset=utf-8");

        return new Response(response.body, {
          status: response.status,
          headers: headers
        });
      } catch (error) {
        console.error(`CSS asset error for ${normalizedPath}:`, error);
        return new Response("Not found", { status: 404 });
      }
    }

    // JavaScript files
    if (request.method === "GET" && (pathname.startsWith("/Js/") || pathname.startsWith("/js/"))) {
      const normalizedPath = pathname.startsWith("/js/")
        ? "/Js/" + pathname.slice(4)
        : pathname;

      try {
        const response = await env.ASSETS.fetch(
          new Request(
            new URL(normalizedPath, "https://assets"),
            request
          )
        );

        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/javascript; charset=utf-8");

        return new Response(response.body, {
          status: response.status,
          headers: headers
        });
      } catch (error) {
        console.error(`JS asset error for ${normalizedPath}:`, error);
        return new Response("Not found", { status: 404 });
      }
    }

    /*
     * ==========================================
     * AI API
     * ==========================================
     */

    if (pathname === "/api/generate" && request.method === "POST") {
      try {

        const d = await request.json();

        const required = ["business", "product", "audience", "platform", "goal", "tone"];

        for (const key of required) {
          if (!d[key] || String(d[key]).trim() === "") {
            return json({ error: `Missing required field: ${key}` }, 400);
          }
        }

        const prompt = `You are GrowPilot AI, an expert Nigerian small-business marketing assistant.

Create a useful marketing pack for this business.

Business: ${d.business}
Product or service: ${d.product}
Target customer: ${d.audience}
Location: ${d.location || "Nigeria"}
Price: ${d.price || "not provided"}
Platform: ${d.platform}
Marketing goal: ${d.goal}
Tone: ${d.tone}

Return ONLY valid JSON with exactly these keys:

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

Keep claims realistic. Do not invent testimonials, certifications, guarantees, discounts, statistics, or facts not provided.

Make the content practical and specific to a Nigerian small business.`;

        const result = await env.AI.run(
          env.AI_MODEL || "@cf/zai-org/glm-4.7-flash",
          {
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8
          }
        );

        let text = result?.response;

        if (!text) {
          return json({ error: "AI returned an empty response" }, 502);
        }

        text = text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        let output;

        try {
          output = JSON.parse(text);
        } catch (parseError) {
          return json({ error: "AI did not return valid JSON" }, 502);
        }

        if (!output.headline || !output.primary_ad || !output.cta) {
          return json({ error: "AI response missing required fields" }, 502);
        }

        return json({ success: true, data: output }, 200);

      } catch (error) {
        console.error("API error:", error);
        return json({ error: error?.message || "Server error" }, 500);
      }
    }

    /*
     * ==========================================
     * FALLBACK
     * ==========================================
     */

    return json({ error: "Not found" }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
