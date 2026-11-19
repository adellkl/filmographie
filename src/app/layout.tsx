import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { LibraryProvider } from "@/lib/library";
import { Nav } from "@/components/Nav";
import { Gate } from "@/components/Gate";
import { AutoSync } from "@/components/AutoSync";
import { OWNER_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { PwaRegister } from "@/components/PwaRegister";
import { TabBar } from "@/components/TabBar";
import { AuthError } from "@/components/AuthError";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], weight: ["400", "500"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400"] });
// Serif éditoriale, réservée aux textes longs (synopsis)
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — journal de films et séries`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: OWNER_NAME, url: SITE_URL }],
  creator: OWNER_NAME,
  keywords: ["films", "séries", "critiques de films", "journal de films", "cinéma", "Letterboxd", "notes", "coups de cœur", "watchlist", OWNER_NAME],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Google Search Console : coller le code de vérification dans NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  category: "entertainment",
  formatDetection: { telephone: false },
  // iPhone : app plein écran depuis l'écran d'accueil
  appleWebApp: { capable: true, title: "Adel", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#101010",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // contenu sous l'encoche, géré par les safe-area insets
};

const columns = [
  { title: "Journal", links: [["Accueil", "/"], ["Journal", "/journal"], ["Vus", "/films"]] },
  { title: "Découvrir", links: [["Recherche", "/recherche"], ["À voir", "/watchlist"], ["Listes", "/listes"]] },
  { title: "Sources", links: [["Synchro", "/import"], ["Letterboxd", "https://letterboxd.com/adelkl/"], ["TMDB", "https://www.themoviedb.org/"]] },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <LibraryProvider>
          <AutoSync />
          <PwaRegister />
          <AuthError />
          <Nav />
          <main className="flex-1">
            <Gate>{children}</Gate>
          </main>
          <TabBar />
          <footer className="mt-[120px] py-24 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-24">
            <div className="shell grid gap-12 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-4">
                <span className="mono text-bone">
                  {SITE_NAME}
                  <span className="text-signal">*</span>
                </span>
                <p className="max-w-[260px] text-body-sm text-granite">
                  Développé par Adel et ses mains de maçon.
                  <span className="mono mt-2 block text-graphite">Fait main · une brique à la fois</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-9">
                {columns.map((c) => (
                  <div key={c.title} className="flex flex-col gap-4">
                    <span className="mono font-medium text-bone">{c.title}</span>
                    {c.links.map(([label, href]) =>
                      href.startsWith("http") ? (
                        <a key={href} href={href} target="_blank" rel="noreferrer" className="text-body-sm text-granite transition-colors duration-150 hover:text-bone">
                          {label}
                        </a>
                      ) : (
                        <Link key={href} href={href} className="text-body-sm text-granite transition-colors duration-150 hover:text-bone">
                          {label}
                        </Link>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </footer>
        </LibraryProvider>
      </body>
    </html>
  );
}
