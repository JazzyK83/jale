class ReadabilityAnalyzer {
    constructor() {
        this.transitionWords = ['accordingly', 'additionally', 'admittedly', 'after', 'afterward', 'afterwards', 'all in all', 'also', 'alternatively', 'although', 'another', 'as a result', 'as an illustration', 'as well as', 'at the same time', 'because', 'because of', 'beforehand', 'besides', 'by the same token', 'certainly', 'clearly', 'comparatively', 'consequently', 'conversely', 'coupled with', 'despite', 'due to', 'during', 'earlier', 'equally', 'equally important', 'especially', 'even though', 'eventually', 'finally', 'first', 'for example', 'for instance', 'for this reason', 'further', 'furthermore', 'granted', 'hence', 'however', 'in a similar manner', 'in addition', 'in brief', 'in conclusion', 'in contrast', 'in fact', 'in other words', 'in particular', 'in short', 'in spite of', 'in summary', 'in the end', 'in the meantime', 'in the same way', 'including', 'indeed', 'initially', 'instead', 'lastly', 'later', 'likewise', 'meanwhile', 'moreover', 'namely', 'naturally', 'nevertheless', 'next', 'nonetheless', 'not only but also', 'not only...but also', 'notably', 'notwithstanding', 'obviously', 'of course', 'on the contrary', 'on the other hand', 'overall', 'particularly', 'previously', 'rather', 'regardless', 'second', 'significantly', 'similarly', 'simultaneously', 'since', 'so', 'specifically', 'still', 'subsequently', 'such as', 'that is', 'that is to say', 'then', 'therefore', 'third', 'thus', 'to be sure', 'to begin with', 'to clarify', 'to conclude', 'to explain', 'to illustrate', 'to put it another way', 'to rephrase it', 'to sum up', 'to summarize', 'ultimately', 'undoubtedly', "what's more", 'whats more', 'whereas', 'while', 'yet'];
    }

    analyzeText(text) {
        if (!text || typeof text !== 'string') {
            return this.getEmptyResults();
        }

        return {
            paragraphLength: this.checkParagraphLength(text),
            longSentences: this.checkLongSentences(text),
            passiveVoice: this.checkPassiveVoice(text),
            fleschScore: this.calculateFleschScore(text),
            transitionWords: this.checkTransitionWords(text)
        };
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

    checkParagraphLength(text) {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 300);
        
        return {
            score: paragraphs.length ? ((paragraphs.length - longParagraphs.length) / paragraphs.length) * 100 : 0,
            problematicParts: longParagraphs
        };
    }

    checkLongSentences(text) {
        const sentences = this.getSentences(text);
        const longSentences = sentences.filter(s => s.split(/\s+/).length > 20);
        
        return {
            score: sentences.length ? ((sentences.length - longSentences.length) / sentences.length) * 100 : 0,
            problematicParts: longSentences
        };
    }

    checkPassiveVoice(text) {
        const sentences = this.getSentences(text);
        const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
        const passiveSentences = sentences.filter(s => passivePattern.test(s));
        
        return {
            score: sentences.length ? ((sentences.length - passiveSentences.length) / sentences.length) * 100 : 0,
            problematicParts: passiveSentences
        };
    }

    calculateFleschScore(text) {
        const sentences = this.getSentences(text);
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const syllables = this.countSyllables(text);

        if (sentences.length === 0 || words.length === 0) {
            return { score: 0, problematicParts: [] };
        }

        const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
        return {
            score: Math.max(0, Math.min(100, score)),
            problematicParts: []
        };
    }

    checkTransitionWords(text) {
        const sentences = this.getSentences(text);
        const transitionSentences = sentences.filter(s => 
            this.transitionWords.some(word => 
                s.toLowerCase().includes(word)
            )
        );
        
        return {
            score: sentences.length ? (transitionSentences.length / sentences.length) * 100 : 0,
            problematicParts: sentences.filter(s => 
                !this.transitionWords.some(word => 
                    s.toLowerCase().includes(word)
                )
            )
        };
    }

    getSentences(text) {
        return text
            .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
            .split("|")
            .filter(s => s.trim().length > 0);
    }

    countSyllables(text) {
        return text.toLowerCase()
            .replace(/[^a-z]/g, '')
            .replace(/[^aeiouy]*[aeiouy]+/g, 'a')
            .length;
    }
}

window.ReadabilityAnalyzer = ReadabilityAnalyzer;