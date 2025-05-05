const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/s3-proxy',
    createProxyMiddleware({
      target: 'https://tuva-public-resources.s3.amazonaws.com',
      changeOrigin: true,
      pathRewrite: {
        '^/s3-proxy': '', // remove the '/s3-proxy' path
      },
    })
  );
};