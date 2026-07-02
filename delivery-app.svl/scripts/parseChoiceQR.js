const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://ruteniya-svalyava.choiceqr.com/section:menyu';

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function parseWeight(weightStr) {
    if (!weightStr) return 0;
    const cleaned = String(weightStr).replace(/[^0-9/]/g, '');
    const parts = cleaned.split('/');
    const sum = parts.reduce((acc, part) => acc + (parseInt(part, 10) || 0), 0);
    return sum || 0;
}

async function main() {
    try {
        console.log(`📥 Reading local file choiceqr.html...`);
        const htmlPath = path.join(__dirname, 'choiceqr.html');
        if (!fs.existsSync(htmlPath)) {
            throw new Error(`File not found: ${htmlPath}`);
        }
        const html = fs.readFileSync(htmlPath, 'utf-8');
        
        console.log('🔍 Locating __NEXT_DATA__ script...');
        const scriptStartTag = '<script id="__NEXT_DATA__" type="application/json">';
        const startIdx = html.indexOf(scriptStartTag);
        if (startIdx === -1) {
            throw new Error('Could not find __NEXT_DATA__ script tag in the page!');
        }
        
        const dataStartIdx = startIdx + scriptStartTag.length;
        const endIdx = html.indexOf('</script>', dataStartIdx);
        if (endIdx === -1) {
            throw new Error('Could not find closing script tag for __NEXT_DATA__!');
        }
        
        const jsonStr = html.substring(dataStartIdx, endIdx);
        const parsedData = JSON.parse(jsonStr);
        
        const pageProps = parsedData.props?.pageProps;
        if (!pageProps) {
            throw new Error('Could not find pageProps in NEXT_DATA!');
        }
        
        const appData = parsedData.props?.app || {};
        console.log('appData keys:', Object.keys(appData));
        const categories = appData.categories || [];
        const menu = appData.menu || [];
        const sections = appData.sections || [];
        
        console.log(`✅ Extracted:`);
        console.log(`   - Sections: ${sections.length}`);
        console.log(`   - Categories: ${categories.length}`);
        console.log(`   - Menu items: ${menu.length}`);
        
        const sectionMap = {};
        sections.forEach(s => {
            sectionMap[s._id] = s.name;
        });
        
        const categoryMap = {};
        categories.forEach(c => {
            categoryMap[c._id] = c.name;
        });
        
        // Let's filter active and available items, and structure them
        const structuredCategories = categories.map(c => ({
            id: c._id,
            name: c.name,
            hurl: c.hurl,
            description: c.description || ''
        }));
        
        const structuredItems = menu.map(item => {
            // Find image URL
            let imageUrl = null;
            if (item.media && item.media.length > 0) {
                // Try webp first, then regular URL
                imageUrl = item.media[0].webp?.url || item.media[0].url || null;
            }
            
            return {
                id: item._id,
                name: item.name,
                description: item.description || '',
                price: item.price ? item.price / 100 : 0, // Convert cents to normal currency unit
                weightGrams: parseWeight(item.weight),
                categoryId: item.category,
                categoryName: categoryMap[item.category] || 'Невідомо',
                sectionId: item.section,
                sectionName: sectionMap[item.section] || 'Невідомо',
                imageUrl: imageUrl,
                available: item.available !== false
            };
        });
        
        const output = {
            restaurantName: pageProps.app?.place?.name || 'Рутенія',
            sections: sections,
            categories: structuredCategories,
            items: structuredItems
        };
        
        const outputPath = path.join(__dirname, 'menu_parsed.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
        console.log(`🎉 Parsed data successfully saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Error occurred:', error);
    }
}

main();
