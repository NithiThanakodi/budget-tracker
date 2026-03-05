import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Gabarito } from "next/font/google";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import "@/style/globals.css";
import { Providers } from "./providers";

const gabarito = Gabarito({ subsets: ["latin"], variable: "--font-gabarito" });

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("bg-background font-sans", gabarito.variable)}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
