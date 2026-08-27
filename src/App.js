import { useState, useEffect, useRef } from "react";
import { useForm, ValidationError } from '@formspree/react';

const SCANNER_CHECKS = [
  "Fetching page source...",
  "Scanning for exposed API keys...",
  "Checking authentication tokens...",
  "Analyzing third-party scripts...",
  "Reviewing cookie consent...",
  "Checking privacy policy...",
  "Inspecting data collection forms...",
  "Evaluating GDPR compliance...",
  "Generating report..."
];

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  warning: { label: "Warning", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  info: { label: "Info", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  pass: { label: "Passed", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" }
};


function ScoreRing({ score, label, size = 88 }) {
  const clamp = Math.max(0, Math.min(100, score ?? 0));
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (clamp / 100) * circ;
  const color = clamp >= 80 ? "#059669" : clamp >= 60 ? "#D97706" : clamp >= 40 ? "#EA580C" : "#DC2626";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column"
        }}>
          <span style={{
            fontSize: 22, fontWeight: 700, color,
            fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1
          }}>{clamp}</span>
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#64748B",
        fontFamily: "'Inter', sans-serif",
        textTransform: "uppercase", letterSpacing: "0.06em"
      }}>{label}</span>
    </div>
  );
}

function FindingCard({ finding }) {
 const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 8, padding: "16px 20px",
      borderLeft: `4px solid ${config.color}`,
      cursor: "pointer", transition: "box-shadow 0.15s",
    }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.05em", color: config.color,
            background: config.bg, border: `1px solid ${config.border}`,
            padding: "3px 8px", borderRadius: 4,
            fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap"
          }}>{config.label}</span>
          <span style={{
            fontSize: 10, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.05em", color: "#64748B",
            fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap"
          }}>{finding.category === "security" ? "Security" : "Compliance"}</span>
          <span style={{
            fontSize: 15, fontWeight: 500, color: "#0F172A",
            fontFamily: "'Inter', sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>{finding.title}</span>
        </div>
        <span style={{ fontSize: 18, color: "#94A3B8", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 12px", fontFamily: "'Inter', sans-serif" }}>
            {finding.description}
          </p>
          {finding.fix && (
            <div style={{
              background: "#F8FAFC", borderRadius: 6, padding: "12px 16px",
              border: "1px solid #E2E8F0"
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#059669", margin: "0 0 4px", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.03em" }}>How to fix</p>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, margin: 0, fontFamily: "'Inter', sans-serif" }}>{finding.fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PassedItem({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <span style={{ color: "#059669", fontSize: 16, flexShrink: 0 }}>✓</span>
      <span style={{ fontSize: 14, color: "#334155", fontFamily: "'Inter', sans-serif" }}>{text}</span>
    </div>
  );
}

export default function Scanner() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState("landing");
  const [results, setResults] = useState(null);
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [formState, handleFormspreeSubmit] = useForm("mnpqapgy");
  const inputRef = useRef(null);

  const unlocked = formState.succeeded;

  useEffect(() => {
    if (phase !== "scanning") return;
    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev >= SCANNER_CHECKS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 88) { clearInterval(progressInterval); return 88; }
        return prev + (Math.random() * 8 + 2);
      });
    }, 600);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [phase]);

  const normalizeUrl = (input) => {
    let u = input.trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  };

  const handleScan = async () => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    setPhase("scanning");
    setScanStep(0);
    setProgress(0);
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
    const response = await fetch("/api/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: normalized })
});
        method: "POST",
       headers: {
  "Content-Type": "application/json",
  "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `You are a web security and GDPR compliance auditor. You analyze websites for security vulnerabilities and GDPR compliance issues. You MUST respond with ONLY a JSON object. No markdown, no backticks, no explanation before or after. Just the raw JSON.`,
          messages: [{
            role: "user",
            content: `Analyze the website at: ${normalized}

Search for the website and examine its source code, scripts, cookies, and policies.

Check SECURITY:
- Exposed API keys (Supabase, Firebase, Stripe secret, AWS) in frontend
- Hardcoded tokens or secrets
- Insecure configurations

Check GDPR/COMPLIANCE:
- Missing privacy policy
- Missing cookie consent
- Analytics loading without consent (GA, Meta Pixel)
- Forms collecting data without disclosure
- Third-party scripts without notice

Only report what you can observe or reasonably infer. Be specific.

Return ONLY this JSON (no other text):
{"site_name":"string","site_description":"one sentence","security_score":0-100,"compliance_score":0-100,"findings":[{"severity":"critical|warning|info","category":"security|gdpr","title":"short","description":"detail","fix":"how to fix"}],"passed":["good things"]}`
          }]
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Extract text from all content blocks, handling web search responses
      let allText = "";
      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === "text" && block.text) {
            allText += block.text + "\n";
          }
        }
      }

      if (!allText.trim()) {
        throw new Error("Empty response from API");
      }

      // Clean and extract JSON robustly
      let clean = allText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      // Try to find a JSON object with our expected fields
      let parsed = null;
      
      // Method 1: Find JSON starting with { and ending with }
      const braceStart = clean.indexOf("{");
      if (braceStart !== -1) {
        let depth = 0;
        let end = -1;
        for (let i = braceStart; i < clean.length; i++) {
          if (clean[i] === "{") depth++;
          if (clean[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end !== -1) {
          try {
            parsed = JSON.parse(clean.substring(braceStart, end + 1));
          } catch (e) {
            // Try fixing common JSON issues
            let fixable = clean.substring(braceStart, end + 1);
            fixable = fixable.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
            try { parsed = JSON.parse(fixable); } catch (e2) { /* continue */ }
          }
        }
      }

      if (!parsed || !parsed.findings) {
        throw new Error("Could not parse scan results");
      }

      // Ensure required fields exist
      parsed.site_name = parsed.site_name || normalized.replace(/^https?:\/\//, "").replace(/\/$/, "");
      parsed.site_description = parsed.site_description || "Website analysis";
      parsed.security_score = parsed.security_score ?? 50;
      parsed.compliance_score = parsed.compliance_score ?? 50;
      parsed.findings = parsed.findings || [];
      parsed.passed = parsed.passed || [];

      setProgress(100);
      setTimeout(() => {
        setResults(parsed);
        setPhase("results");
      }, 500);
    } catch (err) {
      console.error("Scan error:", err);
      if (err.name === "AbortError") {
        setError("Scan timed out. The website may be too complex — try a simpler page.");
      } else {
        setError(`Scan failed: ${err.message}. Please try again.`);
      }
      setPhase("landing");
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleScan(); };
  const handleReset = () => { setPhase("landing"); setResults(null); setUrl(""); setError(null); };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFBFC", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFBFC; }
        ::selection { background: #2563EB; color: #fff; }
        input:focus { outline: none; }
        @keyframes pulse-line { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fade-up 0.4s ease-out both; }
      `}</style>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #E2E8F0", background: "#fff",
        padding: "0 24px", height: 56, display: "flex",
        alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "#0F172A", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif"
          }}>V</div>
          <span style={{
            fontSize: 16, fontWeight: 600, color: "#0F172A",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.02em"
          }}>Vespez</span>
        </div>
        {phase === "results" && (
          <button onClick={handleReset} style={{
            fontSize: 13, color: "#2563EB", background: "none",
            border: "none", cursor: "pointer", fontWeight: 500,
            fontFamily: "'Inter', sans-serif"
          }}>← New scan</button>
        )}
      </nav>

      {/* Landing */}
      {phase === "landing" && (
        <div style={{
          maxWidth: 640, margin: "0 auto", padding: "80px 24px 40px",
          textAlign: "center"
        }}>
          <h1 style={{
            fontSize: 36, fontWeight: 700, color: "#0F172A",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.03em", lineHeight: 1.15,
            marginBottom: 16
          }}>
            Scan your app.<br />Fix what matters.
          </h1>
          <p style={{
            fontSize: 17, color: "#64748B", lineHeight: 1.6,
            marginBottom: 40, maxWidth: 460, marginLeft: "auto", marginRight: "auto"
          }}>
            Paste your URL below. We'll check for exposed API keys, missing GDPR requirements, and compliance gaps.
          </p>
          <div style={{
            display: "flex", gap: 8, maxWidth: 520,
            margin: "0 auto 16px", flexWrap: "wrap"
          }}>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="yourapp.com"
              style={{
                flex: 1, minWidth: 240, height: 48, padding: "0 16px",
                border: "1px solid #CBD5E1", borderRadius: 8,
                fontSize: 15, color: "#0F172A",
                fontFamily: "'Inter', sans-serif",
                background: "#fff",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#2563EB"}
              onBlur={e => e.target.style.borderColor = "#CBD5E1"}
            />
            <button
              onClick={handleScan}
              disabled={!url.trim()}
              style={{
                height: 48, padding: "0 28px",
                background: url.trim() ? "#0F172A" : "#CBD5E1",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: url.trim() ? "pointer" : "default",
                fontFamily: "'Inter', sans-serif",
                transition: "background 0.15s",
                whiteSpace: "nowrap"
              }}
              onMouseEnter={e => { if (url.trim()) e.target.style.background = "#1E293B"; }}
              onMouseLeave={e => { if (url.trim()) e.target.style.background = "#0F172A"; }}
            >
              Scan now
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 13, color: "#DC2626", marginTop: 8 }}>{error}</p>
          )}
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Free scan. No account required.
          </p>

          {/* What we check */}
          <div style={{
            marginTop: 72, textAlign: "left",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 20
          }}>
            <div>
              <h3 style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#94A3B8",
                marginBottom: 16, fontFamily: "'Inter', sans-serif"
              }}>Security</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Exposed API keys", "Hardcoded secrets", "Insecure configurations", "Authentication tokens"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#CBD5E1", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#334155" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#94A3B8",
                marginBottom: 16, fontFamily: "'Inter', sans-serif"
              }}>Compliance</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Privacy policy", "Cookie consent", "Analytics without consent", "Data collection disclosure"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#CBD5E1", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#334155" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanning */}
      {phase === "scanning" && (
        <div style={{
          maxWidth: 480, margin: "0 auto", padding: "120px 24px",
          textAlign: "center"
        }}>
          <p style={{
            fontSize: 14, fontWeight: 500, color: "#0F172A",
            fontFamily: "'Inter', sans-serif", marginBottom: 8
          }}>
            Scanning {normalizeUrl(url).replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </p>
          {/* Progress bar */}
          <div style={{
            width: "100%", height: 3, background: "#E2E8F0",
            borderRadius: 2, marginBottom: 32, overflow: "hidden"
          }}>
            <div style={{
              height: "100%", background: "#0F172A",
              borderRadius: 2, transition: "width 0.4s ease",
              width: `${Math.min(progress, 100)}%`
            }} />
          </div>
          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
            {SCANNER_CHECKS.map((check, i) => (
              <div key={i} className={i <= scanStep ? "fade-up" : ""} style={{
                display: "flex", alignItems: "center", gap: 10,
                opacity: i > scanStep ? 0 : 1,
                transition: "opacity 0.3s"
              }}>
                <span style={{
                  fontSize: 13, color: i < scanStep ? "#059669" : i === scanStep ? "#0F172A" : "#94A3B8",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: i === scanStep ? 500 : 400,
                }}>
                  {i < scanStep ? "✓" : i === scanStep ? "→" : "·"} {check}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {phase === "results" && results && (
        <div style={{
          maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px"
        }}>
          {/* Preview badge */}
          <div className="fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            borderRadius: 20, padding: "5px 14px", marginBottom: 20
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }} />
            <span style={{
              fontSize: 12, fontWeight: 600, color: "#2563EB",
              fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em"
            }}>Preview report</span>
          </div>

          {/* Header */}
          <div className="fade-up" style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 12, padding: "28px 32px",
            marginBottom: 28
          }}>
            {/* Site name + description */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontSize: 22, fontWeight: 700, color: "#0F172A",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.02em", marginBottom: 4
              }}>{results.site_name || normalizeUrl(url).replace(/^https?:\/\//, '').replace(/\/$/, '')}</h2>
              <p style={{
                fontSize: 14, color: "#64748B", lineHeight: 1.5,
                fontFamily: "'Inter', sans-serif"
              }}>{results.site_description}</p>
            </div>

            {/* Two score rings */}
            <div style={{
              display: "flex", gap: 32, justifyContent: "center",
              padding: "20px 0", borderTop: "1px solid #F1F5F9",
              borderBottom: "1px solid #F1F5F9", marginBottom: 20
            }}>
              <ScoreRing score={results.security_score} label="Security" />
              <ScoreRing score={results.compliance_score} label="Compliance" />
            </div>

            {/* Issue counts */}
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              {results.findings?.filter(f => f.severity === "critical").length > 0 && (
                <span style={{ fontSize: 13, color: "#DC2626", fontWeight: 600 }}>
                  {results.findings.filter(f => f.severity === "critical").length} critical
                </span>
              )}
              {results.findings?.filter(f => f.severity === "warning").length > 0 && (
                <span style={{ fontSize: 13, color: "#D97706", fontWeight: 600 }}>
                  {results.findings.filter(f => f.severity === "warning").length} warning{results.findings.filter(f => f.severity === "warning").length > 1 ? "s" : ""}
                </span>
              )}
              {results.passed?.length > 0 && (
                <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                  {results.passed.length} passed
                </span>
              )}
            </div>
          </div>

          {/* First 2 findings - visible */}
          {results.findings?.length > 0 && (
            <div className="fade-up" style={{ marginBottom: 0 }}>
              <h3 style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#94A3B8",
                marginBottom: 12, fontFamily: "'Inter', sans-serif",
                paddingLeft: 4
              }}>Issues found</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.findings
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                  })
                  .slice(0, 2)
                  .map((finding, i) => (
                    <FindingCard key={i} finding={finding} />
                  ))}
              </div>
            </div>
          )}

          {/* Locked section */}
          {!unlocked && (results.findings?.length > 2 || results.passed?.length > 0) && (
            <div className="fade-up" style={{ position: "relative", marginTop: 8 }}>
              {/* Blurred preview of remaining findings */}
              <div style={{
                filter: "blur(5px)", opacity: 0.4,
                pointerEvents: "none", userSelect: "none",
                maxHeight: 140, overflow: "hidden"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {results.findings
                    .sort((a, b) => {
                      const order = { critical: 0, warning: 1, info: 2 };
                      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                    })
                    .slice(2, 5)
                    .map((finding, i) => (
                      <FindingCard key={`blur-${i}`} finding={finding} />
                    ))}
                </div>
              </div>

              {/* Product teaser + email gate */}
              <div style={{
                position: "relative", marginTop: -60,
                background: "linear-gradient(to bottom, rgba(250,251,252,0) 0%, rgba(250,251,252,1) 25%)",
                paddingTop: 40
              }}>
                <div style={{
                  background: "#fff", border: "1px solid #E2E8F0",
                  borderRadius: 12, padding: "36px 32px",
                  textAlign: "center"
                }}>
                  {/* Preview label */}
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: "#2563EB",
                    fontFamily: "'Inter', sans-serif",
                    marginBottom: 8, letterSpacing: "0.01em"
                  }}>
                    {(() => {
                      const remaining = (results.findings?.length || 0) - 2;
                      if (remaining > 0) return `+ ${remaining} more issue${remaining > 1 ? "s" : ""} found`;
                      return "Full report ready";
                    })()}
                  </p>

                  <h3 style={{
                    fontSize: 22, fontWeight: 700, color: "#0F172A",
                    fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: "-0.02em", marginBottom: 6,
                    lineHeight: 1.25
                  }}>This was a one-time scan.<br/>The full product never stops watching.</h3>

                  <p style={{
                    fontSize: 14, color: "#64748B", lineHeight: 1.6,
                    marginBottom: 28, maxWidth: 440, marginLeft: "auto", marginRight: "auto"
                  }}>
                    What you just saw is a preview. Here's what the full version does:
                  </p>

                  {/* Three feature teasers */}
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 16,
                    maxWidth: 400, margin: "0 auto 32px",
                    textAlign: "left"
                  }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "#F1F5F9", border: "1px solid #E2E8F0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: "#0F172A",
                          fontFamily: "'Inter', sans-serif", marginBottom: 2
                        }}>Continuous monitoring</p>
                        <p style={{
                          fontSize: 13, color: "#64748B", lineHeight: 1.5
                        }}>Re-scans your app on every deploy. Get alerted the moment something breaks.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "#F1F5F9", border: "1px solid #E2E8F0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#64748B" strokeWidth="1.5"/>
                          <path d="M4 5h6M4 7h6M4 9h4" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: "#0F172A",
                          fontFamily: "'Inter', sans-serif", marginBottom: 2
                        }}>Regulatory tracking</p>
                        <p style={{
                          fontSize: 13, color: "#64748B", lineHeight: 1.5
                        }}>Reads new GDPR decisions and rule changes daily. If something affects your app, you'll know before the authorities do.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "#F1F5F9", border: "1px solid #E2E8F0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1.5v5l3 3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 10l-1.5 3h11L11 10" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: "#0F172A",
                          fontFamily: "'Inter', sans-serif", marginBottom: 2
                        }}>Fix instructions</p>
                        <p style={{
                          fontSize: 13, color: "#64748B", lineHeight: 1.5
                        }}>Not just "you have a problem" — specific code-level fixes for your exact stack.</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{
                    height: 1, background: "#E2E8F0",
                    maxWidth: 400, margin: "0 auto 24px"
                  }} />

                  <p style={{
                    fontSize: 15, fontWeight: 600, color: "#0F172A",
                    fontFamily: "'Inter', sans-serif", marginBottom: 4
                  }}>Get early access</p>
                  <p style={{
                    fontSize: 13, color: "#94A3B8", lineHeight: 1.5,
                    marginBottom: 16, maxWidth: 380, marginLeft: "auto", marginRight: "auto"
                  }}>
                    Join the waitlist to unlock your full report and be the first to try the complete product.
                  </p>

                  <form onSubmit={handleFormspreeSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
                    <input type="hidden" name="scanned_url" value={url} />
                    <input type="hidden" name="security_score" value={results?.security_score} />
                    <input type="hidden" name="compliance_score" value={results?.compliance_score} />
                    <input type="hidden" name="issues_found" value={results?.findings?.length} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="you@email.com"
                        style={{
                          flex: 1, minWidth: 200, height: 48, padding: "0 16px",
                          border: "1px solid #CBD5E1", borderRadius: 8,
                          fontSize: 15, fontFamily: "'Inter', sans-serif",
                          background: "#FAFBFC"
                        }}
                        onFocus={e => e.target.style.borderColor = "#2563EB"}
                        onBlur={e => e.target.style.borderColor = "#CBD5E1"}
                      />
                      <ValidationError field="email" prefix="Email" errors={formState.errors} />
                      <button
                        type="submit"
                        disabled={formState.submitting}
                        style={{
                          height: 48, padding: "0 24px",
                          background: formState.submitting ? "#CBD5E1" : "#0F172A",
                          color: "#fff", border: "none", borderRadius: 8,
                          fontSize: 15, fontWeight: 600,
                          cursor: formState.submitting ? "default" : "pointer",
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: "nowrap"
                        }}
                      >{formState.submitting ? "Joining..." : "Join waitlist"}</button>
                    </div>
                  </form>
                  <p style={{
                    fontSize: 11, color: "#94A3B8", marginTop: 10
                  }}>No spam. Just your report and early access.</p>
                </div>
              </div>
            </div>
          )}

          {/* Unlocked: remaining findings */}
          {unlocked && results.findings?.length > 2 && (
            <div className="fade-up" style={{ marginTop: 8 }}>
              {/* Waitlist confirmation banner */}
              <div style={{
                background: "#ECFDF5", border: "1px solid #A7F3D0",
                borderRadius: 8, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 16
              }}>
                <span style={{ color: "#059669", fontSize: 15, flexShrink: 0 }}>✓</span>
                <p style={{
                  fontSize: 13, color: "#047857",
                  fontFamily: "'Inter', sans-serif", lineHeight: 1.4
                }}>
                  <strong>You're on the waitlist.</strong> Here's the rest of your scan. We'll email you when continuous monitoring, regulatory tracking, and auto-fix launch.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.findings
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                  })
                  .slice(2)
                  .map((finding, i) => (
                    <FindingCard key={`unlocked-${i}`} finding={finding} />
                  ))}
              </div>
            </div>
          )}

          {/* Unlocked: passed checks */}
          {unlocked && results.passed?.length > 0 && (
            <div className="fade-up" style={{
              background: "#fff", border: "1px solid #E2E8F0",
              borderRadius: 12, padding: "20px 24px", marginTop: 20
            }}>
              <h3 style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#059669",
                marginBottom: 8, fontFamily: "'Inter', sans-serif"
              }}>Passed checks</h3>
              {results.passed.map((item, i) => (
                <PassedItem key={i} text={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}