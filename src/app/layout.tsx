import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monadeal - Coming Soon",
  description: "Monadeal is coming soon. Stay tuned for something amazing!",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
