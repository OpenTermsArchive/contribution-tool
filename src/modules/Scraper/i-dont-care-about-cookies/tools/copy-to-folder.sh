#!/bin/bash

EXTENSION_ID=fihnjjcciajhdojfnbdddfaoknhalnja
EXTENSION_FOLDER=./src/modules/Scraper/i-dont-care-about-cookies/extension
# If you use Brave
BROWSER_EXTENSIONS_FOLDER=~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Extensions/$EXTENSION_ID
# If you use Chrome
# BROWSER_EXTENSIONS_FOLDER=~/Library/Application\ Support/Google/Chrome/Default/Extensions/$EXTENSION_ID


if [[ ! -e $BROWSER_EXTENSIONS_FOLDER ]]; then
  echo ""
  echo "You first need to install this extension in your chrome or brave"
  echo "https://chrome.google.com/webstore/detail/i-dont-care-about-cookies/fihnjjcciajhdojfnbdddfaoknhalnja"
  echo ""
  echo ""
  echo "TODO: download directly from the chrome webstore -> come contribute!"
  echo ""
  echo ""
  exit 0;
fi

EXTENSION_VERSION=$(ls "$BROWSER_EXTENSIONS_FOLDER")

rm -Rf $EXTENSION_FOLDER/*
echo "folder $EXTENSION_FOLDER emptied"

# Copy all data
# cp -Rf "$BROWSER_EXTENSIONS_FOLDER/"*/* $EXTENSION_FOLDER

# Copy necesary data
cp -Rf "$BROWSER_EXTENSIONS_FOLDER/"*/data $EXTENSION_FOLDER/data

# remove unused
rm -Rf $EXTENSION_FOLDER/data/menu*
rm -Rf $EXTENSION_FOLDER/data/options*

# as we are not in a real browser environment
# We do not want to send messages so we prevent it from running
sed -i.bak "s/typeof chrome == \'object\' \&\& chrome\.runtime/typeof chrome == \'object\' \&\& chrome\.runtime \&\& false/" "$EXTENSION_FOLDER/data/js/common.js"
# as we use -i.bak to be compatible across GNU and MAC, we need to remove the leftover file
# https://stackoverflow.com/a/22084103/2497753
rm $EXTENSION_FOLDER/data/js/common.js.bak

echo "folder copied in $EXTENSION_FOLDER/data"

# add module export as we want to use the data inside from our own code
echo "module.exports={commons,block_urls,rules};" >> $EXTENSION_FOLDER/data/rules.js

touch $EXTENSION_FOLDER/README.md
cat <<EOT >> $EXTENSION_FOLDER/README.md
# I don't care about cookies - Chrome extension - $EXTENSION_VERSION

We are using the software of [i-dont-care-about-cookies.eu](https://www.i-dont-care-about-cookies.eu/)

In order to make it work with our website, we copy the chrome extension in a folder in our project and remove the unused data (as it's not used as a chrome extension)

Thanks

EOT
