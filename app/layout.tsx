import type {Metadata} from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['700', '800'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'LingoBuddy - Belajar Bahasa Asing Interaktif',
  description: 'Platform interaktif seru untuk belajar bahasa asing dengan gaya Playful Geometric!',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <body suppressHydrationWarning className="bg-[#FFFDF5] text-[#1E293B]">
        {children}
      </body>
    </html>
  );
}
