class ContentMarker {
    constructor() {
        this.editor = null;
        this.iframe = null;
        this.initializeEditor();
    }

    initializeEditor() {
        // Prvo pokušavamo da nađemo iframe
        this.iframe = document.querySelector('iframe.editable');
        
        if (this.iframe) {
            try {
                this.editor = this.iframe.contentDocument.body;
                console.log('Found editor in iframe');
            } catch (e) {
                console.error('Error accessing iframe content:', e);
            }
        } else {
            // Ako nema iframe-a, tražimo direktno editor
            this.editor = document.querySelector('.editable') || 
                         document.querySelector('#nsoPic1730994360859');
            console.log('Found direct editor');
        }
    }

    highlightProblematicParts(parts, className) {
        if (!this.editor) {
            this.initializeEditor();
        }
        
        if (!this.editor) {
            console.error('No editor found');
            return;
        }
        
        console.log(`Highlighting ${parts.length} parts with class ${className}`);
        
        // Clear previous highlights of this type
        this.clearHighlights(className);
        
        parts.forEach((part, index) => {
            if (part && part.trim()) {
                console.log(`Highlighting part ${index + 1}:`, part.substring(0, 50) + '...');
                this.highlightText(part.trim(), className);
            }
        });
    }

    highlightText(text, className) {
        const doc = this.iframe ? this.iframe.contentDocument : document;
        const textNodes = this.findTextNodes(this.editor);
        
        textNodes.forEach(node => {
            const content = node.textContent;
            if (content.includes(text)) {
                try {
                    const range = doc.createRange();
                    const startIndex = content.indexOf(text);
                    range.setStart(node, startIndex);
                    range.setEnd(node, startIndex + text.length);
                    
                    const span = doc.createElement('span');
                    span.className = className;
                    span.style.backgroundColor = this.getHighlightColor(className);
                    span.style.borderBottom = this.getBorderStyle(className);
                    
                    range.surroundContents(span);
                    console.log('Successfully highlighted text');
                    
                    // Scroll to the first highlight
                    if (span.getBoundingClientRect) {
                        const rect = span.getBoundingClientRect();
                        if (this.iframe) {
                            this.iframe.contentWindow.scrollTo({
                                top: rect.top + this.iframe.contentWindow.scrollY - 100,
                                behavior: 'smooth'
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to highlight text:', e);
                }
            }
        });
    }

    getHighlightColor(className) {
        const colors = {
            'highlight-paragraphLength': 'rgba(244, 67, 54, 0.2)',
            'highlight-longSentences': 'rgba(255, 152, 0, 0.2)',
            'highlight-passiveVoice': 'rgba(156, 39, 176, 0.2)',
            'highlight-transitionWords': 'rgba(76, 175, 80, 0.2)'
        };
        return colors[className] || 'rgba(255, 255, 0, 0.2)';
    }

    getBorderStyle(className) {
        const borders = {
            'highlight-paragraphLength': '2px solid #f44336',
            'highlight-longSentences': '2px solid #ff9800',
            'highlight-passiveVoice': '2px solid #9c27b0',
            'highlight-transitionWords': '2px solid #4caf50'
        };
        return borders[className] || '2px solid #ffd700';
    }

    findTextNodes(node) {
        const textNodes = [];
        if (!node) return textNodes;

        const walk = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Preskačemo prazne text node-ove
                    return node.textContent.trim().length > 0 ? 
                           NodeFilter.FILTER_ACCEPT : 
                           NodeFilter.FILTER_REJECT;
                }
            },
            false
        );
        
        let currentNode;
        while (currentNode = walk.nextNode()) {
            textNodes.push(currentNode);
        }
        
        console.log(`Found ${textNodes.length} text nodes`);
        return textNodes;
    }

    clearHighlights(className = null) {
        if (!this.editor) {
            this.initializeEditor();
        }
        
        if (!this.editor) return;
        
        const doc = this.iframe ? this.iframe.contentDocument : document;
        const selector = className ? `.${className}` : '[class^="highlight-"]';
        const highlights = this.editor.querySelectorAll(selector);
        
        console.log(`Clearing ${highlights.length} highlights`);
        
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(doc.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }
}

window.ContentMarker = ContentMarker;