import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dodo Web File Crawler",
  description: "Web crawler tool to find and download files from websites",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const storageKey = "dodo-theme";
                const theme = localStorage.getItem(storageKey);
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                document.documentElement.classList.remove("light", "dark");
                document.documentElement.classList.add(theme === "system" ? systemTheme : theme || systemTheme);
              } catch (e) {
                console.error('Theme initialization failed:', e);
              }
            })();
          `,
        }} />
      </head>
      <body
        className={`${inter.variable} font-sans min-h-screen antialiased`}
      >
        <ThemeProvider defaultTheme="system" storageKey="dodo-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}