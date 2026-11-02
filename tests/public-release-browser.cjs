/* Public release regression entry; selectors follow the current workbench. */
process.env.UWANT_TEST_BASE ||= 'http://127.0.0.1:8796/';
require('./workbench-public-browser.cjs');
