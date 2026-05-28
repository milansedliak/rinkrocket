import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RinkRocket",
  description: "The best hockey drill builder on the market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
