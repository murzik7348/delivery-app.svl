const axios = require('axios');
async function run() {
  try {
    const res = await axios.get('http://37.27.220.44/api/restaurant/deliveries');
    console.log("No status param:", res.status);
  } catch (e) {
    console.log("Error without param:", e.response ? e.response.status : e.message);
  }
}
run();
