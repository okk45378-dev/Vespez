export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VespezScanner/1.0)" },
      signal: AbortSignal.timeout(10000)
    });
    const html = await pageRes.text();

    const tryFetch = async (path) => {
      try {
        const r = await fetch(new URL(path, url).href, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; VespezScanner/1.0)" },
          signal: AbortSignal.timeout(5000)
        });
        return r.ok ? await r.text() : null;
      } catch { return null; }
    };

    const [privacy, terms, cookies] = await Promise.all([
      tryFetch("/privacy").then(r => r || tryFetch("/privacy-policy")),
      tryFetch("/terms").then(r => r || tryFetch("/terms-of-service")),
      tryFetch("/cookies").then(r => r || tryFetch("/cookie-policy"))
    ]);

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: "You are a web security auditor. You MUST respond with ONLY valid JSON, no markdown, no explanation. Start your response with { and end with }.",
        messages: [{
          role: "user",
          content: `Analyze this website's actual HTML for security and GDPR issues.

URL: ${url}

MAIN PAGE HTML:
${html.substring(0, 15000)}

PRIVACY POLICY PAGE: ${privacy ? "FOUND - " + privacy.substring(0, 3000) : "NOT FOUND"}
TERMS PAGE: ${terms ? "FOUND - " + terms.substring(0, 2000) : "NOT FOUND"}
COOKIE POLICY: ${cookies ? "FOUND - " + cookies.substring(0, 2000) : "NOT FOUND"}

Only flag issues you can see evidence of in the HTML above. If policy pages exist, mark them as passed.

Respond with ONLY this JSON structure:
{"site_name":"name","site_description":"one sentence","confidence":"high","security_score":50,"compliance_score":50,"findings":[],"passed":[]}`
        }]
      })
    });

    const data = await claudeRes.json();
    
    if (data.error) {
      return res.status(500).json({ error: "Claude API error: " + JSON.stringify(data.error) });
    }

    const text = data.content?.map(b => b.text || "").join("") || "";
    
    if (!text) {
      return res.status(500).json({ error: "Empty response from Claude", debug: JSON.stringify(data).substring(0, 500) });
    }

    // Try to find JSON
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const braceStart = cleaned.indexOf("{");
    const braceEnd = cleaned.lastIndexOf("}");
    
    if (braceStart === -1 || braceEnd === -1) {
      return res.status(500).json({ error: "No JSON in response", debug: text.substring(0, 500) });
    }

    const jsonStr = cleaned.substring(braceStart, braceEnd + 1);
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON", debug: jsonStr.substring(0, 500) });
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}