const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract CSS
const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
const cssMatch = blockContent.match(/<style>([\s\S]*?)<\/style>/);
const CUSTOM_CSS = cssMatch ? cssMatch[1] : '';

async function fixCSS() {
    console.log('🎨 Fixing CSS on WordPress...\n');
    
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
        
        // 1. Try to add CSS via Customizer
        console.log('\n🎨 Opening Customizer...');
        await page.goto(`${WP_ADMIN}/customize.php`, { waitUntil: 'networkidle2' });
        await wait(5000);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/customizer-open.png' });
        
        // Look for Additional CSS section
        console.log('🔍 Looking for Additional CSS section...');
        
        // Try to find and click the Additional CSS section
        const cssSection = await page.$('#accordion-section-custom_css, a[href*="custom_css"], button[aria-label*="CSS"], button[aria-label*="Additional"]');
        if (cssSection) {
            await cssSection.click();
            await wait(2000);
            console.log('✅ Found CSS section');
        } else {
            // Try alternative: look in the panel
            const panels = await page.$$('.accordion-section-content');
            console.log(`Found ${panels.length} panels`);
            
            // Search for textarea
            const textareas = await page.$$('textarea');
            console.log(`Found ${textareas.length} textareas`);
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/customizer-expanded.png' });
        
        // Look for any textarea
        const textarea = await page.$('textarea#custom_css_textarea, textarea.custom-css-textarea, textarea[aria-label*="CSS"], textarea[placeholder*="CSS"]');
        
        if (textarea) {
            console.log('✅ Found CSS textarea, adding custom CSS...');
            
            await textarea.click();
            await page.evaluate((css) => {
                const ta = document.querySelector('textarea#custom_css_textarea, textarea.custom-css-textarea, textarea[aria-label*="CSS"]');
                if (ta) {
                    ta.value = css;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, CUSTOM_CSS);
            
            await wait(2000);
            
            // Save
            const saveBtn = await page.$('button#save, button.customize-save, button[data-customize-action="save"]');
            if (saveBtn) {
                await saveBtn.click();
                await wait(5000);
                console.log('✅ CSS saved!');
            }
        } else {
            console.log('⚠️ Could not find CSS textarea in customizer');
            
            // Alternative: Use theme editor
            console.log('\n📝 Trying Theme Editor...');
            await page.goto(`${WP_ADMIN}/theme-editor.php`, { waitUntil: 'networkidle2' });
            await wait(3000);
            
            await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/theme-editor.png' });
            
            // Check if there's a warning/error
            const error = await page.$('.error, .notice-warning');
            if (error) {
                const errorText = await page.evaluate(el => el.textContent, error);
                console.log(`Editor error: ${errorText.substring(0, 200)}`);
            }
            
            // Look for style.css textarea
            const styleEditor = await page.$('#newcontent, textarea#newcontent');
            if (styleEditor) {
                console.log('✅ Found style.css editor');
                
                // Get current content
                const currentContent = await page.evaluate(() => {
                    return document.querySelector('#newcontent')?.value || '';
                });
                
                // Append our CSS
                const newContent = currentContent + '\n\n/* Steinegger IT Custom Styles */\n' + CUSTOM_CSS;
                
                await page.evaluate((content) => {
                    const editor = document.querySelector('#newcontent');
                    if (editor) {
                        editor.value = content;
                        editor.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, newContent);
                
                await wait(1000);
                
                // Submit
                const submitBtn = await page.$('#submit, input[type="submit"]');
                if (submitBtn) {
                    await submitBtn.click();
                    await wait(3000);
                    console.log('✅ CSS added to style.css');
                }
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/css-added.png' });
        
        // 2. Check the page
        console.log('\n🔍 Checking page...');
        await page.goto(`${WP_URL}/steinegger-it/`, { waitUntil: 'networkidle2' });
        await wait(3000);
        
        // Check if our CSS is present
        const hasCustomCSS = await page.evaluate(() => {
            const styles = document.querySelectorAll('style');
            for (const style of styles) {
                if (style.textContent.includes('.steinegger-hero')) {
                    return true;
                }
            }
            return false;
        });
        
        console.log(`Custom CSS present: ${hasCustomCSS}`);
        
        // Check hero section
        const heroTitle = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent : null;
        });
        
        console.log(`Page H1: ${heroTitle}`);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/page-check.png', fullPage: true });
        
        console.log('\n✅ CSS fix completed!');
        console.log(`🔗 View: ${WP_URL}/steinegger-it/`);
        
        return { success: true, hasCustomCSS, heroTitle };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-fix.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

fixCSS().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});