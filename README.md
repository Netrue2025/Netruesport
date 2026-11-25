# Matchday Lite

A lightweight installable football match guide. Channel 1 uses Yalla Shoot's current fixture cards, including team crests, scores, live status, and the destination linked on each card. Channels 2–4 cover Panda HD, Livesports088, and 808ball16 separately.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open http://localhost:4173. Match data is fetched from the public source pages by the server. The page refreshes manually and automatically; the PWA caches its interface while match data needs a network connection.

## Source notes

Source markup and availability can change. Panda HD's yesterday, today, and tomorrow pages are fetched together. Livesports088 and 808ball16 currently render their fixture lists client-side, and their API returned HTTP 403 from this server during inspection, so those channels may show no imported match cards. Use the empty-channel link to open a source schedule directly.

Channel 5 adds ESPN's public soccer scoreboard for extra fixture coverage, team crests, scores, live states, and match-center links. ESPN entries are not streams; the channel identifies them as scores and match centers. The match viewer includes a browser fullscreen control when the source permits it.
