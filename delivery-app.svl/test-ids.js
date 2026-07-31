const https = require('https');

function getLength(url) {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
      resolve(Number(res.headers['content-length']) || 0);
    }).on('error', () => resolve(0)).end();
  });
}

async function test() {
  const resP = await new Promise(r => https.get('https://api.andi.delivery/product?restaurantId=1&page=1&pageSize=50', (res) => {
    let data = ''; res.on('data', c => data += c); res.on('end', () => r(JSON.parse(data)));
  }));
  const itemsP = resP.items || resP;
  
  const realProducts = [];
  await Promise.all(itemsP.map(async i => {
    const len = await getLength(i.urlBase || i.imageUrl);
    if (len !== 2675 && len !== 0) {
        realProducts.push(i.id);
    }
  }));
  console.log(`Real Product IDs for Rutenia: ${JSON.stringify(realProducts)}`);

  const resC = await new Promise(r => https.get('https://api.andi.delivery/category', (res) => {
    let data = ''; res.on('data', c => data += c); res.on('end', () => r(JSON.parse(data)));
  }));
  
  const placeholderCats = [];
  await Promise.all(resC.map(async c => {
    const len = await getLength(c.urlBase || c.imageUrl);
    if (len === 10526 || len === 0) {
        placeholderCats.push(c.id);
    }
  }));
  console.log(`Placeholder Category IDs: ${JSON.stringify(placeholderCats)}`);
}
test();
