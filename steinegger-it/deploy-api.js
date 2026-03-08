const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deploy() {
    console.log('🚀 Starting WordPress deployment via REST API...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // 1. Login to WordPress admin
        console.log('📋 Logging into WordPress...');
        await page.goto(WP_ADMIN, { waitUntil: 'networkidle2' });
        
        const loginForm = await page.$('#loginform');
        if (loginForm) {
            await page.type('#user_login', WP_USER);
            await page.type('#user_pass', WP_PASS);
            await page.click('#wp-submit');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        
        console.log('✅ Logged in');
        
        // 2. Navigate to profile to create application password
        console.log('🔐 Creating Application Password...');
        await page.goto(`${WP_ADMIN}/profile.php`, { waitUntil: 'networkidle2' });
        
        // Check if application passwords section exists
        const appPassSection = await page.$('.application-passwords, #application-passwords-section');
        
        let appPassword = null;
        
        if (appPassSection) {
            // Generate new application password
            const appNameInput = await page.$('#new_application_password_name');
            if (appNameInput) {
                await page.type('#new_application_password_name', 'VICA-Deploy');
                
                const createBtn = await page.$('#do_new_application_password, button[type="submit"].button');
                if (createBtn) {
                    await createBtn.click();
                    await wait(2000);
                    
                    // Get the generated password
                    const passwordEl = await page.$('.application-password-display, #new_application_password');
                    if (passwordEl) {
                        appPassword = await page.evaluate(el => el.textContent.trim(), passwordEl);
                        console.log(`🔑 Application Password: ${appPassword.substring(0, 10)}...`);
                    }
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/app-password.png' });
        
        // 3. Use REST API to create/update page
        const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
        
        // First, check if page exists
        console.log('🔍 Checking for existing page...');
        
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // Get existing pages
        const pagesResponse = await page.evaluate(async () => {
            const response = await fetch('/wp-json/wp/v2/pages?per_page=100', {
                credentials: 'include'
            });
            return response.json();
        });
        
        console.log(`📄 Found ${pagesResponse.length} pages`);
        
        let existingPage = null;
        for (const p of pagesResponse) {
            if (p.title && p.title.rendered && p.title.rendered.toLowerCase().includes('steinegger')) {
                existingPage = p;
                console.log(`📝 Found existing page: ${p.title.rendered} (ID: ${p.id})`);
                break;
            }
        }
        
        // Create or update page
        const pageData = {
            title: 'Steinegger IT - IT-Dienstleister für das Seeland',
            content: blockContent,
            status: 'publish',
            slug: 'steinegger-it'
        };
        
        let result;
        
        if (existingPage) {
            // Update existing page
            console.log(`📝 Updating page ID ${existingPage.id}...`);
            result = await page.evaluate(async (id, data) => {
                const response = await fetch(`/wp-json/wp/v2/pages/${id}`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings?.nonce || ''
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            }, existingPage.id, pageData);
        } else {
            // Create new page
            console.log('🆕 Creating new page...');
            result = await page.evaluate(async (data) => {
                const response = await fetch('/wp-json/wp/v2/pages', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings?.nonce || ''
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            }, pageData);
        }
        
        console.log('📦 API Response:', JSON.stringify(result, null, 2).substring(0, 500));
        
        if (result.id) {
            console.log(`✅ Page saved! ID: ${result.id}`);
            console.log(`🔗 URL: ${result.link}`);
            
            // Save result
            fs.writeFileSync('/data/.openclaw/workspace/steinegger-it/deploy-result.json', JSON.stringify(result, null, 2));
            return { success: true, pageId: result.id, url: result.link };
        } else {
            console.error('❌ Failed to save page:', result);
            return { success: false, error: result };
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-api.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

deploy().then(result => {
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
});