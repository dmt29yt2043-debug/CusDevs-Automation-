import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find the best activities for your kids — PulseUP",
  description: "Answer 5 quick questions and get personalized weekend activity recommendations.",
  openGraph: {
    title: "Find the best activities for your kids — PulseUP",
    description: "Answer 5 quick questions and get personalized weekend activity recommendations.",
    url: "https://quiz.pulseup.me",
    siteName: "PulseUP",
    images: [
      {
        url: "https://quiz.pulseup.me/logo.png",
        width: 256,
        height: 256,
        alt: "PulseUP",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "#0f0d2e" }}>
        {children}
      </body>
    </html>
  );
}
