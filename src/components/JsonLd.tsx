type JsonLdProps = {
  data: Record<string, unknown>;
};

/**
 * Renders a JSON-LD block as a plain element in the component tree (no Helmet).
 * That keeps it deterministic: it's in the prerendered HTML and the client
 * hydrates the exact same node — no head-reconciliation, no duplication.
 * `type="application/ld+json"` is inert, so it never executes.
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
