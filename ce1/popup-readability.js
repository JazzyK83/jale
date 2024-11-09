let isAnalyzing = false;

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyze');
    
    function performAnalysis() {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        updateLoadingState(true);
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs[0]?.id) {
                showError('Could not access the current tab.');
                isAnalyzing = false;
                return;
            }

            try {
                chrome.tabs.sendMessage(tabs[0].id, { action: "analyze" }, function(response) {
                    if (chrome.runtime.lastError) {
                        showError('Please refresh the page and try again.');
                        console.error(chrome.runtime.lastError);
                        isAnalyzing = false;
                        return;
                    }

                    if (response && response.results) {
                        displayResults(response.results);
                    } else {
                        showError('No content found to analyze.');
                    }
                    
                    isAnalyzing = false;
                });
            } catch (error) {
                showError('Error analyzing content.');
                console.error(error);
                isAnalyzing = false;
            }
        });
    }

    // Add event listeners for "View" buttons
    document.querySelectorAll('.view-issues').forEach(button => {
        button.addEventListener('click', function() {
            const metric = this.dataset.metric;
            highlightIssues(metric);
        });
    });

    analyzeButton.addEventListener('click', performAnalysis);
    
    // Auto-analyze when popup opens
    setTimeout(performAnalysis, 100);
});

function highlightIssues(metric) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]?.id) return;
        
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "highlight",
            metric: metric
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Highlighting error:', chrome.runtime.lastError);
            }
        });
    });
}

function displayResults(results) {
    updateLoadingState(false);
    
    const formatScore = (score) => Math.round(score) + '%';
    const formatIssues = (count) => `Found ${count} ${count === 1 ? 'issue' : 'issues'}`;

    // Funkcija za formatiranje Flesch Score-a
    const formatFleschScore = (score) => {
        score = Math.round(score);
        if (score >= 90) return 'Very Easy (5th Grade)';
        if (score >= 80) return 'Easy (6th Grade)';
        if (score >= 70) return 'Fairly Easy (7th Grade)';
        if (score >= 60) return 'Standard (8th/9th Grade)';
        if (score >= 50) return 'Fairly Difficult (High School)';
        if (score >= 30) return 'Difficult (College)';
        return 'Very Difficult (College Graduate)';
    };

    const getLevel = (score, metricType) => {
        const thresholds = {
            paragraphLength: { good: 90, medium: 70 },
            longSentences: { good: 75, medium: 50 },
            passiveVoice: { good: 90, medium: 70 },
            fleschScore: { good: 60, medium: 40 },
            transitionWords: { good: 30, medium: 20 }
        };

        const t = thresholds[metricType];
        if (metricType === 'fleschScore') {
            return score >= t.good ? 'good' : score >= t.medium ? 'medium' : 'poor';
        } else {
            return score >= t.good ? 'good' : score >= t.medium ? 'medium' : 'poor';
        }
    };

    const explanations = {
        paragraphLength: {
            good: 'Excellent paragraph length distribution. Short paragraphs improve readability and maintain reader engagement.',
            medium: 'Some paragraphs might be too long. Consider breaking down paragraphs longer than 300 words to improve readability.',
            poor: 'Many paragraphs exceed recommended length. Long paragraphs can overwhelm readers and reduce content engagement.',
            target: 'Target: Keep paragraphs under 300 words to maintain reader attention and improve content scanability.'
        },
        longSentences: {
            good: 'Good sentence length variety. Short, clear sentences make your content easy to understand.',
            medium: 'Some sentences are too long. Consider breaking down sentences longer than 20 words.',
            poor: 'Many sentences exceed recommended length. Long sentences can confuse readers and reduce comprehension.',
            target: 'Target: Keep most sentences under 20 words. Vary sentence length for better rhythm, but prioritize clarity.'
        },
        passiveVoice: {
            good: 'Excellent use of active voice. Active voice makes your writing clear, direct, and engaging.',
            medium: 'Moderate use of passive voice. Consider converting some passive sentences to active voice.',
            poor: 'High usage of passive voice. Passive voice can make writing unclear and less engaging.',
            target: 'Target: Keep passive voice under 10%. Active voice is more direct and engaging for readers.'
        },
        fleschScore: {
            good: 'Great readability level. Your content is easy to understand for most readers.',
            medium: 'Moderate readability level. Some parts might be challenging for average readers.',
            poor: 'Complex readability level. Consider simplifying vocabulary and sentence structure.',
            target: 'Target: Aim for Standard (8th/9th Grade) or easier for general web content.'
        },
        transitionWords: {
            good: 'Excellent use of transition words. Your content flows naturally and is well-connected.',
            medium: 'Moderate use of transition words. Adding more transitions could improve content flow.',
            poor: 'Limited use of transition words. More transitions would help connect your ideas better.',
            target: 'Target: Include transition words in over 30% of sentences.'
        }
    };

    // Update metrics
    updateMetric('paragraphLength', {
        score: formatScore(results.paragraphLength.score),
        details: formatIssues(results.paragraphLength.problematicParts.length),
        explanation: explanations.paragraphLength[getLevel(results.paragraphLength.score, 'paragraphLength')],
        target: explanations.paragraphLength.target
    });

    updateMetric('longSentences', {
        score: formatScore(results.longSentences.score),
        details: formatIssues(results.longSentences.problematicParts.length),
        explanation: explanations.longSentences[getLevel(results.longSentences.score, 'longSentences')],
        target: explanations.longSentences.target
    });

    updateMetric('passiveVoice', {
        score: formatScore(results.passiveVoice.score),
        details: formatIssues(results.passiveVoice.problematicParts.length),
        explanation: explanations.passiveVoice[getLevel(results.passiveVoice.score, 'passiveVoice')],
        target: explanations.passiveVoice.target
    });

    // Special handling for Flesch Score
    updateMetric('fleschScore', {
        score: formatFleschScore(results.fleschScore.score),
        details: 'Reading level assessment',
        explanation: explanations.fleschScore[getLevel(results.fleschScore.score, 'fleschScore')],
        target: explanations.fleschScore.target
    }, true);

    updateMetric('transitionWords', {
        score: formatScore(results.transitionWords.score),
        details: formatIssues(results.transitionWords.problematicParts.length),
        explanation: explanations.transitionWords[getLevel(results.transitionWords.score, 'transitionWords')],
        target: explanations.transitionWords.target
    });
}

