# Notes for AMO Reviewers

Thanks for reviewing MultiView. Here's what you need to know.

## How to build the submitted extension from this source

```bash
bash build.sh
```

This produces:
- `dist-chrome/` — Chrome MV3 build
- `dist-firefox/` — Firefox MV2 build (the one submitted to AMO)

The Firefox xpi was created from `dist-firefox/` with:
```bash
cd dist-firefox && zip -r ../multiview-v1.1.0-firefox.zip .
```

## Minified/third-party code

One file in this extension is minified: **`src/shared/ExtPay.js`** (~52 KB).

- **What it is:** The [ExtensionPay](https://extensionpay.com) SDK by Glimpse Labs LLC, used to process the optional $9.99 Pro upgrade via Stripe.
- **Where it came from:** `https://unpkg.com/extpay/dist/ExtPay.js` — vendored unmodified.
- **Verify it's unmodified:** `curl -L https://unpkg.com/extpay/dist/ExtPay.js | diff - src/shared/ExtPay.js` should show no differences.
- **Upstream source:** https://github.com/Glench/ExtPay (MIT license)
- **Why vendored rather than fetched at runtime:** AMO policy forbids remote code execution; vendoring keeps all JS in the signed package.

## What the extension does

Lets users watch up to 32 videos simultaneously in a grid or as tiled browser windows. Works with YouTube, Twitch, and generic embeds.

- **Free tier:** up to 4 simultaneous streams
- **Pro tier ($9.99 one-time):** up to 32 streams. Payment flows through ExtensionPay → Stripe; see `src/shared/license.js` for the license-check logic.

## Network hosts contacted

- `extensionpay.com` — license verification only (declared in `permissions` and via a content script that runs only on this host)

No telemetry, analytics, ads, or tracking. Video queue is stored in `browser.storage.local` and never leaves the user's device.

## Source of truth

Public repository: https://github.com/motaly86/multiview

## Contact

If anything is unclear, please contact the developer via the email on the AMO listing.
