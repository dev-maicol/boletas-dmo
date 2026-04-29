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

export const metadata: Metadata = {
  title: "Boletas de pago - DMO S.R.L.",
  description:
    "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
  icons: {
    icon: "/logoboletas.png",
  },
  openGraph: {
    title: "Boletas de pago - DMO S.R.L.",
    description:
      "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
    images: "/logoboletas.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Boletas de pago - DMO S.R.L.",
    description:
      "Sistema de boletas de pago para DMO S.R.L. - Generación, envío y seguimiento de boletas de pago.",
    images: "/logoboletas.png",
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
