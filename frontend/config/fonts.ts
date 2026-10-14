import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from "next/font/google";

/** Interface and body text. */
export const fontSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-sans",
});

/** Headings and post titles. */
export const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-source-serif",
});

/** Only for IDs and codes, like registration numbers. */
export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});
