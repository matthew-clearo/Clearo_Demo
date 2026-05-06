import Providers from "@/components/Providers";
import Header from "@/components/Header";

export const metadata = {
  title: "Clearo - Medical Imaging Made Simple",
  description:
    "Search medical imaging clinics, compare listed prices, and choose appointment options for MRI, CT, X-Ray, Ultrasound, and more.",
  openGraph: {
    title: "Clearo - Medical Imaging Made Simple",
    description:
      "Search clinics, compare listed prices, and choose medical imaging appointment options.",
    type: "website",
    locale: "en_AU",
    siteName: "Clearo",
    images: [
      {
        url: "/og-image.jpg",
        width: 1536,
        height: 1024,
        alt: "Clearo - Medical Imaging Made Simple",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clearo - Medical Imaging Made Simple",
    description:
      "Search clinics, compare listed prices, and choose medical imaging appointment options.",
    images: [
      "/og-image.jpg",
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <Providers>
      {/* Global fixed header on all pages */}
      <Header />

      {/* Page content starts directly without wrapper padding */}
      {children}
    </Providers>
  );
}
