import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** URL pública del sitio: obligatoria para resolver OG/Twitter a URLs absolutas. En Vercel define NEXT_PUBLIC_SITE_URL (p. ej. https://tu-dominio.com). */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Boletas de pago - DMO S.R.L.",
  description:
    "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
  icons: {
    icon: [{ url: "/logoboletas.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "es_BO",
    siteName: "DMO S.R.L.",
    title: "Boletas de pago - DMO S.R.L.",
    description:
      "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
    images: [
      {
        url: "/logoboletas.png",
        alt: "DMO S.R.L. - Sistema de boletas de pago",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boletas de pago - DMO S.R.L.",
    description:
      "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
    images: ["/logoboletas.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
