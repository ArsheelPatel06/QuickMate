const app = require('./app');
const { envConfig } = require('./config/env');

const PORT = envConfig.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${envConfig.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
