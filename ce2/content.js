console.log('Content script loaded for Blogger SEO Analyzer');

function waitForIframeContent() {
    return new Promise((resolve) => {
        const checkIframe = setInterval(() => {
            const iframe = document.querySelector('.editable');
            if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
                clearInterval(checkIframe);
                resolve(iframe.contentDocument.body);
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkIframe);
            resolve(null);
        }, 5000);
    });
}

function generateBloggerUrl(baseUrl, pageTitle) {
    const urlElement = document.querySelector('.MUhG4e.OGjyyf');
    if (urlElement && urlElement.textContent) {
        return urlElement.textContent; // Vraća stvarni URL iz Blogger editora
    }
    
    // Fallback na generisanje URL-a ako ne možemo dobiti stvarni URL
    if (!baseUrl || !pageTitle) return '';
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }

    const permalinkInput = document.querySelector('input[aria-label="Permalink"]');
    const customSlug = permalinkInput ? permalinkInput.value : '';
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    if (customSlug) {
        const slugWithoutHtml = customSlug.replace(/\.html$/, '');
        return `${baseUrl}${year}/${month}/${slugWithoutHtml}.html`;
    } else {
        const postSlug = pageTitle.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
        return `${baseUrl}${year}/${month}/${postSlug}.html`;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze") {
        analyzeContent(request.keyword)
            .then(response => sendResponse(response))
            .catch(error => {
                console.error('Error:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
});

async function analyzeContent(keyword) {
    try {
        const iframeBody = await waitForIframeContent();
        if (!iframeBody) {
            throw new Error('Could not access iframe content');
        }

        const titleElement = document.querySelector('input[aria-label="Title"]');
        const descriptionElement = document.querySelector('textarea[aria-label="Enter search description"]');
        const urlElement = document.querySelector('.MUhG4e.OGjyyf[data-blogurl]');

        const pageTitle = titleElement ? titleElement.getAttribute('data-initial-value') : '';
        const metaDescription = descriptionElement ? descriptionElement.getAttribute('data-initial-value') : '';
        const baseUrl = urlElement ? urlElement.getAttribute('data-blogurl') : '';
        const content = iframeBody.innerHTML;
        const textContent = iframeBody.textContent;

        // Generate correct URL
        const fullUrl = generateBloggerUrl(baseUrl, pageTitle);

        console.log('Analyzing content:', {
            pageTitle,
            metaDescription,
            contentLength: content.length,
            keyword,
            fullUrl
        });

        // Initialize scoring objects
        let titleScore = 0;
        let titleFeedback = {
            missing: !pageTitle,
            keywordMissing: false,
            keywordPosition: false,
            length: false,
            lengthMessage: ''
        };

        let descriptionScore = 0;
        let descriptionFeedback = {
            missing: !metaDescription,
            keywordMissing: false,
            length: false,
            lengthMessage: ''
        };

        let contentScore = 0;
        let contentFeedback = {
            h2h3Missing: true,
            textMissing: !content,
            textLength: false,
            textLengthMessage: '',
            keywordInFirstParagraph: false,
            keywordDensity: false,
            keywordDensityMessage: '',
            imageMissing: true,
            imageNameMissing: true,
            imageAltMissing: true,
            linksMissing: true,
            linksCount: 0
        };

        // Analyze Page Title
        if (pageTitle) {
            titleScore += 25;
            if (pageTitle.toLowerCase().includes(keyword.toLowerCase())) {
                titleScore += 25;
            } else {
                titleFeedback.keywordMissing = true;
            }

            if (pageTitle.toLowerCase().startsWith(keyword.toLowerCase())) {
                titleScore += 25;
            } else {
                titleFeedback.keywordPosition = true;
            }

            const titleLength = pageTitle.length;
            const maxTitleLength = 60;
            if (titleLength <= maxTitleLength) {
                titleScore += 25;
                titleFeedback.length = false;
                titleFeedback.lengthMessage = `The Page Title length is good, ${maxTitleLength - titleLength} characters available. (${titleLength} of ${maxTitleLength} characters used)`;
            } else {
                titleFeedback.length = true;
                titleFeedback.lengthMessage = `The Page Title is too long, ${titleLength - maxTitleLength} characters over the limit. (${titleLength} of ${maxTitleLength} characters used)`;
            }
        }

        // Analyze Meta Description
        if (metaDescription) {
            descriptionScore += 33;
            if (metaDescription.toLowerCase().includes(keyword.toLowerCase())) {
                descriptionScore += 33;
            } else {
                descriptionFeedback.keywordMissing = true;
            }

            const descriptionLength = metaDescription.length;
            const maxDescriptionLength = 150;
            if (descriptionLength >= 120 && descriptionLength <= 150) {
                descriptionScore += 34;
                descriptionFeedback.lengthMessage = `The Meta description length is perfect, ${maxDescriptionLength - descriptionLength} characters available. (${descriptionLength} of ${maxDescriptionLength} characters used)`;
            } else if (descriptionLength < 120) {
                descriptionFeedback.length = true;
                descriptionFeedback.lengthMessage = `The Meta description is too short, ${maxDescriptionLength - descriptionLength} characters available. (${descriptionLength} of ${maxDescriptionLength} characters used)`;
            } else {
                descriptionFeedback.length = true;
                descriptionFeedback.lengthMessage = `The Meta description is too long, ${descriptionLength - maxDescriptionLength} characters over the limit. (${descriptionLength} of ${maxDescriptionLength} characters used)`;
            }
        }

        // Analyze Content
        if (content) {
            const h2h3Elements = iframeBody.querySelectorAll('h2, h3');
            if (h2h3Elements.length > 0) {
                contentScore += 20;
                contentFeedback.h2h3Missing = false;
            }

            contentScore += 10;
            contentFeedback.textMissing = false;
            const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
const minWords = 300;

if (wordCount >= minWords) {
    contentScore += 10;
    contentFeedback.textLength = true;
    contentFeedback.textLengthMessage = `Your text contains ${wordCount} words`;
} else {
    contentFeedback.textLength = false;
    contentFeedback.textLengthMessage = `Your text contains ${wordCount} words. Minimum requirement is ${minWords} words.`;
}

            const firstParagraph = iframeBody.querySelector('p');
            if (firstParagraph && firstParagraph.textContent.toLowerCase().includes(keyword.toLowerCase())) {
                contentScore += 10;
                contentFeedback.keywordInFirstParagraph = true;
            }

            const keywordCount = (textContent.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
            const keywordDensity = (keywordCount / wordCount) * 100;
            if (keywordDensity >= 1 && keywordDensity <= 3) {
                contentScore += 10;
                contentFeedback.keywordDensity = false;
                contentFeedback.keywordDensityMessage = `Your keyword density (${keywordDensity.toFixed(2)}%) is pretty perfect, focus keyword "${keyword}" used ${keywordCount} time(s)`;
            } else {
                contentFeedback.keywordDensity = true;
                contentFeedback.keywordDensityMessage = `The keyword density is ${keywordDensity.toFixed(2)}%. Aim for a keyword density between 1% and 3%.`;
            }

            const imgElements = iframeBody.querySelectorAll('img');
            if (imgElements.length > 0) {
                contentScore += 10;
                contentFeedback.imageMissing = false;
                let imageNameFound = false;
                let imageAltFound = false;

                imgElements.forEach(img => {
                    const imgSrc = img.getAttribute('src') || '';
                    const imgAlt = img.getAttribute('alt') || '';
                    const imgHref = img.closest('a')?.getAttribute('href') || '';
                    
                    if (imgSrc.toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, '-')) ||
                        imgHref.toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, '-'))) {
                        imageNameFound = true;
                    }
                    
                    if (imgAlt.toLowerCase().includes(keyword.toLowerCase())) {
                        imageAltFound = true;
                    }
                });

                if (imageNameFound) {
                    contentScore += 10;
                    contentFeedback.imageNameMissing = false;
                }

                if (imageAltFound) {
                    contentScore += 10;
                    contentFeedback.imageAltMissing = false;
                }
            }

const linkElements = iframeBody.querySelectorAll('a');
if (linkElements.length > 0) {
    let internalLinks = 0;
    let externalLinks = 0;
    
    // Get blog domain from snippet preview
    const snippetUrlElement = document.querySelector('.MUhG4e.OGjyyf');
    let blogDomain = '';
    
    if (snippetUrlElement && snippetUrlElement.textContent) {
        blogDomain = snippetUrlElement.textContent.split('/')[2].replace('www.', '');
        console.log('Blog domain:', blogDomain);
    }

    linkElements.forEach(link => {
        // Dobavljanje originalnog href-a iz data-original-attrs
        const originalAttrs = link.getAttribute('data-original-attrs');
        let href = '';
        
        if (originalAttrs) {
            try {
                // Parsiranje JSON-a iz data-original-attrs
                const attrs = JSON.parse(originalAttrs);
                href = attrs['data-original-href'] || '';
                console.log('Original href:', href);
            } catch (e) {
                console.error('Error parsing data-original-attrs:', e);
            }
        }
        
        // Preskačemo linkove koji su samo slike
        const hasOnlyImage = link.children.length === 1 && 
            link.children[0].tagName === 'IMG' && 
            link.textContent.trim() === '';
            
        if (!hasOnlyImage && href) {
            if (href.startsWith('http')) {
                try {
                    const linkDomain = href.split('/')[2].replace('www.', '');
                    console.log('Comparing domains:', {blogDomain, linkDomain, href});
                    
                    // Ako je domain linka različit od blog domena, to je eksterni link
                    if (blogDomain && linkDomain !== blogDomain) {
                        externalLinks++;
                        console.log('External link found:', href);
                    } else {
                        internalLinks++;
                        console.log('Internal link found:', href);
                    }
                } catch (e) {
                    console.error('Error parsing link domain:', href);
                    externalLinks++;
                }
            } else {
                // Relativni linkovi su interni
                internalLinks++;
                console.log('Relative internal link:', href);
            }
        }
    });

    contentScore += 10;
    contentFeedback.linksMissing = false;
    contentFeedback.linksCount = internalLinks + externalLinks;
    contentFeedback.internalLinksCount = internalLinks;
    contentFeedback.externalLinksCount = externalLinks;
    
    console.log('Final link counts:', {
        blogDomain,
        total: contentFeedback.linksCount,
        internal: contentFeedback.internalLinksCount,
        external: contentFeedback.externalLinksCount
    });
}
        }

        return {
            analysis: {
                titleScore,
                titleFeedback,
                descriptionScore,
                descriptionFeedback,
                contentScore,
                contentFeedback,
                title: pageTitle,
                description: metaDescription,
                url: fullUrl
            }
        };

    } catch (error) {
        console.error('Analysis error:', error);
        throw error;
    }
}
