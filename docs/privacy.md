# Privacy Policy for MultiView

**Last updated:** April 22, 2026

## Overview

MultiView is a browser extension that lets you watch multiple videos side by side. This policy explains what data the extension handles, what our payment processor handles, and what we do not do.

## What MultiView stores locally

All of the following is stored in your own browser using the standard extension storage API. It never leaves your device:

- **Video queue** — the URLs, titles, and thumbnails of videos you add
- **Tiled window IDs** — short-lived references to the popup windows MultiView opens, used so "Close Tiles" can close them
- **License cache** — your Pro status and the timestamp we last checked it, so the extension works offline for up to 7 days between checks

## What we do not collect

MultiView does not operate any analytics, tracking, advertising, or telemetry. We do not have servers that collect browsing data. We do not sell data. We do not see which videos you watch.

## Payments (Pro upgrade)

If you purchase MultiView Pro, payment is processed by **ExtensionPay** (operated by Glimpse Labs, LLC), which uses **Stripe** as the underlying payment processor. We do not receive or store your payment card details.

When you check out:

- ExtensionPay collects your email address and payment information to process the transaction and verify your license on future launches.
- Stripe collects payment card details subject to its own privacy policy.
- MultiView receives only a boolean "paid / not paid" status, plus the date of purchase, cached locally in your browser.

For details on how ExtensionPay handles your data, see [https://extensionpay.com/privacy](https://extensionpay.com/privacy).
For Stripe, see [https://stripe.com/privacy](https://stripe.com/privacy).

You can restore your Pro status on another device by clicking "Restore purchase" in the upgrade page and entering the email used at checkout — ExtensionPay sends a magic link to verify.

## Permissions explained

- **storage** — persist your video queue and cached license status locally
- **contextMenus** — add the "Add to MultiView" right-click menu item
- **activeTab** — read the current page's video URL when you click "Add"
- **host_permissions: https://extensionpay.com/** — verify your Pro license status at launch. No other external hosts are contacted by the extension.

## Your choices

- **Clear your data** — remove MultiView's local data any time by uninstalling the extension or clearing extension storage in your browser settings.
- **Refund or cancellation** — contact support@extensionpay.com for refund requests on a Lifetime purchase, per their refund terms.
- **Access and deletion of purchase data** — ExtensionPay provides data access and deletion requests directly; email support@extensionpay.com.

## Children

MultiView is not directed at children under 13 and does not knowingly collect data from them.

## Changes

If this policy changes materially, the updated version will ship with the next extension update and the "Last updated" date will change. Continued use after an update means you accept the revised policy.

## Contact

Questions about this policy? Open an issue on the MultiView GitHub repository, or email the address listed on the Chrome Web Store listing.
