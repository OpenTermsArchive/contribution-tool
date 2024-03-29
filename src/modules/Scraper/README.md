# Scraper Module

The scraper is used to download the full html page and show it within an iframe.
This is done to bypass CORS policy on every website we will try to scrape.

It is using a well known extension called `I don't care about cookies` to prevent GDPR banners from polluting the UX of the contribution tool

## Cookie banner update

In order to have the latest code of the extension, you need to manually download it from the chrome extensions website https://chrome.google.com/webstore/detail/i-dont-care-about-cookies/fihnjjcciajhdojfnbdddfaoknhalnja?hl=en and install it in Brave browser.

**NOTE** You need to configure the `BROWSER_EXTENSIONS_FOLDER` value in the copy-to-folder.sh file. By default this uses the standard Brave Browser installation path on macOS: `~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Extensions/$EXTENSION_ID`

and then launch

```
npm run update-cookie-extension
git add ./src/modules/Scraper/i-dont-care-about-cookies
git commit -m "Update i-dont-care-about-cookies definitions"
```

## Customization

Well, this extension is really good but it may not be working for all websites.
If you happen to fall in a case where it does not work, you can either:

- contact author@i-dont-care-about-cookies.eu
- add button rule to `./additional-search-groups.txt`. this will add the rules at runtime

**NOTE**: Be extremely careful with rules you add in here as it will be triggered on all pages. So you should be very specific

## Further doc

[Extension Readme.md](./src/modules/Scraper/i-dont-care-about-cookies/extension/README.md)
