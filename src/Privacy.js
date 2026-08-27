export default function Privacy() {
  return (
    <div style={{
      maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px",
      fontFamily: "'Inter', sans-serif", color: "#334155", lineHeight: 1.7
    }}>
      <h1 style={{
        fontSize: 28, fontWeight: 700, color: "#0F172A",
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: "-0.02em", marginBottom: 8
      }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 40 }}>
        Last updated: August 2026
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Who we are</h2>
      <p style={{ marginBottom: 24 }}>
        Vespez is a security and compliance scanner for web applications, built and operated by an individual founder. You can reach us at <a href="mailto:supportvespez@gmail.com" style={{ color: "#2563EB" }}>supportvespez@gmail.com</a>.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>What we collect</h2>
      <p style={{ marginBottom: 24 }}>
        The only personal data we collect is your <strong>email address</strong>, and only when you choose to join our waitlist. We do not collect names, payment information, or any other personal data at this stage.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Why we collect it</h2>
      <p style={{ marginBottom: 24 }}>
        We collect your email address solely to notify you when Vespez launches and to send you your full scan report. We will not send you unsolicited marketing emails.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Who we share it with</h2>
      <p style={{ marginBottom: 24 }}>
        Your email is processed by <strong>Formspree</strong> (formspree.io), our form handling service. Formspree stores form submissions on servers in the United States. We do not sell or share your data with any other third parties.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>URLs you scan</h2>
      <p style={{ marginBottom: 24 }}>
        When you run a scan, the URL you enter is sent to our backend and to the Anthropic API for analysis. We do not store URLs or scan results after your session ends.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Your rights</h2>
      <p style={{ marginBottom: 24 }}>
        You have the right to access, correct, or delete your data at any time. To do so, email us at <a href="mailto:supportvespez@gmail.com" style={{ color: "#2563EB" }}>supportvespez@gmail.com</a> and we will respond within 30 days.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Cookies</h2>
      <p style={{ marginBottom: 24 }}>
        Vespez does not use cookies or any tracking scripts.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Changes</h2>
      <p style={{ marginBottom: 24 }}>
        If we make material changes to this policy, we will update the date at the top of this page.
      </p>
    </div>
  );
}