function updateMetric(metricId, data, isFleschScore = false) {
    const scoreEl = document.getElementById(`${metricId}Score`);
    const detailsEl = document.getElementById(`${metricId}Details`);
    
    if (scoreEl && detailsEl) {
        scoreEl.textContent = data.score;
        
        if (isFleschScore) {
            // Posebno stilizovanje za Flesch Score
            scoreEl.style.fontSize = '10px';
            scoreEl.style.lineHeight = '1.2';
            scoreEl.style.whiteSpace = 'normal';
            scoreEl.className = 'score-indicator'; // Uklonili smo getScoreClass za Flesch Score
        } else {
            // Normalno stilizovanje za ostale metrike
            scoreEl.className = `score-indicator ${getScoreClass(parseFloat(data.score), metricId)}`;
        }
        
        detailsEl.innerHTML = `${data.details}. <br><small>${data.explanation}. ${data.target}</small>`;
    }
}

function getScoreClass(score, metricType) {
    const thresholds = {
        paragraphLength: { good: 90, medium: 70 },
        longSentences: { good: 75, medium: 50 },
        passiveVoice: { good: 90, medium: 70 },
        fleschScore: { good: 60, medium: 40 },
        transitionWords: { good: 30, medium: 20 }
    };

    const t = thresholds[metricType] || thresholds.paragraphLength;
    
    if (metricType === 'fleschScore') {
        return score >= t.good ? 'good' : 
               score >= t.medium ? 'medium' : 'poor';
    } else {
        return score >= t.good ? 'good' : 
               score >= t.medium ? 'medium' : 'poor';
    }
}

function updateLoadingState(isLoading) {
    document.querySelectorAll('.score-indicator').forEach(el => {
        el.textContent = isLoading ? 'Loading...' : '--';
        el.className = `score-indicator ${isLoading ? 'loading' : ''}`;
    });
    
    document.querySelectorAll('.details').forEach(el => {
        el.textContent = isLoading ? 'Analyzing...' : '';
    });
}

function showError(message) {
    updateLoadingState(false);
    
    document.querySelectorAll('.score-indicator').forEach(el => {
        el.textContent = '--';
        el.className = 'score-indicator error';
    });
    
    document.querySelectorAll('.details').forEach(el => {
        el.textContent = message;
        el.className = 'details error';
    });
}