import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import tokensHref from "~/styles/tokens.css?url";
import tailwindHref from "~/styles/tailwind.css?url";
import globalsHref from "~/styles/globals.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tokensHref },
  { rel: "stylesheet", href: tailwindHref },
  { rel: "stylesheet", href: globalsHref },
];

export default function App() {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
