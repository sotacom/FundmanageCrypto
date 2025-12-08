import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quản lý Quỹ Crypto - Fund Manager",
  description: "Hệ thống quản lý quỹ đầu tư crypto với tính năng theo dõi NAV, giao dịch, và phân tích lợi nhuận.",
  keywords: ["Crypto", "Fund Manager", "Investment", "NAV", "Bitcoin", "USDT"],
  authors: [{ name: "FundManage Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PermissionProvider>
              {children}
            </PermissionProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

