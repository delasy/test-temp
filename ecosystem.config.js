module.exports = {
  apps: [
    {
      name: 'promo-web-$TARGET',
      script: 'npm',
      cwd: __dirname,
      args: 'run start',
      time: true,
      env_development: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '$TARGET_PORT'
      }
    }
  ]
}
