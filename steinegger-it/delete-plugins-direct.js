const puppeteer = require('puppeteer');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deletePlugins() {
    console.log('🗑️ Deleting plugins directly...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(90000);
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // Login
        console.log('📋 Logging in...');
        await page.goto(WP_ADMIN, { waitUntil: 'networkidle2' });
        const loginForm = await page.$('#loginform');
        if (loginForm) {
            await page.type('#user_login', WP_USER);
            await page.type('#user_pass', WP_PASS);
            await page.click('#wp-submit');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        console.log('✅ Logged in');
        
        // Plugins to delete
        const pluginsToDelete = [
            'litespeed-cache',
            'wordfence',
            'smush'
        ];
        
        for (const pluginSlug of pluginsToDelete) {
            console.log(`\n🗑️ Deleting ${pluginSlug}...`);
            
            // Go to specific plugin action
            const actionUrl = `${WP_ADMIN}/plugins.php?action=delete&plugin=${pluginSlug}/${pluginSlug}.php&_wpnonce=delete-plugin_${pluginSlug}`;
            
            // First try to find and click delete from list
            await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2' });
            await wait(2000);
            
            // Find the plugin row by text content
            const pluginRows = await page.$$('#the-list tr');
            let foundRow = null;
            
            for (const row of pluginRows) {
                const text = await page.evaluate(el => el.textContent.toLowerCase(), row);
                if (text.includes(pluginSlug.replace(/-/g, ' ')) || text.includes('litespeed') || text.includes('wordfence') || text.includes('smush')) {
                    foundRow = row;
                    console.log(`  Found plugin row`);
                    break;
                }
            }
            
            if (foundRow) {
                // Check if active
                const isActive = await foundRow.evaluate(el => el.classList.contains('active'));
                
                if (isActive) {
                    // Deactivate
                    console.log(`  Deactivating...`);
                    const deactivateLink = await foundRow.$('a.deactivate');
                    if (deactivateLink) {
                        await deactivateLink.click();
                        await wait(3000);
                    }
                }
                
                // Delete
                console.log(`  Deleting...`);
                await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2' });
                await wait(1000);
                
                // Find delete link
                const deleteLink = await page.evaluate(async (slug) => {
                    const rows = document.querySelectorAll('#the-list tr');
                    for (const row of rows) {
                        const text = row.textContent.toLowerCase();
                        if (text.includes(slug.replace(/-/g, ' ')) || text.includes(slug)) {
                            const deleteBtn = row.querySelector('a.delete a, .delete a');
                            if (deleteBtn) {
                                return deleteBtn.href;
                            }
                        }
                    }
                    return null;
                }, pluginSlug);
                
                if (deleteLink) {
                    console.log(`  Found delete link: ${deleteLink.substring(0, 100)}...`);
                    await page.goto(deleteLink, { waitUntil: 'networkidle2' });
                    await wait(3000);
                    
                    // Confirm if needed
                    const confirmBtn = await page.$('.button-primary, button[type="submit"]');
                    if (confirmBtn) {
                        await confirmBtn.click();
                        await wait(3000);
                    }
                    
                    console.log(`  ✅ Deleted`);
                } else {
                    console.log(`  ⚠️ Delete link not found`);
                }
            } else {
                console.log(`  ⚠️ Plugin not found in list`);
            }
            
            await page.screenshot({ path: `/data/.openclaw/workspace/steinegger-it/screenshots/after-${pluginSlug}.png` });
        }
        
        // Final check
        console.log('\n📋 Final plugin list...');
        await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2' });
        await wait(2000);
        
        const finalPlugins = await page.evaluate(() => {
            const rows = document.querySelectorAll('#the-list tr');
            return Array.from(rows).map(row => {
                const name = row.querySelector('.plugin-name, strong')?.textContent?.trim();
                return name;
            }).filter(Boolean);
        });
        
        console.log(`\n✅ Active plugins (${finalPlugins.length}):`);
        finalPlugins.forEach(p => console.log(`  - ${p}`));
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/final-plugins-list.png' });
        
        return { success: true, plugins: finalPlugins };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-delete.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

deletePlugins().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});