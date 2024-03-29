module.exports = {
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  keySeparator: false, // to be able to use `.` in the key names
  logBuild: false,
  pages: {
    '*': ['common', 'header', 'footer'],
    '/': ['homepage'],
    '/service': ['service','contributor-form'],
    '/sorry': ['sorry'],
    '/thanks': ['homepage', 'thanks'],
  },
};
