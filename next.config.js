const nextTranslate = require('next-translate');

module.exports = nextTranslate({
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  serverRuntimeConfig: {
    // Will only be available on the server side
    scrapedFilesFolder: '.next/tmp/services', // where to store the files retrieved by puppeteer calls
    scrapedIframeUrl: '/iframe/services', // url on which the files in the above folder will be accessible
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    author: {
      name: 'Anonymous Contributor',
      email: 'anonymous@contribute.opentermsarchive.org',
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      // issuer section restricts svg as component only to
      // svgs imported from js / ts files.
      //
      // This allows configuring other behavior for
      // svgs imported from other file types (such as .css)
      issuer: { and: [/\.(js|ts|md)x?$/] },
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: { plugins: [{ removeViewBox: false }] },
          },
        },
      ],
    });
    return config;
  },
  async redirects() {
    return [
      {
        source: '/contribute/service/:path*',
        destination: '/service/:path*',
        permanent: true,
      },
    ];
  },
});
