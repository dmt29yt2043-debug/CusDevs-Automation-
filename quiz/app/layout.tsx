import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find the best activities for your kids — PulseUP",
  description: "Answer 5 quick questions and get personalized weekend activity recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
