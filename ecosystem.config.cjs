module.exports = {
  apps: [
    {
      name: 'ramak-kala-backend',
      script: './src/backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        MYSQL_HOST: 'localhost',
        MYSQL_PORT: 3306,
        MYSQL_USER: 'risk_report',
        MYSQL_PASSWORD: 'risk_report_password',
        MYSQL_DATABASE: 'riskreport',
        BACKEND_PORT: 6000
      },
      error_file: '/var/log/pm2/ramak-kala-error.log',
      out_file: '/var/log/pm2/ramak-kala-out.log',
      log_file: '/var/log/pm2/ramak-kala-combined.log',
      time: true,

      // Auto restart
      max_memory_restart: '500M',
      watch: false,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Health check
      health_check: {
        enabled: true,
        memory_limit: 100,
        event_loop_delay: 100
      },

      // Crash and restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: '5.175.136.17',
      ref: 'origin/main',
      repo: 'git@github.com:YOUR_USERNAME/riskreport.git',
      path: '/var/www/riskreport.devkit.com.tr',
      'pre-deploy-local': 'echo "Deploying to production"',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
