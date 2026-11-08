import type { Metadata } from "next";
import Header from "./componentes/header";
import Footer from "./componentes/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiReis",
  description: "'Observar, estudar e registrar são os primeiros passos para melhorar'",
  icons: {
    icon: "/mireis-logo.svg",
  },
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