document.addEventListener('DOMContentLoaded', function() {
  // Load saved keyword
  chrome.storage.local.get(['lastKeyword'], function(data) {
    if (data.lastKeyword) {
      document.getElementById('keywordInput').value = data.lastKeyword;
      // Automatically trigger analysis when popup opens
      document.getElementById('analyzeButton').click();
    }
  });

  document.getElementById('analyzeButton').addEventListener('click', async function() {
    try {
      const keyword = document.getElementById('keywordInput').value;
      if (!keyword) {
        throw new Error('Please enter a keyword');
      }

      // Save keyword
      chrome.storage.local.set({ lastKeyword: keyword });

      displayAnalyzing();

      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
if (!tabs[0] || !(tabs[0].url.includes('blogger.com') && (tabs[0].url.includes('/edit') || tabs[0].url.includes('/post')))) {
  throw new Error('To use this extension, please navigate to a Blogger edit page.');
}

      await chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      });

      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "analyze", keyword: keyword },
          response => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response || !response.analysis) {
        throw new Error('Invalid response from content script');
      }

      displayResults(response.analysis, keyword);
    } catch (error) {
      console.error('Error:', error);
      displayError(error.message);
    }
  });
});

function displayAnalyzing() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `
    <div class="analyzing">
      <div class="spinner"></div>
      <p>Analyzing...</p>
    </div>
  `;
}

function displayError(message) {
  document.getElementById('results').innerHTML = `
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <p>Error: ${message}</p>
    </div>
  `;
}

function calculateOverallScore(analysis) {
  return Math.round(
    (analysis.titleScore * 0.3) + 
    (analysis.descriptionScore * 0.3) + 
    (analysis.contentScore * 0.4)
  );
}

function getScoreColor(score) {
  if (score >= 90) return '#22c55e'; // Zelena
  if (score >= 80) return '#10b981'; // Svetlo zelena
  if (score >= 70) return '#eab308'; // Žuta
  if (score >= 60) return '#f97316'; // Narandžasta
  return '#ef4444'; // Crvena
}

