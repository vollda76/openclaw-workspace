const puppeteer = require('puppeteer');

const WP_URL = 'https://vicaworld.cloud';
const WP_ADMIN = `${WP_URL}/wp-admin`;
const WP_USER = 'vollda@gmail.com';
const WP_PASS = 'EZM6xW1aRXmcvr6WYr4ynTS37c!Jaxt';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function addCustomCSS() {
    console.log('🎨 Adding custom CSS via Site Editor...\n');
    
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
        
        // Go to Site Editor
        console.log('\n📝 Opening Site Editor...');
        await page.goto(`${WP_ADMIN}/site-editor.php`, { waitUntil: 'networkidle2' });
        await wait(5000);
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/site-editor.png' });
        
        // Look for Styles button (bottom right, usually a half-moon icon or "Styles" text)
        console.log('🔍 Looking for Styles panel...');
        
        const stylesButton = await page.$('button[aria-label*="Styles"], button[aria-label*="styles"], .editor-styles-button, button[aria-label*="Design"]');
        
        if (stylesButton) {
            await stylesButton.click();
            await wait(2000);
            console.log('✅ Styles panel opened');
        } else {
            // Try clicking on the canvas settings
            console.log('Trying alternative...');
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/styles-panel.png' });
        
        // Look for Additional CSS or Custom CSS option
        const cssButton = await page.$('button[aria-label*="CSS"], button[aria-label*="Additional"], button:has-text("CSS")');
        
        if (cssButton) {
            await cssButton.click();
            await wait(1000);
            console.log('✅ CSS editor found');
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/css-editor.png' });
        
        // Try to find textarea
        const textarea = await page.$('textarea[aria-label*="CSS"], textarea[placeholder*="CSS"], .components-textarea');
        
        if (textarea) {
            console.log('✅ Found CSS textarea');
            
            const customCSS = `
:root{--primary-600:#2083B8;--primary-700:#1A6B96;--primary-800:#145374;--primary-900:#0C2D48;--primary-500:#2E9CCA;--primary-400:#5FB4D9;--primary-100:#E8F4FA;--primary-50:#F5FAFD;--accent-green:#10B981;--gray-900:#111827;--gray-800:#1F2937;--gray-700:#374151;--gray-600:#4B5563;--gray-500:#6B7280;--gray-400:#9CA3AF;--gray-300:#D1D5DB;--gray-200:#E5E7EB;--gray-100:#F3F4F6;--gray-50:#F9FAFB}
.steinegger-hero{background:linear-gradient(180deg,var(--primary-50) 0%,#fff 100%);padding:8rem 0 5rem;position:relative}
.steinegger-hero__badge{display:inline-flex;align-items:center;gap:.5rem;background:#fff;padding:.5rem 1rem;border-radius:9999px;font-size:.875rem;font-weight:500;color:var(--primary-700);margin-bottom:1.5rem;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);border:1px solid var(--gray-200)}
.steinegger-hero__badge-dot{width:8px;height:8px;background:var(--accent-green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
.steinegger-hero__title{font-size:clamp(2.5rem,5vw,3.75rem);font-weight:800;line-height:1.1;color:var(--gray-900);margin-bottom:1.5rem}
.steinegger-hero__title-highlight{background:linear-gradient(135deg,var(--primary-700) 0%,var(--primary-500) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.steinegger-hero__description{font-size:1.2rem;color:var(--gray-600);margin-bottom:2rem;line-height:1.8}
.steinegger-hero__stats{display:flex;gap:3rem;margin-top:3rem;flex-wrap:wrap}
.steinegger-hero__stat-number{font-size:2.25rem;font-weight:800;color:var(--primary-600)}
.steinegger-hero__stat-label{font-size:.875rem;color:var(--gray-500)}
.steinegger-trust-bar{background:#fff;border-bottom:1px solid var(--gray-200);padding:1.5rem 0}
.steinegger-service-card{background:#fff;border:1px solid var(--gray-200);border-radius:1rem;padding:2rem;transition:all .2s ease}
.steinegger-service-card:hover{transform:translateY(-5px);box-shadow:0 20px 25px -5px rgba(0,0,0,.1)}
.steinegger-service-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(135deg,var(--primary-700) 0%,var(--primary-500) 100%)}
.steinegger-service-card__icon{font-size:2.5rem;margin-bottom:1rem}
.steinegger-service-card__title{font-size:1.25rem;font-weight:700;color:var(--gray-900);margin-bottom:.5rem}
.steinegger-service-card__description{color:var(--gray-600);line-height:1.7}
.steinegger-service-card__list{list-style:none;padding:0}
.steinegger-service-card__list li{display:flex;align-items:center;gap:.5rem;color:var(--gray-600);font-size:.875rem;margin-bottom:.5rem}
.steinegger-service-card__list li::before{content:'✓';color:var(--accent-green);font-weight:600}
.steinegger-section-tag{display:inline-flex;align-items:center;gap:.5rem;background:var(--primary-100);color:var(--primary-700);padding:.5rem 1rem;border-radius:9999px;font-size:.875rem;font-weight:600;margin-bottom:1rem}
.steinegger-section-title{font-size:clamp(2rem,4vw,2.75rem);font-weight:800;color:var(--gray-900);margin-bottom:1rem;line-height:1.2}
.steinegger-why-card{background:rgba(255,255,255,.1);border-radius:1rem;padding:2rem;text-align:center}
.steinegger-why-card:hover{background:rgba(255,255,255,.15);transform:translateY(-5px)}
.steinegger-process-step__number{width:80px;height:80px;background:var(--primary-600);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;margin:0 auto 1.5rem}
.steinegger-testimonial{background:#fff;border:1px solid var(--gray-200);border-radius:1rem;padding:2rem}
.steinegger-testimonial:hover{box-shadow:0 20px 25px -5px rgba(0,0,0,.1);transform:translateY(-5px)}
.steinegger-testimonial__stars{color:#FBBF24;font-size:1.25rem;margin-bottom:1rem}
.steinegger-cta{background:linear-gradient(135deg,var(--primary-800) 0%,var(--primary-600) 100%);color:#fff;padding:4rem 0;text-align:center}
.steinegger-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:1rem 2rem;border-radius:.75rem;font-weight:600;text-decoration:none}
.steinegger-btn--primary{background:var(--primary-600);color:#fff}
.steinegger-btn--primary:hover{background:var(--primary-700);transform:translateY(-2px)}
.steinegger-btn--white{background:#fff;color:var(--primary-700)}
.steinegger-btn--white:hover{transform:translateY(-2px);box-shadow:0 10px 15px -3px rgba(0,0,0,.1)}
.steinegger-location-tag{display:inline-block;background:#fff;border:1px solid var(--gray-300);padding:.5rem 1rem;border-radius:9999px;font-size:.9rem;margin:.25rem}
.steinegger-feature{display:flex;align-items:flex-start;gap:1rem}
.steinegger-feature__icon{width:44px;height:44px;background:var(--primary-100);border-radius:.75rem;display:flex;align-items:center;justify-content:center;font-size:1.25rem}
@media(max-width:768px){.steinegger-hero__stats{flex-wrap:wrap;gap:1.5rem}}
`;
            
            await page.evaluate((css) => {
                const ta = document.querySelector('textarea[aria-label*="CSS"], textarea[placeholder*="CSS"], .components-textarea');
                if (ta) {
                    ta.value = css;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, customCSS);
            
            await wait(2000);
            
            // Save
            const saveBtn = await page.$('button[aria-label*="Save"], button[aria-label*="Speichern"], .editor-save-post');
            if (saveBtn) {
                await saveBtn.click();
                await wait(5000);
                console.log('✅ CSS saved!');
            }
        }
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/css-added.png' });
        
        // Check the page
        console.log('\n🔍 Checking page...');
        await page.goto(`${WP_URL}/steinegger-it/`, { waitUntil: 'networkidle2' });
        await wait(3000);
        
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
        
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/page-final.png', fullPage: true });
        
        return { success: true, hasCustomCSS };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/data/.openclaw/workspace/steinegger-it/screenshots/error-site-editor.png' });
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

addCustomCSS().then(r => {
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});