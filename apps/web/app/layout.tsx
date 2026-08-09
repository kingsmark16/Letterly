import type { Metadata } from "next";
import { QueryProvider } from "../src/lib/query-provider";
import "./globals.css";

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
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