function displayResults(analysis, keyword, actualUrl) {
  const overallScore = calculateOverallScore(analysis);
  const scoreColor = getScoreColor(overallScore);
  const resultsDiv = document.getElementById('results');
      
  const resultsHTML = `
    <div class="results-container">
      <div class="overall-score">
        <h2 class="seo-score-heading">SEO Score</h2>
        <div class="score-circle">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            <path class="circle" stroke="${getScoreColor(overallScore)}" stroke-dasharray="${overallScore}, 100" d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"></path>
          </svg>
          <div class="score-value">${overallScore}%</div>
        </div>
      </div>

      <div class="score-section">
        <h2>Page Title</h2>
        <p class="score ${analysis.titleScore >= 80 ? 'good' : 'bad'}">Score: ${analysis.titleScore}</p>
        <ul class="checklist">
          <li class="${analysis.titleFeedback.missing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.titleFeedback.missing ? "You should add a Page Title" : "You've entered a Page Title"}</span>
          </li>
          <li class="${analysis.titleFeedback.keywordMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.titleFeedback.keywordMissing ? `The focus keyword "${keyword}" doesn't appear in the Page Title` : `The focus keyword "${keyword}" is used in the Page Title`}</span>
          </li>
          <li class="${analysis.titleFeedback.keywordPosition ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.titleFeedback.keywordPosition ? `Put the focus keyword "${keyword}" at the beginning of the Page Title` : `The focus keyword "${keyword}" is used at the beginning of the Page Title`}</span>
          </li>
          <li class="${analysis.titleFeedback.length ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.titleFeedback.lengthMessage}</span>
          </li>
        </ul>
      </div>

      <div class="score-section">
        <h2>Meta Description</h2>
        <p class="score ${analysis.descriptionScore >= 80 ? 'good' : 'bad'}">Score: ${analysis.descriptionScore}</p>
        <ul class="checklist">
          <li class="${analysis.descriptionFeedback.missing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.descriptionFeedback.missing ? "You should add a Meta description" : "You've entered a Meta description"}</span>
          </li>
          <li class="${analysis.descriptionFeedback.keywordMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.descriptionFeedback.keywordMissing ? `The focus keyword "${keyword}" doesn't appear in the Meta description` : `The focus keyword "${keyword}" is used in the Meta description`}</span>
          </li>
          <li class="${analysis.descriptionFeedback.length ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.descriptionFeedback.lengthMessage}</span>
          </li>
        </ul>
      </div>

      <div class="score-section">
        <h2>Snippet Preview</h2>
        <div class="preview-tabs">
          <button class="preview-tab active" data-view="desktop">Desktop</button>
          <button class="preview-tab" data-view="mobile">Mobile</button>
        </div>
        
        <div class="preview-content desktop-preview">
          <div class="preview-title">${analysis.title || 'Title not set'}</div>
          <div class="preview-url">${analysis.url}</div>
          <div class="preview-description">${analysis.description || 'Description not set'}</div>
        </div>

        <div class="preview-content mobile-preview" style="display: none;">
          <div class="preview-title">${analysis.title || 'Title not set'}</div>
          <div class="preview-url">preview-url">${analysis.url}</div>
          <div class="preview-description">${analysis.description || 'Description not set'}</div>
        </div>
      </div>

      <div class="score-section">
        <h2>Content</h2>
        <p class="score ${analysis.contentScore >= 80 ? 'good' : 'bad'}">Score: ${analysis.contentScore}</p>
        <ul class="checklist">
          <li class="${analysis.contentFeedback.h2h3Missing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.h2h3Missing ? "You should add a H2 or H3" : "You've added a H2 or H3"}</span>
          </li>
          <li class="${analysis.contentFeedback.textMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.textMissing ? "You should add text" : "You've added text to the document"}</span>
          </li>
          <li>
            <span class="text">${analysis.contentFeedback.textLengthMessage}</span>
          </li>
          <li class="${analysis.contentFeedback.keywordInFirstParagraph ? 'success' : 'error'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.keywordInFirstParagraph ? `The focus keyword "${keyword}" is used in the first paragraph of the text` : `The focus keyword "${keyword}" doesn't appear in the first paragraph of the text`}</span>
          </li>
          <li class="${analysis.contentFeedback.keywordDensity ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.keywordDensityMessage}</span>
          </li>
          <li class="${analysis.contentFeedback.imageMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.imageMissing ? "You should add an image" : "You've added an image"}</span>
          </li>
          <li class="${analysis.contentFeedback.imageNameMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.imageNameMissing ? `The focus keyword "${keyword}" doesn't appear in the image name` : `You've used the focus keyword "${keyword}" in the name of an image`}</span>
          </li>
          <li class="${analysis.contentFeedback.imageAltMissing ? 'error' : 'success'}">
            <span class="dot">●</span>
            <span class="text">${analysis.contentFeedback.imageAltMissing ? `The focus keyword "${keyword}" doesn't appear in the image Alt tag` : `You've used the focus keyword "${keyword}" in the alt tag of an image`}</span>
          </li>
          <li class="${analysis.contentFeedback.linksMissing ? 'error' : 'success'}">
    <span class="dot">●</span>
    <span class="text">${analysis.contentFeedback.linksMissing ? 
        "Add relevant links to improve user experience and internal link structure" : 
        `You've added ${analysis.contentFeedback.linksCount} link(s) to the document (Internal: ${analysis.contentFeedback.internalLinksCount}, External: ${analysis.contentFeedback.externalLinksCount})`}</span>
</li>
        </ul>
      </div>

    </div>

    <div class="footer">
      Created by <a href="https://www.seobloggertips.com/" target="_blank">Jasmin Kodzopeljic</a> 
    </div>
  `;

  document.getElementById('results').innerHTML = resultsHTML;

  // Add event listeners for preview tabs
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const view = this.dataset.view;
      document.querySelectorAll('.preview-content').forEach(content => {
        content.style.display = 'none';
      });
      document.querySelector(`.${view}-preview`).style.display = 'block';
      
      document.querySelectorAll('.preview-tab').forEach(t => {
        t.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
}