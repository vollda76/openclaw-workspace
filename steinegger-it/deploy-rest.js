const fetch = require('node-fetch').default;

const WP_URL = 'https://vicaworld.cloud';
const WP_USER = 'vollda@gmail.com';
const WP_APP_PASS = 'MpQpKbGRIYuuLFfGewgG4gGx';

const auth = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString('base64');

async function deploy() {
    console.log('🚀 Deploying via REST API...\n');
    
    // Read the WordPress blocks content
    const fs = require('fs');
    let blockContent = fs.readFileSync('/data/.openclaw/workspace/steinegger-it/wordpress-blocks.html', 'utf8');
    
    // Replace contact form placeholder
    blockContent = blockContent.replace(
        /Hier können Sie ein Kontaktformular-Plugin \(z\.B\. Contact Form 7 oder WPForms\) einfügen\./gi,
        '[contact-form-7 id="12"]'
    );
    
    try {
        // 1. Update the page
        console.log('📄 Updating page content...');
        
        const pageResponse = await fetch(`${WP_URL}/wp-json/wp/v2/pages/11`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Steinegger IT - IT-Dienstleister für das Seeland',
                content: blockContent,
                status: 'publish',
                slug: 'steinegger-it'
            })
        });
        
        const pageResult = await pageResponse.json();
        
        if (pageResult.id) {
            console.log(`✅ Page updated! ID: ${pageResult.id}`);
            console.log(`🔗 URL: ${pageResult.link}`);
        } else {
            console.error('❌ Page update failed:', pageResult);
        }
        
        // 2. Add custom CSS via wp_global_styles or custom_css post type
        console.log('\n🎨 Adding custom CSS...');
        
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
.steinegger-trust-bar__container{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.steinegger-trust-bar__item{display:flex;align-items:center;gap:.5rem;color:var(--gray-600);font-size:.875rem}
.steinegger-service-card{background:#fff;border:1px solid var(--gray-200);border-radius:1rem;padding:2rem;transition:all .2s ease;position:relative;overflow:hidden}
.steinegger-service-card:hover{transform:translateY(-5px);box-shadow:0 20px 25px -5px rgba(0,0,0,.1);border-color:var(--primary-200)}
.steinegger-service-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(135deg,var(--primary-700) 0%,var(--primary-500) 100%)}
.steinegger-service-card__icon{font-size:2.5rem;margin-bottom:1rem}
.steinegger-service-card__title{font-size:1.25rem;font-weight:700;color:var(--gray-900);margin-bottom:.5rem}
.steinegger-service-card__description{color:var(--gray-600);line-height:1.7;margin-bottom:1rem}
.steinegger-service-card__list{list-style:none;padding:0}
.steinegger-service-card__list li{display:flex;align-items:center;gap:.5rem;color:var(--gray-600);font-size:.875rem;margin-bottom:.5rem}
.steinegger-service-card__list li::before{content:'✓';color:var(--accent-green);font-weight:600}
.steinegger-section-tag{display:inline-flex;align-items:center;gap:.5rem;background:var(--primary-100);color:var(--primary-700);padding:.5rem 1rem;border-radius:9999px;font-size:.875rem;font-weight:600;margin-bottom:1rem}
.steinegger-section-title{font-size:clamp(2rem,4vw,2.75rem);font-weight:800;color:var(--gray-900);margin-bottom:1rem;line-height:1.2}
.steinegger-section-subtitle{font-size:1.125rem;color:var(--gray-600);line-height:1.7}
.steinegger-why-card{background:rgba(255,255,255,.1);border-radius:1rem;padding:2rem;text-align:center;transition:all .2s ease}
.steinegger-why-card:hover{background:rgba(255,255,255,.15);transform:translateY(-5px)}
.steinegger-why-card__icon{font-size:2.5rem;margin-bottom:1rem}
.steinegger-why-card__title{font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
.steinegger-why-card__text{font-size:.95rem;opacity:.9;line-height:1.6}
.steinegger-process-step{text-align:center;position:relative}
.steinegger-process-step__number{width:80px;height:80px;background:var(--primary-600);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;margin:0 auto 1.5rem;box-shadow:0 10px 15px -3px rgba(0,0,0,.1)}
.steinegger-process-step__title{font-size:1.15rem;font-weight:700;color:var(--gray-900);margin-bottom:.5rem}
.steinegger-process-step__text{font-size:.9rem;color:var(--gray-500);line-height:1.6}
.steinegger-testimonial{background:#fff;border:1px solid var(--gray-200);border-radius:1rem;padding:2rem;transition:all .2s ease}
.steinegger-testimonial:hover{box-shadow:0 20px 25px -5px rgba(0,0,0,.1);transform:translateY(-5px)}
.steinegger-testimonial__stars{color:#FBBF24;font-size:1.25rem;margin-bottom:1rem}
.steinegger-testimonial__text{font-style:italic;color:var(--gray-700);line-height:1.8;margin-bottom:1.5rem}
.steinegger-testimonial__name{font-weight:600;color:var(--gray-900)}
.steinegger-testimonial__role{font-size:.875rem;color:var(--gray-500)}
.steinegger-faq-item{border-bottom:1px solid var(--gray-200);padding:1.5rem 0}
.steinegger-faq-item__question{font-weight:600;color:var(--gray-900);font-size:1.1rem;margin-bottom:.5rem}
.steinegger-faq-item__answer{color:var(--gray-600);line-height:1.8}
.steinegger-cta{background:linear-gradient(135deg,var(--primary-800) 0%,var(--primary-600) 100%);color:#fff;padding:4rem 0;text-align:center}
.steinegger-cta__title{font-size:clamp(2rem,4vw,2.75rem);font-weight:800;margin-bottom:1rem}
.steinegger-cta__text{font-size:1.2rem;opacity:.95;margin-bottom:2rem}
.steinegger-contact-item{display:flex;align-items:center;gap:1rem;padding:1rem;background:var(--gray-50);border-radius:.75rem;margin-bottom:1rem}
.steinegger-contact-item:hover{background:var(--primary-50)}
.steinegger-contact-item__icon{font-size:1.5rem}
.steinegger-contact-item__label{font-size:.8rem;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em}
.steinegger-contact-item__value{font-weight:600;color:var(--gray-900)}
.steinegger-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:1rem 2rem;border-radius:.75rem;font-weight:600;text-decoration:none;transition:all .15s ease}
.steinegger-btn--primary{background:var(--primary-600);color:#fff}
.steinegger-btn--primary:hover{background:var(--primary-700);transform:translateY(-2px)}
.steinegger-btn--white{background:#fff;color:var(--primary-700)}
.steinegger-btn--white:hover{transform:translateY(-2px);box-shadow:0 10px 15px -3px rgba(0,0,0,.1)}
.steinegger-location-tag{display:inline-block;background:#fff;border:1px solid var(--gray-300);padding:.5rem 1rem;border-radius:9999px;font-size:.9rem;color:var(--gray-700);font-weight:500;margin:.25rem}
.steinegger-feature{display:flex;align-items:flex-start;gap:1rem}
.steinegger-feature__icon{width:44px;height:44px;background:var(--primary-100);border-radius:.75rem;display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0}
.steinegger-feature__title{font-size:1rem;font-weight:600;color:var(--gray-900);margin-bottom:.25rem}
.steinegger-feature__text{font-size:.875rem;color:var(--gray-500)}
@media(max-width:768px){.steinegger-hero__stats{flex-wrap:wrap;gap:1.5rem}.steinegger-trust-bar__container{justify-content:center}}
`;
        
        // Try to update global styles
        const stylesResponse = await fetch(`${WP_URL}/wp-json/wp/v2/global-styles/1`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                css: customCSS
            })
        });
        
        const stylesResult = await stylesResponse.json();
        
        if (stylesResult.id || stylesResult.css) {
            console.log('✅ Custom CSS added via global styles!');
        } else {
            console.log('⚠️ Global styles update:', stylesResult);
            
            // Alternative: Try custom_css post type
            const cssPostResponse = await fetch(`${WP_URL}/wp-json/wp/v2/custom_css`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: customCSS,
                    title: 'Steinegger IT Custom CSS'
                })
            });
            
            const cssPostResult = await cssPostResponse.json();
            if (cssPostResult.id) {
                console.log('✅ Custom CSS added as custom_css post!');
            } else {
                console.log('⚠️ CSS post result:', cssPostResult);
            }
        }
        
        // 3. Verify the page
        console.log('\n🔍 Verifying page...');
        const verifyResponse = await fetch(`${WP_URL}/wp-json/wp/v2/pages/11`, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        const verifyResult = await verifyResponse.json();
        console.log(`Page title: ${verifyResult.title?.rendered}`);
        console.log(`Page status: ${verifyResult.status}`);
        console.log(`Page URL: ${verifyResult.link}`);
        
        // Save result
        fs.writeFileSync('/data/.openclaw/workspace/steinegger-it/deploy-rest-result.json', JSON.stringify({
            page: verifyResult,
            styles: stylesResult
        }, null, 2));
        
        console.log('\n✅ Deployment completed via REST API!');
        console.log(`🔗 View page: ${WP_URL}/steinegger-it/`);
        
        return { success: true, page: verifyResult };
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error: error.message };
    }
}

deploy().then(r => {
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
});