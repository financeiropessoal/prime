import type { Metadata } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { Toaster } from "@/components/ui/toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chaveiro Auto - Loja & ERP",
  description: "Sistema integrado de e-commerce e ERP para peças e acessórios automotivos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <CartProvider>
            <Toaster>
              {children}
            </Toaster>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

