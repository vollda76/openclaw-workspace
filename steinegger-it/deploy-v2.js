const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deploy() {
    console.log('🚀 Starting WordPress deployment...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    // Set longer timeout
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
        
        // 2. Get nonce for REST API
        console.log('🔐 Getting REST API nonce...');
        await page.goto(`${WP_ADMIN}/`, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const nonce = await page.evaluate(() => {
            // Try different ways to get nonce
            if (window.wpApiSettings?.nonce) return window.wpApiSettings.nonce;
            
            // Look for nonce in the page
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const text = script.textContent || '';
                const match = text.match(/"nonce":"([^"]+)"/);
                if (match) return match[1];
            }
            
            // Look for wpApiSettings in inline scripts
            const inlineScripts = document.querySelectorAll('script:not([src])');
            for (const script of inlineScripts) {
                const text = script.textContent || '';
                const match = text.match(/wpApiSettings\s*=\s*({[^}]+})/);
                if (match) {
                    try {
                        const settings = JSON.parse(match[1]);
                        if (settings.nonce) return settings.nonce;
                    } catch (e) {}
                }
            }
            
            return null;
        });
        
        console.log(`🔑 Nonce: ${nonce ? nonce.substring(0, 10) + '...' : 'not found'}`);
        
        // 3. Get cookies for authenticated request
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // 4. Read content
        const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
        
        // 5. Check for existing pages
        console.log('🔍 Checking for existing pages...');
        
        const existingPagesResponse = await page.evaluate(async () => {
            const response = await fetch('/wp-json/wp/v2/pages?per_page=100', {
                credentials: 'include'
            });
            return response.text();
        });
        
        let existingPages = [];
        try {
            existingPages = JSON.parse(existingPagesResponse);
        } catch (e) {
            console.log('Could not parse pages response');
        }
        
        let existingPageId = null;
        if (Array.isArray(existingPages)) {
            for (const p of existingPages) {
                if (p.title?.rendered?.toLowerCase().includes('steinegger')) {
                    existingPageId = p.id;
                    console.log(`📝 Found existing page: ${p.title.rendered} (ID: ${p.id})`);
                    break;
                }
            }
        }
        
        // 6. Create or update page via REST API
        const pageData = {
            title: 'Steinegger IT - IT-Dienstleister für das Seeland',
            content: blockContent,
            status: 'publish',
            slug: 'steinegger-it'
        };
        
        const endpoint = existingPageId 
            ? `/wp-json/wp/v2/pages/${existingPageId}`
            : '/wp-json/wp/v2/pages';
        
        console.log(`📦 ${existingPageId ? 'Updating' : 'Creating'} page via REST API...`);
        
        const resultText = await page.evaluate(async (url, method, data, nonce) => {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            if (nonce) {
                headers['X-WP-Nonce'] = nonce;
            }
            
            const response = await fetch(url, {
                method: method,
                credentials: 'include',
                headers: headers,
                body: JSON.stringify(data)
            });
            
            const text = await response.text();
            return text;
        }, endpoint, existingPageId ? 'POST' : 'POST', pageData, nonce);
        
        console.log('📦 API Response (first 500 chars):', resultText.substring(0, 500));
        
        let result;
        try {
            result = JSON.parse(resultText);
        } catch (e) {
            console.log('Could not parse JSON response');
            result = { raw: resultText };
        }
        
        if (result.id) {
            console.log(`✅ Page saved! ID: ${result.id}`);
            console.log(`🔗 URL: ${result.link || `${WP_URL}/${result.slug}/`}`);
            
            fs.writeFileSync('/data/.openclaw/workspace/steinegger-it/deploy-result.json', JSON.stringify(result, null, 2));
            
            return { success: true, pageId: result.id, url: result.link };
        } else if (result.code) {
            console.error(`❌ API Error: ${result.code} - ${result.message}`);
            
            // Try alternative: use admin-ajax
            console.log('🔄 Trying admin-ajax fallback...');
            
            const ajaxResult = await page.evaluate(async (content) => {
                const formData = new FormData();
                formData.append('action', 'wp_create_page'); // Custom action, might not exist
                formData.append('post_title', 'Steinegger IT - IT-Dienstleister für das Seeland');
                formData.append('post_content', content);
                formData.append('post_type', 'page');
                formData.append('post_status', 'publish');
                
                const response = await fetch('/wp-admin/admin-ajax.php', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                
                return response.text();
            }, blockContent);
            
            console.log('Admin-ajax response:', ajaxResult.substring(0, 200));
        }
        
        // 7. Fallback: Use browser to create page
        if (!result.id) {
            console.log('🔄 Falling back to browser automation...');
            
            // Navigate to new page screen
            await page.goto(`${WP_ADMIN}/post-new.php?post_type=page`, { waitUntil: 'networkidle2', timeout: 30000 });
            await wait(3000);
            
            // Check for classic editor
            const classicEditor = await page.$('#content, #wp-content-editor-container');
            
            if (classicEditor) {
                console.log('📝 Using Classic Editor...');
                
                await page.type('#title', 'Steinegger IT - IT-Dienstleister für das Seeland');
                
                // Switch to HTML
                await page.click('#content-html');
                await wait(500);
                
                await page.evaluate((content) => {
                    document.getElementById('content').value = content;
                }, blockContent);
                
                await page.click('#publish');
                await wait(5000);
                
            } else {
                console.log('📝 Using Gutenberg Block Editor...');
                
                // Title
                await page.click('#post-title-0', { clickCount: 3 });
                await page.type('#post-title-0', 'Steinegger IT - IT-Dienstleister für das Seeland');
                await wait(500);
                
                // Open options menu
                const optionsBtn = await page.$('button[aria-label="Optionen"], button[aria-label="Options"], .editor-more-menu button');
                if (optionsBtn) {
                    await optionsBtn.click();
                    await wait(500);
                    
                    // Find code editor toggle
                    const menuItems = await page.$$('button[role="menuitem"], .components-menu-item__button, button.components-button');
                    for (const item of menuItems) {
                        try {
                            const text = await page.evaluate(el => (el.textContent || '').toLowerCase(), item);
                            if (text.includes('code') || text.includes('code-editor')) {
                                await item.click();
                                await wait(1500);
                                break;
                            }
                        } catch (e) {}
                    }
                }
                
                // Find textarea
                const textarea = await page.$('.editor-post-text-editor, textarea');
                if (textarea) {
                    await textarea.click();
                    await page.evaluate((content) => {
                        const ta = document.querySelector('.editor-post-text-editor, textarea');
                        if (ta) {
                            ta.value = content;
                            ta.dispatchEvent(new Event('input', { bubbles: true }));
                            ta.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, blockContent);
                }
                
                await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/content-inserted.png' });
                
                // Save
                const saveBtn = await page.$('button.editor-post-publish-button, button.editor-post-save-button');
                if (saveBtn) {
                    await saveBtn.click();
                    await wait(3000);
                    
                    // Confirm if needed
                    const confirmBtn = await page.$('button.editor-post-publish-panel__header-publish-button');
                    if (confirmBtn) {
                        await confirmBtn.click();
                        await wait(3000);
                    }
                }
            }
            
            await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/final.png' });
            
            // Get URL
            const pageUrl = await page.evaluate(() => {
                const viewLink = document.querySelector('#sample-permalink a, .editor-post-url__link, a[href*="steinegger"]');
                return viewLink ? viewLink.href : window.location.href;
            });
            
            console.log(`🔗 Page URL: ${pageUrl}`);
            return { success: true, url: pageUrl, method: 'browser' };
        }
        
        return { success: false, error: 'Could not create page', result };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error.png' });
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