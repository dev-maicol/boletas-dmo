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

/**
 * URL canónica del sitio (metadataBase). Open Graph / Twitter convierten rutas relativas aquí.
 * - NEXT_PUBLIC_SITE_URL: tu dominio definitivo (recomendado en Vercel → Environment Variables).
 * - VERCEL_PROJECT_PRODUCTION_URL: hostname estable de producción (p. ej. boletas-dmo.vercel.app),
 *   a diferencia de VERCEL_URL que es la URL única del deploy y puede exigir login en previews.
 */
function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (productionHost) return `https://${productionHost.replace(/^https?:\/\//, "")}`

  const deploymentHost = process.env.VERCEL_URL?.trim()
  if (deploymentHost) return `https://${deploymentHost.replace(/^https?:\/\//, "")}`

  return "http://localhost:3000"
}

const siteUrl = getSiteUrl()

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
