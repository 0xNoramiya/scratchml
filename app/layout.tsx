import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { NovusAnalytics } from "@/components/NovusAnalytics";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  // Required so og:image/twitter:image resolve to absolute production URLs
  // (without it Next falls back to localhost and social cards silently break).
  metadataBase: new URL("https://scratchml.fly.dev"),
  title: "ScratchML — Teach a computer to see, by snapping blocks",
  description:
    "A Scratch-style playground where kids and beginners build a real machine-learning model by dragging blocks. Show your camera a few examples, train the brain, and watch it learn — all in your browser.",
  keywords: ["machine learning for kids", "learn AI", "Scratch", "Teachable Machine", "no-code ML"],
  openGraph: {
    title: "ScratchML",
    description: "Teach a computer to see, by snapping blocks together.",
    type: "website",
    images: [{ url: "/art/og.png", width: 1200, height: 630, alt: "A friendly robot stacking colorful ScratchML blocks" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScratchML — teach a computer to see",
    description: "Kids build a real ML model by snapping blocks. No code, no accounts, nothing uploaded.",
    images: ["/art/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff6e9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <NovusAnalytics />
      </body>
    </html>
  );
}
