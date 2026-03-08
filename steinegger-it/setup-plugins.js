const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Plugins to install
const PLUGINS = [
    'contact-form-7',           // Kontaktformular
    'wpforms-lite',             // Alternative Formulare
    'elementor',                // Page Builder (optional)
    'essential-blocks',         // Additional blocks
    'kadence-blocks',           // More blocks
    'wp-rocket',                // Caching (wenn verfügbar)
    'wordfence',                // Security
    'yoast-seo',                // SEO
    'smush',                    // Image optimization
];

async function setup() {
    console.log('🚀 Starting WordPress plugin setup...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // 1. Login
        console.log('📋 Logging into WordPress...');
        await page.goto(WP_ADMIN, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const loginForm = await page.$('#loginform');
        if (loginForm) {
            await page.type('#user_login', WP_USER);
            await page.type('#user_pass', WP_PASS);
            await page.click('#wp-submit');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        }
        
        console.log('✅ Logged in');
        
        // 2. Install plugins
        console.log('\n📦 Installing plugins...');
        
        for (const plugin of PLUGINS) {
            console.log(`\n🔍 Installing ${plugin}...`);
            
            try {
                // Go to plugin install page
                await page.goto(`${WP_ADMIN}/plugin-install.php?s=${plugin}&tab=search&type=term`, { 
                    waitUntil: 'networkidle2', 
                    timeout: 30000 
                });
                
                await wait(2000);
                
                // Find install button
                const installBtn = await page.$(`.plugin-card-${plugin} .install-now, a.install-now[data-slug="${plugin}"], button.install-now[data-slug="${plugin}"]`);
                
                if (installBtn) {
                    // Check if already installed
                    const btnText = await page.evaluate(el => el.textContent, installBtn);
                    
                    if (btnText.includes('Aktiviert') || btnText.includes('Active')) {
                        console.log(`✅ ${plugin} already active`);
                        continue;
                    }
                    
                    if (btnText.includes('Aktivieren') || btnText.includes('Activate')) {
                        await installBtn.click();
                        await wait(3000);
                        console.log(`✅ ${plugin} activated`);
                        continue;
                    }
                    
                    // Install
                    await installBtn.click();
                    console.log(`⏳ Installing ${plugin}...`);
                    
                    // Wait for install to complete
                    await wait(5000);
                    
                    // Look for activate button
                    const activateBtn = await page.$(`.plugin-card-${plugin} .activate-now, a.activate-now[data-slug="${plugin}"], button.activate-now`);
                    if (activateBtn) {
                        await activateBtn.click();
                        await wait(3000);
                        console.log(`✅ ${plugin} installed and activated`);
                    } else {
                        // Try to find any activate button
                        const anyActivate = await page.$('a.activate-now, button.activate-now, .button.activate');
                        if (anyActivate) {
                            await anyActivate.click();
                            await wait(3000);
                            console.log(`✅ ${plugin} activated`);
                        }
                    }
                } else {
                    // Try alternative selectors
                    const altInstallBtn = await page.$(`a[href*="action=install-plugin"][href*="${plugin}"], button[data-slug="${plugin}"]`);
                    if (altInstallBtn) {
                        const btnText = await page.evaluate(el => el.textContent, altInstallBtn);
                        console.log(`Found button: ${btnText}`);
                        
                        if (!btnText.includes('Aktiviert') && !btnText.includes('Active')) {
                            await altInstallBtn.click();
                            await wait(5000);
                            console.log(`✅ ${plugin} processed`);
                        }
                    } else {
                        console.log(`⚠️ ${plugin} not found in repository`);
                    }
                }
                
                await page.screenshot({ path: `/data/.openclaw/workspace/steinegger-it/screenshots/plugin-${plugin}.png` });
                
            } catch (e) {
                console.log(`⚠️ Error with ${plugin}: ${e.message}`);
            }
        }
        
        // 3. Check installed plugins
        console.log('\n📋 Checking installed plugins...');
        await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        const activePlugins = await page.evaluate(() => {
            const plugins = [];
            document.querySelectorAll('tr.active, tr.plugin-active').forEach(tr => {
                const name = tr.querySelector('.plugin-title strong, .plugin-name')?.textContent?.trim();
                if (name) plugins.push(name);
            });
            return plugins;
        });
        
        console.log(`\n✅ Active plugins (${activePlugins.length}):`);
        activePlugins.forEach(p => console.log(`   - ${p}`));
        
        // 4. Setup Contact Form 7
        console.log('\n📝 Setting up Contact Form 7...');
        await page.goto(`${WP_ADMIN}/admin.php?page=wpcf7`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        // Check if default form exists
        const hasForm = await page.$('.wpcf7-form, #wpcf7-admin-form-name');
        if (hasForm) {
            console.log('✅ Contact Form 7 is ready');
        }
        
        // 5. Setup Custom CSS
        console.log('\n🎨 Adding custom CSS to Customizer...');
        await page.goto(`${WP_ADMIN}/customize.php`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(3000);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/customizer.png' });
        
        // 6. Check theme
        console.log('\n🎨 Checking theme...');
        await page.goto(`${WP_ADMIN}/themes.php`, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const activeTheme = await page.evaluate(() => {
            const active = document.querySelector('.theme.active, .theme-active');
            return active?.querySelector('.theme-name, h3')?.textContent?.trim() || 'Unknown';
        });
        console.log(`Active theme: ${activeTheme}`);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/themes.png' });
        
        console.log('\n✅ Plugin setup completed!');
        
        return { 
            success: true, 
            activePlugins,
            theme: activeTheme
        };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-plugins.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

setup().then(result => {
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
});