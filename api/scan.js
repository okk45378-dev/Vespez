export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // Fetch the actual page
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VespezScanner/1.0)" },
      signal: AbortSignal.timeout(10000)
    });
    const html = await pageRes.text();

    // Also try to fetch policy pages
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

    // Send to Claude for analysis
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
        system: `You are a web security and GDPR compliance auditor. Analyze the provided HTML source code. Only report issues you can directly observe in the code. Never guess. Return ONLY valid JSON.`,
        messages: [{
          role: "user",
          content: `Analyze this website: ${url}

MAIN PAGE HTML (first 15000 chars):
${html.substring(0, 15000)}

PRIVACY POLICY: ${privacy ? privacy.substring(0, 5000) : "NOT FOUND"}
TERMS OF SERVICE: ${terms ? terms.substring(0, 3000) : "NOT FOUND"}
COOKIE POLICY: ${cookies ? cookies.substring(0, 3000) : "NOT FOUND"}

Based on the ACTUAL HTML above, check for:
SECURITY: Exposed API keys, hardcoded secrets, insecure patterns
GDPR: Missing privacy policy, missing cookie consent, analytics without consent, forms without disclosure

Only flag issues you can see in the code above. If privacy/terms pages exist, note that they passed.

Return ONLY this JSON:
{"site_name":"string","site_description":"one sentence","confidence":"high|medium|low","confidence_reason":"string","security_score":0-100,"compliance_score":0-100,"findings":[{"severity":"critical|warning|info","category":"security|gdpr","title":"short","description":"specific evidence from the code","fix":"how to fix"}],"passed":["verified good things"]}`
        }]
      })
    });

    const data = await claudeRes.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const result = JSON.parse(jsonMatch[0]);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}