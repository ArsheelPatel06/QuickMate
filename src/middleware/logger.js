const morgan = require('morgan');

// Using morgan for HTTP request logging
// Customize the format as needed
const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms'
);

module.exports = { requestLogger };
