import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Customizes the root HTML document for the web/PWA build (replaces expo-router's default
 * template — see node_modules/expo-router/build/static/html.js for what that looked like). Adds
 * the web app manifest + iOS "Add to Home Screen" meta tags, neither of which expo-router injects
 * on its own — without these, browsers don't recognize the page as an installable PWA at all.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0d1117" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />

        {/* iOS Safari doesn't read manifest.json for "Add to Home Screen" — it needs these instead. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GymCrew" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
