import Script from "next/script";

/**
 * Novus.ai analytics — REQUIRED by the hackathon (a submission without Novus
 * installed is ineligible for prizes).
 *
 * Novus gives a small embed snippet. Wire it up by setting the env vars below
 * (e.g. in `.env.local` for dev and as Fly secrets in production):
 *
 *   NEXT_PUBLIC_NOVUS_SRC = https://cdn.novus.ai/embed.js   (the <script src> Novus gives you)
 *   NEXT_PUBLIC_NOVUS_ID  = your-project-id                  (the project / site id, if any)
 *
 * If NEXT_PUBLIC_NOVUS_SRC is not set, nothing is injected (keeps local dev clean).
 * Paste the exact attributes Novus asks for once you have a project.
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
