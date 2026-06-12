import Script from "next/script";

/**
 * Novus.ai analytics — required by the hackathon submission rules.
 * Set NEXT_PUBLIC_NOVUS_SRC (script URL) and NEXT_PUBLIC_NOVUS_ID (project id) to activate.
 * No-ops silently when NEXT_PUBLIC_NOVUS_SRC is unset.
 */
export function NovusAnalytics() {
  const src = process.env.NEXT_PUBLIC_NOVUS_SRC;
  const id = process.env.NEXT_PUBLIC_NOVUS_ID;

  if (!src) return null;

  return (
    <Script
      src={src}
      data-novus-id={id}
      data-project-id={id}
      strategy="afterInteractive"
    />
  );
}
