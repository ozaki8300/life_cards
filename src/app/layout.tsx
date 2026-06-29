import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const appBackgroundColor = "#f7f3ea";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Life Cards",
  title: "Life Cards",
  description: "写真・スクショ・言葉をカードにして、デッキで育てる知的チェキアプリ。",
  appleWebApp: {
    capable: true,
    title: "Life Cards",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
        sizes: "1024x1024",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "1024x1024",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: appBackgroundColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
