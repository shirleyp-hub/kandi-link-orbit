# KANDI LINK · ORBIT simulator

A live 3D story of ORBIT, a paired festival bangle that finds your friends with light instead of a screen.

## The story

1. **Lost.** Headliner drops, phone dies, crew disappears into 900 people.
2. **Pick.** Twist the selector ring to a friend's gem. One buzz per click.
3. **Point.** A point of light swings around the band to where they are.
4. **Walk.** Turn until the light sits ahead and follow it. It stays locked on your friend as you move, and the tail shortens as you close in.
5. **Found.** Under 10 m both bands breathe the same color and the crowd parts.

Pick any of the 8 crew members during the story to change who you find. Switch to **Free roam** to walk the festival yourself with WASD or the arrow keys, and twist with Q and E.

## Run it

```bash
npm install
npm run dev
```

## What is on screen

| Area | Shows |
| --- | --- |
| Festival | Main stage with LED wall, lasers and beams, 900 dancing ravers, your crew |
| Band view | Close up of your ORBIT with the live light comet. Tap **Inside the band** and click any part for specs |
| Map | Top down view with your path and your friend |
| Status | Phone dead, no signal, band battery, live distance |

## Components modeled

| # | Part | Notes |
| --- | --- | --- |
| 01 | Selector ring | Titanium, 8 magnetic detents, snap gems |
| 02 | Resin shell | Clear cast PU, frosted inner face, IP54 |
| 03 | Light ribbon | 72 side emitting RGB LEDs |
| 04 | Flex brain | nRF52840, SX1262 LoRa, L76K GNSS, 9 axis IMU |
| 05 | Curved cells | 2 x 120 mAh arc LiPo |
| 06 | Core segment | Hall sensors, haptic, magnetic charge pins |

Costs and battery figures are concept estimates, not supplier quotes.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages through `.github/workflows/pages.yml`. Turn on Pages in repo settings with source set to GitHub Actions.

Built with Three.js and Vite.
