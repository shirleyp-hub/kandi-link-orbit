# KANDI LINK · ORBIT simulator

A live, interactive 3D simulator of ORBIT, a paired festival bangle that finds your friends with light instead of a screen.

Twist the selector ring to a friend's gem. A comet of light inside the clear resin points at them and stays locked to the world as you turn. The tail shortens as you close in. Under 10 m the whole ring breathes their color.

## Run it

```bash
npm install
npm run dev
```

Open the local URL Vite prints.

## Controls

| Input | Action |
| --- | --- |
| Twist left / right, Q / E, Shift + scroll | Pick a friend |
| Core click | Start or stop seeking |
| Core hold 2 s | Meet at me beacon, crew walks to you |
| Core double click | Ghost mode for 30 min |
| Core triple click | SOS, ring flashes red |
| WASD or arrows | Walk and turn on the festival map |
| Click the map | Auto walk to that spot |
| Drag the 3D view | Orbit the bangle |
| Exploded view, then click a part | Component specs |

## What is simulated

* 8 friends wander between stages on an 800 m festival map
* Each band sends a GNSS fix over LoRa every 10 s with adjustable GPS noise
* Bearing minus your compass heading drives the light comet
* Under 10 m BLE proximity takes over
* Dropped signals show the last known position
* Customize ring finish, resin tint, gem cut and idle light

## Components modeled

| # | Part | Notes |
| --- | --- | --- |
| 01 | Selector ring | Titanium, 8 magnetic detents, snap gems |
| 02 | Resin shell | Clear cast PU, frosted inner face, IP54 |
| 03 | Light ribbon | 60 side emitting RGB LEDs |
| 04 | Flex brain | nRF52840, SX1262 LoRa, L76K GNSS, 9 axis IMU |
| 05 | Curved cells | 2 x 120 mAh arc LiPo |
| 06 | Core segment | Hall sensors, haptic, magnetic charge pins |

Costs and battery figures are concept estimates, not supplier quotes.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages through `.github/workflows/pages.yml`. Turn on Pages in the repo settings with source set to GitHub Actions.

Built with Three.js and Vite.
