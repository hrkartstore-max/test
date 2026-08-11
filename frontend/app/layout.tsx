import "./globals.css";

export const metadata = {
  title: "HEPRA — Build your online store",
  description: "HEPRA multi-tenant website builder SaaS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
