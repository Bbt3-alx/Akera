export default {
  testPathIgnorePatterns: ["/node_modules/", "/frontend/"],
  transform: {
    "^.+\\.js$": "babel-jest", // Transform JavaScript files with Babel
  },
  testEnvironment: "node", // Set the test environment
  coveragePathIgnorePatterns: ["/node_modules/", "/config/"],
};
