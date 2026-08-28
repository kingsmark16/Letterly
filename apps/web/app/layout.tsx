import type { Metadata } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "../src/lib/query-provider";
import "./globals.css";

const fraunces = localFont({
  src: [
    {
      path: "../assets/fonts/Fraunces-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Fraunces-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/Fraunces-650.woff2",
      weight: "650",
      style: "normal",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

const manrope = localFont({
  src: [
    {
      path: "../assets/fonts/Manrope-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Manrope-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Manrope-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/Manrope-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

const geist = localFont({
  src: [
    {
      path: "../assets/fonts/Geist-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Geist-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/Geist-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist",
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "Letterly | Make something worth opening",
  description:
    "Create a personal page for the words, memories, and questions that deserve more than an ordinary message.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${geist.variable}`}
    >
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
