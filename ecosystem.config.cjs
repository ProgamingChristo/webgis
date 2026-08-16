/* global __dirname, module */

module.exports = {
  apps: [
    {
      name: "getra-backend",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 5000,
      time: true,
      vizion: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
