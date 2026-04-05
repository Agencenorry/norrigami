import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kore — Zoning & copywriting CRO/SEO",
  description:
    "Kore : génération de zoning et de copywriting optimisés pour vos projets web.",
  icons: { icon: "/Frame_5.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${jakarta.className} antialiased`}>{children}</body>
    </html>
  );
}
