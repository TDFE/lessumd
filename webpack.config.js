// webpack.config.js
const path = require('path');

module.exports = {
  entry: './lessFuns.js', // 替换成你的入口文件路径
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'lessFuns.js',
    library: 'lessFuns',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this', // 添加这一行
  },
  module: {
    rules: [
      // 可添加适当的 loader 配置，例如处理 ES6 语法的 Babel
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  // 可添加其他配置项
};
