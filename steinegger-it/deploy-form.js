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
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // 1. Login
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
        
        // 2. Check for existing pages
        console.log('📄 Checking for existing pages...');
        await page.goto(`${WP_ADMIN}/edit.php?post_type=page`, { waitUntil: 'networkidle2' });
        
        let existingPageId = null;
        try {
            const pageRows = await page.$$eval('tr.iedit', rows => 
                rows.map(r => ({
                    id: r.id?.replace('post-', ''),
                    title: r.querySelector('.page-title, .column-title')?.textContent?.trim() || ''
                }))
            );
            
            for (const row of pageRows) {
                if (row.title.toLowerCase().includes('steinegger')) {
                    existingPageId = row.id;
                    console.log(`📝 Found existing page: ${row.title} (ID: ${row.id})`);
                    break;
                }
            }
        } catch (e) {
            console.log('No existing pages found');
        }
        
        // 3. Navigate to edit or create
        if (existingPageId) {
            await page.goto(`${WP_ADMIN}/post.php?post=${existingPageId}&action=edit`, { waitUntil: 'networkidle2' });
        } else {
            await page.goto(`${WP_ADMIN}/post-new.php?post_type=page`, { waitUntil: 'networkidle2' });
        }
        
        await wait(2000);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/page-editor.png' });
        
        // 4. Check which editor we're using
        const isClassicEditor = await page.$('#wp-content-editor-container, #content');
        
        if (isClassicEditor) {
            console.log('📝 Using Classic Editor...');
            
            // Set title
            const titleInput = await page.$('#title');
            if (titleInput) {
                await page.click('#title', { clickCount: 3 });
                await page.type('#title', 'Steinegger IT - IT-Dienstleister für das Seeland');
            }
            
            // Switch to HTML mode
            const htmlTab = await page.$('#content-html');
            if (htmlTab) {
                await htmlTab.click();
                await wait(500);
            }
            
            // Insert content
            const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
            await page.evaluate((content) => {
                const editor = document.getElementById('content');
                if (editor) {
                    editor.value = content;
                }
            }, blockContent);
            
            // Publish
            const publishBtn = await page.$('#publish');
            if (publishBtn) {
                await publishBtn.click();
                await wait(3000);
            }
            
        } else {
            console.log('📝 Using Block Editor (Gutenberg)...');
            
            // Set title
            const titleInput = await page.$('#post-title-0, .editor-post-title__input');
            if (titleInput) {
                await page.click('#post-title-0, .editor-post-title__input', { clickCount: 3 });
                await page.type('#post-title-0, .editor-post-title__input', 'Steinegger IT - IT-Dienstleister für das Seeland');
            }
            
            await wait(500);
            
            // Try to switch to Code Editor
            console.log('📝 Attempting to switch to Code Editor...');
            
            // Click the more options menu (three dots)
            const optionsBtn = await page.$('button[aria-label="Optionen"], button[aria-label="More tools & options"], .edit-site-more-menu button, .editor-more-menu button');
            if (optionsBtn) {
                await optionsBtn.click();
                await wait(500);
                
                // Find Code Editor option
                const buttons = await page.$$('button');
                for (const btn of buttons) {
                    const text = await page.evaluate(el => el.textContent || '', btn);
                    if (text.toLowerCase().includes('code') || text.toLowerCase().includes('code-editor')) {
                        await btn.click();
                        await wait(1000);
                        console.log('✅ Switched to Code Editor');
                        break;
                    }
                }
            }
            
            await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/code-editor-attempt.png' });
            
            // Look for text area in code editor mode
            const codeTextarea = await page.$('.editor-post-text-editor, textarea[aria-label*="Code"], textarea[aria-label*="Inhalt"]');
            
            if (codeTextarea) {
                console.log('📝 Found code textarea, inserting content...');
                const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
                
                await codeTextarea.click();
                await page.evaluate((content) => {
                    const textarea = document.querySelector('.editor-post-text-editor, textarea');
                    if (textarea) {
                        textarea.value = content;
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, blockContent);
            } else {
                // Fallback: Try to add Custom HTML block via keyboard shortcut
                console.log('📝 Trying to add blocks via keyboard...');
                
                // Click on the editor area to focus
                const editorArea = await page.$('.block-editor-writing-flow, .editor-styles-wrapper, .wp-block-post-content');
                if (editorArea) {
                    await editorArea.click();
                    await wait(300);
                }
                
                // Type slash to open block inserter
                await page.keyboard.press('/');
                await wait(500);
                
                // Type to search for custom HTML
                await page.keyboard.type('custom html');
                await wait(300);
                
                // Press Enter to select
                await page.keyboard.press('Enter');
                await wait(500);
                
                // Now paste the content
                const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
                await page.evaluate((content) => {
                    navigator.clipboard.writeText(content);
                }, blockContent);
                
                await page.keyboard.down('Control');
                await page.keyboard.press('v');
                await page.keyboard.up('Control');
                await wait(500);
            }
            
            await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/before-save.png' });
            
            // Save
            console.log('💾 Saving page...');
            
            // Click save button
            const saveBtn = await page.$('button.editor-post-publish-button, button.editor-post-save-button, button[aria-label="Veröffentlichen"], button[aria-label="Speichern"], button[aria-label="Publish"], button[aria-label="Save"]');
            if (saveBtn) {
                await saveBtn.click();
                await wait(3000);
                
                // Check if we need to confirm publish
                const confirmBtn = await page.$('button.editor-post-publish-panel__header-publish-button, button[aria-label="Jetzt veröffentlichen"], button[aria-label="Publish"]');
                if (confirmBtn) {
                    await confirmBtn.click();
                    await wait(2000);
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/after-save.png' });
        
        // Check for success
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // Try to get the page URL
        await page.goto(`${WP_ADMIN}/edit.php?post_type=page`, { waitUntil: 'networkidle2' });
        await wait(1000);
        
        // Find the page we just created
        const pageUrl = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr.iedit');
            for (const row of rows) {
                const title = row.querySelector('.page-title a, .column-title a');
                if (title && title.textContent.toLowerCase().includes('steinegger')) {
                    return title.href;
                }
            }
            return null;
        });
        
        if (pageUrl) {
            console.log(`✅ Page created/updated!`);
            console.log(`🔗 View page: ${pageUrl}`);
            return { success: true, url: pageUrl };
        }
        
        console.log('✅ Deployment completed! Check the screenshots.');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

deploy().then(result => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
});