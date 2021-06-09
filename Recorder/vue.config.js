module.exports = {
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: 'src/background/main.js',
      rendererProcessFile: 'src/renderer/main.js',
    },
  },
}