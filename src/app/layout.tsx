import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PedidoFácil — Gestão de pedidos e cardápio digital",
    template: "%s · PedidoFácil",
  },
  description:
    "Plataforma completa para restaurantes, pizzarias, lanchonetes e marmitarias venderem online com cardápio digital, pedidos em tempo real e gestão de vendas.",
  applicationName: "PedidoFácil",
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
