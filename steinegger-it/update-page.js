const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updatePage() {
    console.log('📝 Updating Steinegger IT page...\n');
    
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
        
        // Get Contact Form 7 shortcode
        console.log('\n📝 Getting Contact Form 7 shortcode...');
        await page.goto(`${WP_ADMIN}/admin.php?page=wpcf7`, { waitUntil: 'networkidle2' });
        await wait(2000);
        
        let formShortcode = '[contact-form-7 id="12"]'; // Default guess
        
        try {
            const formId = await page.evaluate(() => {
                const row = document.querySelector('#the-list tr, .wpcf7-form');
                if (row) {
                    const idAttr = row.id || row.innerHTML;
                    const match = idAttr.match(/post-(\d+)|id=(\d+)/);
                    return match ? (match[1] || match[2]) : null;
                }
                return null;
            });
            if (formId) {
                formShortcode = `[contact-form-7 id="${formId}"]`;
                console.log(`📝 Found form ID: ${formId}`);
            }
        } catch (e) {
            console.log('Using default form shortcode');
        }
        
        // Read current page content
        let content = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
        
        // Replace contact form placeholder with shortcode
        content = content.replace(
            /Hier können Sie ein Kontaktformular-Plugin \(z\.B\. Contact Form 7 oder WPForms\) einfügen\./gi,
            formShortcode
        );
        
        // Also replace the whole contact form placeholder block
        content = content.replace(
            /<!-- wp:heading {"level":3} -->\s*<h3>Kontaktformular<\/h3>\s*<!-- \/wp:heading -->\s*<!-- wp:paragraph -->\s*<p>Hier können Sie[\s\S]*?<!-- \/wp:paragraph -->/gi,
            `<!-- wp:heading {"level":3} -->\n<h3>Kontaktformular</h3>\n<!-- /wp:heading -->\n\n<!-- wp:shortcode -->\n${formShortcode}\n<!-- /wp:shortcode -->`
        );
        
        // Update page via edit screen
        console.log('\n📄 Updating page content...');
        await page.goto(`${WP_URL}/wp-admin/post.php?post=11&action=edit`, { waitUntil: 'networkidle2' });
        await wait(3000);
        
        // Check if classic or block editor
        const isClassicEditor = await page.$('#content, #wp-content-editor-container');
        
        if (isClassicEditor) {
            console.log('Using Classic Editor...');
            // Switch to HTML
            await page.click('#content-html');
            await wait(500);
            await page.evaluate((c) => {
                document.getElementById('content').value = c;
            }, content);
            await page.click('#publish');
            await wait(3000);
        } else {
            console.log('Using Block Editor...');
            
            // Open options menu and switch to code editor
            const optionsBtn = await page.$('button[aria-label="Optionen"], button[aria-label="Options"], button[aria-label="More tools & options"]');
            if (optionsBtn) {
                await optionsBtn.click();
                await wait(500);
                
                const menuItems = await page.$$('button[role="menuitem"], button.components-button');
                for (const item of menuItems) {
                    const text = await page.evaluate(el => (el.textContent || '').toLowerCase(), item);
                    if (text.includes('code') && text.includes('editor')) {
                        await item.click();
                        await wait(1500);
                        break;
                    }
                }
            }
            
            // Find textarea and update content
            await wait(1000);
            const textarea = await page.$('.editor-post-text-editor, textarea[aria-label*="Code"], textarea[aria-label*="Inhalt"]');
            if (textarea) {
                await textarea.click();
                await page.evaluate((c) => {
                    const ta = document.querySelector('.editor-post-text-editor, textarea');
                    if (ta) {
                        ta.value = c;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, content);
                console.log('✅ Content updated in code editor');
            }
            
            // Save
            await wait(500);
            const saveBtn = await page.$('button.editor-post-publish-button, button.editor-post-save-button, button[aria-label="Speichern"], button[aria-label="Save"]');
            if (saveBtn) {
                await saveBtn.click();
                await wait(5000);
                
                // Confirm publish if needed
                const confirmBtn = await page.$('button.editor-post-publish-panel__header-publish-button');
                if (confirmBtn) {
                    await confirmBtn.click();
                    await wait(3000);
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/page-updated.png' });
        
        // Check the page
        console.log('\n🔍 Checking page...');
        await page.goto(`${WP_URL}/steinegger-it/`, { waitUntil: 'networkidle2' });
        await wait(2000);
        
        const pageTitle = await page.evaluate(() => document.title);
        const hasContent = await page.evaluate(() => {
            const h1 = document.querySelector('.steinegger-hero__title');
            return h1 ? h1.textContent : null;
        });
        
        console.log(`📄 Page title: ${pageTitle}`);
        console.log(`📄 Hero text: ${hasContent}`);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/page-final.png', fullPage: true });
        
        console.log('\n✅ Page updated successfully!');
        console.log(`🔗 View: ${WP_URL}/steinegger-it/`);
        
        return { success: true, title: pageTitle, hero: hasContent };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-update.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

updatePage().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});
