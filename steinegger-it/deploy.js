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
        
        console.log('✅ Logged in successfully');
        
        // 2. Go to Pages
        console.log('📄 Navigating to Pages...');
        await page.goto(`${WP_ADMIN}/edit.php?post_type=page`, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/pages-list.png' });
        
        // 3. Check for existing page
        let editUrl = null;
        try {
            const pageLinks = await page.$$eval('.page-title a, .column-title a', links => 
                links.map(l => ({ title: l.textContent.trim(), href: l.href }))
            );
            
            for (const link of pageLinks) {
                if (link.title.toLowerCase().includes('steinegger')) {
                    editUrl = link.href;
                    console.log(`📝 Found existing page: ${link.title}`);
                    break;
                }
            }
        } catch (e) {
            console.log('No existing pages found');
        }
        
        // 4. Create or edit page
        if (editUrl) {
            await page.goto(editUrl, { waitUntil: 'networkidle2' });
        } else {
            console.log('🆕 Creating new page...');
            await page.goto(`${WP_ADMIN}/post-new.php?post_type=page`, { waitUntil: 'networkidle2' });
        }
        
        await wait(2000);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/editor-initial.png' });
        
        // 5. Set title
        console.log('📝 Setting title...');
        const titleInput = await page.$('#title, #post-title-0');
        if (titleInput) {
            await page.evaluate(() => {
                const titleEl = document.querySelector('#title, #post-title-0');
                if (titleEl) titleEl.value = '';
            });
            await page.type('#title, #post-title-0', 'Steinegger IT - IT-Dienstleister für das Seeland');
        }
        
        await wait(500);
        
        // 6. Try classic editor first
        const classicEditor = await page.$('#content, #wp-content-editor-container');
        
        if (classicEditor) {
            console.log('📝 Using Classic Editor...');
            
            // Switch to HTML tab
            const htmlTab = await page.$('#content-html, .wp-switch-editor.switch-html');
            if (htmlTab) {
                await htmlTab.click();
                await wait(500);
            }
            
            // Insert content
            const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
            await page.evaluate((content) => {
                const editor = document.querySelector('#content, textarea.wp-editor-area');
                if (editor) {
                    editor.value = content;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, blockContent);
            
        } else {
            console.log('📝 Using Block Editor (Gutenberg)...');
            
            // Try to use the code editor mode
            const moreOptions = await page.$('button[aria-label="Optionen"], button[aria-label="More tools & options"], .editor-more-menu button');
            if (moreOptions) {
                await moreOptions.click();
                await wait(500);
                await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/more-menu.png' });
                
                // Look for code editor option
                const menuItems = await page.$$('button[role="menuitem"], .components-menu-item__button');
                for (const item of menuItems) {
                    const text = await page.evaluate(el => el.textContent, item);
                    if (text.includes('Code') || text.includes('Code-Editor')) {
                        await item.click();
                        await wait(1000);
                        break;
                    }
                }
            }
            
            // Try direct approach: click on editor and type
            const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
            
            // Find the block editor area
            const editorArea = await page.$('.editor-post-text-editor, .block-editor-default-block-appender, [data-type="core/html"]');
            
            if (editorArea) {
                await editorArea.click();
                await wait(300);
                
                // Paste content using keyboard
                await page.evaluate((content) => {
                    navigator.clipboard.writeText(content);
                }, blockContent);
                
                await page.keyboard.down('Control');
                await page.keyboard.press('v');
                await page.keyboard.up('Control');
            } else {
                // Alternative: add custom HTML block
                const inserter = await page.$('.block-editor-inserter__toggle, button[aria-label="Block hinzufügen"], button[aria-label="Add block"]');
                if (inserter) {
                    await inserter.click();
                    await wait(800);
                    
                    const searchInput = await page.$('.block-editor-inserter__search input, input.components-search-control__input');
                    if (searchInput) {
                        await searchInput.type('Custom HTML');
                        await wait(500);
                        
                        const htmlBlock = await page.$('.block-editor-block-types-list__item[aria-label*="HTML"], button[aria-label*="HTML"]');
                        if (htmlBlock) {
                            await htmlBlock.click();
                            await wait(500);
                        }
                    }
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/after-content.png' });
        
        // 7. Save/Publish
        console.log('💾 Saving page...');
        
        // Try different save button selectors
        const saveSelectors = [
            '#publish',
            '#save-post', 
            'button.editor-post-publish-button',
            'button.editor-post-save-button',
            'button[aria-label="Veröffentlichen"]',
            'button[aria-label="Speichern"]',
            'button[aria-label="Publish"]',
            'button[aria-label="Save"]'
        ];
        
        for (const selector of saveSelectors) {
            const btn = await page.$(selector);
            if (btn) {
                const isVisible = await btn.isIntersectingViewport();
                if (isVisible) {
                    await btn.click();
                    console.log(`Clicked: ${selector}`);
                    await wait(3000);
                    break;
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/after-save.png' });
        
        // Check for confirmation
        const successMsg = await page.$('.notice-success, .updated, .components-snackbar__content');
        if (successMsg) {
            const msg = await page.evaluate(el => el.textContent, successMsg);
            console.log(`✅ ${msg}`);
        }
        
        // Get page URL
        const permalink = await page.$('#sample-permalink a, .editor-post-url__link');
        if (permalink) {
            const url = await page.evaluate(el => el.href, permalink);
            console.log(`🔗 Page URL: ${url}`);
        }
        
        console.log('✅ Deployment completed!');
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
    console.log('Done!', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
});