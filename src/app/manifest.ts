import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soluções Financeiras",
    short_name: "Soluções Fin.",
    description:
      "Sistema completo e inteligente de gestão e controle de empréstimos, cobranças e clientes.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#064e3b",
    theme_color: "#064e3b",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
