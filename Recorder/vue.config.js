const path = require("path");

module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      mainProcessFile: 'src/background/main.js',
      rendererProcessFile: 'src/renderer/main.js',
/*       chainWebpackMainProcess: (config) => {
        config.module.rule("node").test(/\.node$/).use("node-loader").loader("node-loader");
      }, */
    },
  },
/*   chainWebpack: (config) => {
    config.module.rule("node").test(/\.node$/).use("node-loader").loader("node-loader");
  }, */
  configureWebpack: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, './src'),
      },
      extensions: ['.js', '.vue', '.json'],
    }
  },
}