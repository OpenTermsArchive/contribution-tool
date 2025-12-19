const path = require('path');

module.exports = {
  apps: [
    {
      name: "ota-contribution-tool-production",
      script: 'npm',
      args: 'start',
      cwd: '/home/debian/' + path.basename(__dirname),
      env: {
        NODE_ENV: 'production'
      },
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 1000,
      exponential_backoff_restart_delay: true,
      log_date_format: "YYYY-MM-DDTHH:mm:ssZ"
    }
  ],
};
