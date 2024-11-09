class ContentAssessments {
    constructor() {
        console.log('ContentAssessments initialized');
        this.analyzer = new ReadabilityAnalyzer();
        this.marker = new ContentMarker();
        this.lastResults = null;
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "analyze") {
                const results = this.analyzeContent();
                this.lastResults = results;
                sendResponse({ results: results });
            } else if (request.action === "highlight") {
                this.highlightIssuesForMetric(request.metric);
                sendResponse({ success: true });
            }
            return false;
        });
    }

    analyzeContent() {
        try {
            const content = this.getEditorContent();
            if (!content) {
                return this.getEmptyResults();
            }
            return this.analyzer.analyzeText(content);
        } catch (error) {
            console.error('Analysis error:', error);
            return this.getEmptyResults();
        }
    }

    getEmptyResults() {
        return {
            paragraphLength: { score: 0, problematicParts: [] },
            longSentences: { score: 0, problematicParts: [] },
            passiveVoice: { score: 0, problematicParts: [] },
            fleschScore: { score: 0, problematicParts: [] },
            transitionWords: { score: 0, problematicParts: [] }
        };
    }

    getEditorContent() {
        const editorSelectors = [
            '.editable',
            '#nsoPic1730994360859',
            'iframe.editable',
            '[contenteditable="true"]',
            '.blogger-editor',
            '#postingComposeBox'
        ];

        for (const selector of editorSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                if (element.tagName === 'IFRAME') {
                    try {
                        const iframeDoc = element.contentDocument || element.contentWindow.document;
                        return iframeDoc.body.textContent || '';
                    } catch (e) {
                        console.error('Error accessing iframe:', e);
                    }
                } else {
                    return element.textContent || element.value || '';
                }
            }
        }
        return '';
    }

    highlightIssuesForMetric(metric) {
        if (!this.lastResults || !this.lastResults[metric]) {
            console.warn('No results available for metric:', metric);
            return;
        }

        console.log('Highlighting issues for metric:', metric);
        console.log('Results:', this.lastResults[metric]);

        this.marker.clearHighlights();
        const problematicParts = this.lastResults[metric].problematicParts;
        
        if (problematicParts && problematicParts.length > 0) {
            console.log(`Found ${problematicParts.length} problematic parts to highlight`);
            this.marker.highlightProblematicParts(problematicParts, `highlight-${metric}`);
        } else {
            console.log('No problematic parts found to highlight');
        }
    }
}

// Inicijalizacija kada je dokument spreman
function initializeContentAssessments() {
    try {
        new ContentAssessments();
        console.log('Content Assessments initialized successfully');
    } catch (error) {
        console.error('Error initializing Content Assessments:', error);
    }
}

// Provera da li je dokument već učitan
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentAssessments);
} else {
    initializeContentAssessments();
}