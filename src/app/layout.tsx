import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#064e3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: {
    default: "Soluções Financeiras | Gestão Inteligente de Empréstimos e Cobranças",
    template: "%s | Soluções Financeiras",
  },
  description:
    "Sistema completo e inteligente de gestão e controle de empréstimos, cobranças automatizadas via WhatsApp, fluxo de caixa e gestão de clientes com máxima segurança.",
  applicationName: "Soluções Financeiras",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Soluções Financeiras",
    title: "Soluções Financeiras | Gestão Inteligente de Empréstimos e Cobranças",
    description:
      "Sistema completo e inteligente de gestão e controle de empréstimos, cobranças automatizadas via WhatsApp, fluxo de caixa e gestão de clientes com máxima segurança.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Soluções Financeiras - Gestão Inteligente de Empréstimos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soluções Financeiras | Gestão Inteligente de Empréstimos e Cobranças",
    description:
      "Sistema completo e inteligente de gestão e controle de empréstimos, cobranças automatizadas via WhatsApp, fluxo de caixa e gestão de clientes com máxima segurança.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Soluções Financeiras",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
