const fetch = require('node-fetch');
fetch('http://37.27.220.44/product')
  .then(res => console.log("Status:", res.status))
  .catch(err => console.error("Error:", err.message));
