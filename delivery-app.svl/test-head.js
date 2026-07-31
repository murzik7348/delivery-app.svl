const https = require('https');

function getLength(url) {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
      resolve(Number(res.headers['content-length']) || 0);
    }).on('error', () => resolve(0)).end();
  });
}

async function test() {
  const start = Date.now();
  const res = await new Promise(r => https.get('https://api.andi.delivery/product?restaurantId=1&page=1&pageSize=50', (res) => {
    let data = ''; res.on('data', c => data += c); res.on('end', () => r(JSON.parse(data)));
  }));
  const items = res.items || res;
  console.log(`Fetched ${items.length} items in ${Date.now() - start}ms`);
  
  const pStart = Date.now();
  const lengths = await Promise.all(items.map(i => getLength(i.urlBase)));
  console.log(`HEAD requests took ${Date.now() - pStart}ms`);
  
  const placeholders = lengths.filter(l => l === 2675).length;
  console.log(`Placeholders: ${placeholders}`);
}
test();
