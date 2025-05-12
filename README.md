# Cloaq Extension

**Chrome Download:** https://chromewebstore.google.com/detail/fcalilbnpkfikdppppppchmkdipibalb

Cloaq is a browser extension that spoofs your time zone, geolocation, and locale to any location you choose. It's useful for testing websites in different regions, bypassing geo-restrictions, or matching your location data to your VPN IP address.

## How Cloaq Works

Cloaq uses the chrome.debugger API to change data directly at the browser level, making it effective across all frames and web workers, unlike other extensions that rely on less reliable script injections. This approach ensures data modifications are undetectable and work consistently, even during the initial page load.

## Known Limitations

### Credential Pages
Chrome security prevents any extension from using the debugger API on pages with password fields, login forms, or other credential entry points (like Google sign-in, Facebook login, bank sites). If the debugger banner disappears on such pages, this is expected behavior and a security feature of Chrome, not a bug.

### IP Address
Cloaq does not change your IP address. To change your IP address you will need a VPN or proxy.

## Hide Debugging Notification Bar

While the extension is on, a notification bar becomes visible. Hiding the bar can be done by using the --silent-debugger-extension-api flag.

Instructions on how to run chrome with flags:

https://www.chromium.org/developers/how-tos/run-chromium-with-flags/

## Permission Justification

Chrome permissions define the specific browser capabilities and user data that an extension can access.

**debugger:** Enables the extension to attach to tabs and emulate user settings such as location, time zone, and locale.

**webNavigation:** Enables the extension to attach the debugger to pages and monitor page transitions.

**storage:** Enables the extension to store and retrieve settings and preferences.

## Screenshot

<img src="https://raw.githubusercontent.com/s1t3m4p/cloaq/refs/heads/main/promo/screenshot_2.png" alt="Screenshot" />

## Development

Cloaq is built using JavaScript and Tailwind CSS.

1. Clone this repository to your local machine.

2. Run the following command to install necessary packages:

```
yarn
```

3. Build the Extension.

```
yarn build
```

This command will build in the extension and place it in the /build folder.

### Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable 'Developer mode' (toggle in the upper-right corner).
3. Click 'Load unpacked'.
4. Select the `build` folder (or the root folder if using `yarn watch:css`).
