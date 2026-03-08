const puppeteer = require('puppeteer');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function removeCachePlugin() {
    console.log('🗑️ Removing cache plugins...\n');
    
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
        
        // Go to plugins page
        console.log('\n📦 Going to plugins page...');
        await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2' });
        await wait(3000);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/plugins-list.png' });
        
        // Find cache-related plugins
        const plugins = await page.evaluate(() => {
            const rows = document.querySelectorAll('#the-list tr');
            const found = [];
            rows.forEach(row => {
                const name = row.querySelector('.plugin-name, strong')?.textContent?.toLowerCase() || '';
                const slug = row.id || '';
                if (name.includes('cache') || name.includes('litespeed') || name.includes('wordfence') || name.includes('rocket') || name.includes('smush')) {
                    found.push({
                        name: name,
                        slug: slug.replace('plugin-', ''),
                        active: row.classList.contains('active')
                    });
                }
            });
            return found;
        });
        
        console.log(`Found ${plugins.length} cache/security plugins:`);
        plugins.forEach(p => console.log(`  - ${p.name} (${p.slug}) - ${p.active ? 'active' : 'inactive'}`));
        
        // Deactivate and delete each
        for (const plugin of plugins) {
            console.log(`\n🗑️ Processing ${plugin.name}...`);
            
            if (plugin.active) {
                // Deactivate first
                console.log(`  Deactivating...`);
                const deactivateLink = await page.$(`#the-list tr[data-plugin*="${plugin.slug}"] .deactivate a`);
                if (deactivateLink) {
                    await deactivateLink.click();
                    await wait(3000);
                    console.log(`  ✅ Deactivated`);
                }
            }
            
            // Delete
            console.log(`  Deleting...`);
            const deleteLink = await page.$(`#the-list tr[data-plugin*="${plugin.slug}"] .delete a`);
            if (deleteLink) {
                await deleteLink.click();
                await wait(2000);
                
                // Confirm deletion
                const confirmBtn = await page.$('.button-primary, button[type="submit"]');
                if (confirmBtn) {
                    await confirmBtn.click();
                    await wait(3000);
                }
                console.log(`  ✅ Deleted`);
            }
            
            await page.screenshot({ path: `/data/.openclaw/workspace/steinegger-it/screenshots/after-${plugin.slug}.png` });
        }
        
        // Reload plugins page
        console.log('\n🔄 Reloading plugins page...');
        await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2' });
        await wait(2000);
        
        // Check remaining plugins
        const remainingPlugins = await page.evaluate(() => {
            const rows = document.querySelectorAll('#the-list tr');
            return Array.from(rows).map(row => row.querySelector('.plugin-name, strong')?.textContent?.trim()).filter(Boolean);
        });
        
        console.log(`\n✅ Remaining plugins (${remainingPlugins.length}):`);
        remainingPlugins.forEach(p => console.log(`  - ${p}`));
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/final-plugins.png' });
        
        console.log('\n✅ Cache plugins removed!');
        return { success: true, removedPlugins: plugins };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-remove.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

removeCachePlugin().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});