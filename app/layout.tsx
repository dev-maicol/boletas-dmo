import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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
 * Fallback cuando no hay cabeceras (p. ej. algunos contextos de build).
 * En Vercel: NEXT_PUBLIC_SITE_URL o VERCEL_PROJECT_PRODUCTION_URL (evita la URL única de deploy en VERCEL_URL).
 */
function siteUrlFromEnv(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (productionHost)
    return `https://${productionHost.replace(/^https?:\/\//, "")}`

  const deploymentHost = process.env.VERCEL_URL?.trim()
  if (deploymentHost)
    return `https://${deploymentHost.replace(/^https?:\/\//, "")}`

  return "http://localhost:3000"
}

/** Host público de la petición: hace que og:image coincida con boletas-dmo.vercel.app y no con la URL interna del deploy. */
async function siteUrlFromRequest(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-host")
  const host = (forwarded?.split(",")[0]?.trim() || h.get("host") || "").replace(
    /^https?:\/\//,
    ""
  )
  if (!host) return siteUrlFromEnv()

  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") ? "http" : "https")

  return `${proto}://${host}`
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await siteUrlFromRequest()
  const metadataBase = new URL(siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`)
  const ogImageUrl = new URL("/logoboletas.png", metadataBase).toString()

  return {
    metadataBase,
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
      url: metadataBase,
      title: "Boletas de pago - DMO S.R.L.",
      description:
        "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
      images: [
        {
          url: ogImageUrl,
          alt: "DMO S.R.L. - Sistema de boletas de pago",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Boletas de pago - DMO S.R.L.",
      description:
        "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
      images: [ogImageUrl],
    },
  }
}

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
