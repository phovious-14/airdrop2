const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    assert: require.resolve("assert"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify"),
    url: require.resolve("url"),
    process: require.resolve("process/browser.js"),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: require.resolve("process/browser.js"),
      Buffer: ["buffer", "Buffer"],
    }),
  ];

  return config;
};
