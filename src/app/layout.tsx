import type { Metadata } from "next";
import Header from "./componentes/header";
import Footer from "./componentes/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluxo de Caixa",
  description: "Controle financeiro simples para seu negócio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app">
          <Header />

          <main className="main">
            {children}
          </main>

          <Footer />
        </div>
      </body>
    </html>
  );
}