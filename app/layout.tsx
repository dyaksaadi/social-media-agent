import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Social Media AI Agent",
  description: "Manage your social media with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
