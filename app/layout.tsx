import type { Metadata, Viewport } from "next";
import "./globals.css";

// iPhone Notch එකට CSS වැඩ කරන්න මේක ඕනේ
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Emma Thinking • Kossa Edition",
  description: "Official Enterprise Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* හැම පිටුවක්ම මේ main එක ඇතුළට එන නිසා දැන් හැම එකම center වෙනවා */}
        <main>{children}</main>
      </body>
    </html>
  );
}