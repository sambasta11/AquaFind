/* AquaFind runtime config. Loaded before the app.
   Same-origin deployment (the Express server serves this folder): leave API_BASE empty.
   Split deployment or Capacitor/Android build: set it to your HTTPS API origin, e.g.
   window.AQF_API_BASE = 'https://api.example.com';  (no trailing slash) */
window.AQF_API_BASE = '';
