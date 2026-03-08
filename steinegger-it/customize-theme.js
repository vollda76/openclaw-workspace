const puppeteer = require('puppeteer');
const fs = require('fs');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract CSS from wordpress-blocks.html
const blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
const cssMatch = blockContent.match(/<style>([\s\S]*?)<\/style>/);
const CUSTOM_CSS = cssMatch ? cssMatch[1] : '';

async function customize() {
    console.log('🎨 Customizing WordPress theme...\n');
    
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
        
        // 2. Add Custom CSS via Customizer
        console.log('\n🎨 Adding custom CSS...');
        
        // Try direct CSS API endpoint
        const customCssResult = await page.evaluate(async (css) => {
            try {
                // Get current theme mod
                const response = await fetch('/wp-json/wp/v2/settings', {
                    method: 'GET',
                    credentials: 'include'
                });
                const settings = await response.json();
                
                // Update custom CSS
                const updateResponse = await fetch('/wp-json/wp/v2/settings', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        // Try different custom CSS options
                        custom_css: css
                    })
                });
                
                return await updateResponse.text();
            } catch (e) {
                return { error: e.message };
            }
        }, CUSTOM_CSS);
        
        console.log('CSS API response:', typeof customCssResult === 'string' ? customCssResult.substring(0, 200) : customCssResult);
        
        // 3. Create Contact Form 7 form
        console.log('\n📝 Creating Contact Form 7...');
        await page.goto(`${WP_ADMIN}/admin.php?page=wpcf7-new`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        // Check if we're on the new form page
        const formTitle = await page.$('#title, input[name="post_title"]');
        if (formTitle) {
            console.log('Creating new contact form...');
            
            // Set title
            await page.type('#title, input[name="post_title"]', 'Kontaktformular Steinegger IT');
            
            // Set form content
            const formTemplate = `
<div class="contact-form">
    <div class="form-group">
        <label for="name">Name *</label>
        [text* name placeholder "Ihr Name"]
    </div>
    <div class="form-group">
        <label for="email">E-Mail *</label>
        [email* email placeholder "ihre@email.ch"]
    </div>
    <div class="form-group">
        <label for="firma">Firma</label>
        [text firma placeholder "Firmenname (optional)"]
    </div>
    <div class="form-group">
        <label for="telefon">Telefon</label>
        [tel telefon placeholder "+41 00 000 00 00"]
    </div>
    <div class="form-group">
        <label for="nachricht">Nachricht *</label>
        [textarea* nachricht placeholder "Wie können wir Ihnen helfen?"]
    </div>
    <div class="form-group">
        [submit "Nachricht senden"]
    </div>
</div>`;
            
            await page.evaluate((content) => {
                const formField = document.querySelector('#wpcf7-form, textarea[name="wpcf7-form"], #content');
                if (formField) {
                    formField.value = content;
                }
            }, formTemplate);
            
            // Save
            const saveBtn = await page.$('#publish, .button-primary, input[type="submit"]');
            if (saveBtn) {
                await saveBtn.click();
                await wait(3000);
            }
            
            console.log('✅ Contact form created');
        }
        
        // 4. Get the form shortcode
        await page.goto(`${WP_ADMIN}/admin.php?page=wpcf7`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        const formShortcode = await page.evaluate(() => {
            const firstForm = document.querySelector('.wpcf7-form, #the-list tr:first-child');
            if (firstForm) {
                const idMatch = firstForm.innerHTML.match(/post=(\d+)/);
                if (idMatch) {
                    return `[contact-form-7 id="${idMatch[1]}"]`;
                }
            }
            return null;
        });
        
        console.log(`📝 Form shortcode: ${formShortcode || 'Could not find'}`);
        
        // 5. Update the page to include the contact form
        if (formShortcode) {
            console.log('\n📄 Updating page with contact form...');
            
            // Get current page content
            const pageContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
            
            // Replace placeholder with shortcode
            const updatedContent = pageContent.replace(
                /Hier können Sie ein Kontaktformular-Plugin \(z\.B\. Contact Form 7 oder WPForms\) einfügen\.?/gi,
                formShortcode
            );
            
            // Also replace the contact form section placeholder
            const finalContent = updatedContent.replace(
                /<!-- wp:paragraph -->\s*<p>Hier können Sie ein Kontaktformular-Plugin[\s\S]*?<!-- \/wp:paragraph -->/gi,
                `<!-- wp:shortcode -->\n${formShortcode}\n<!-- /wp:shortcode -->`
            );
            
            // Update via REST API
            const nonce = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const match = (script.textContent || '').match(/"nonce":"([^"]+)"/);
                    if (match) return match[1];
                }
                return null;
            });
            
            const updateResult = await page.evaluate(async (content, nonce) => {
                const response = await fetch('/wp-json/wp/v2/pages/11', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': nonce || ''
                    },
                    body: JSON.stringify({
                        content: content
                    })
                });
                return response.text();
            }, finalContent, nonce);
            
            console.log('Page update response:', updateResult.substring(0, 200));
        }
        
        // 6. Add Custom CSS via theme options (alternative method)
        console.log('\n🎨 Adding CSS via theme customizer...');
        await page.goto(`${WP_ADMIN}/customize.php`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(3000);
        
        // Look for additional CSS section
        const additionalCssSection = await page.$('li#accordion-section-custom_css, a[href*="custom_css"]');
        if (additionalCssSection) {
            await additionalCssSection.click();
            await wait(1000);
            
            const cssTextarea = await page.$('#customize-control-custom_css textarea, .custom-css-textarea');
            if (cssTextarea) {
                await cssTextarea.click();
                await page.evaluate((css) => {
                    const textarea = document.querySelector('#customize-control-custom_css textarea, .custom-css-textarea');
                    if (textarea) {
                        textarea.value = css;
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, CUSTOM_CSS);
                
                // Save
                const saveBtn = await page.$('#save, .customize-save, button.save');
                if (saveBtn) {
                    await saveBtn.click();
                    await wait(2000);
                }
            }
        }
        
        // 7. Check theme and maybe switch to a better one
        console.log('\n🎨 Checking available themes...');
        await page.goto(`${WP_ADMIN}/theme-install.php?browse=popular`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        // Look for block-friendly themes
        const themes = await page.evaluate(() => {
            const themeCards = document.querySelectorAll('.theme, .theme-card');
            return Array.from(themeCards).slice(0, 5).map(card => ({
                name: card.querySelector('.theme-name, h3')?.textContent?.trim(),
                author: card.querySelector('.theme-author')?.textContent?.trim()
            }));
        });
        
        console.log('Popular themes:', themes);
        
        // 8. Go back to themes page to check current
        await page.goto(`${WP_ADMIN}/themes.php`, { waitUntil: 'networkidle2', timeout: 30000 });
        await wait(2000);
        
        const activeTheme = await page.evaluate(() => {
            const active = document.querySelector('.theme.active');
            return active?.querySelector('.theme-name')?.textContent?.trim() || 'Unknown';
        });
        
        console.log(`\n✅ Active theme: ${activeTheme}`);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/final-theme.png' });
        
        // 9. Clear cache if WP Rocket or similar
        console.log('\n🧹 Clearing cache...');
        await page.goto(`${WP_ADMIN}/admin.php?page=wp-rocket`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await page.goto(`${WP_ADMIN}/plugins.php`, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Clear all caches button
        const clearCacheBtn = await page.$('a[href*="purge"], a[href*="clear-cache"], button.clear-cache');
        if (clearCacheBtn) {
            await clearCacheBtn.click();
            await wait(1000);
            console.log('Cache cleared');
        }
        
        console.log('\n✅ Theme customization completed!');
        console.log('\n🔗 View your site: https://vicaworld.cloud/steinegger-it/');
        
        return { 
            success: true, 
            theme: activeTheme,
            formShortcode
        };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-customize.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

customize().then(result => {
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
});