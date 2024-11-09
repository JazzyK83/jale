chrome.runtime.onInstalled.addListener(() => {
    console.log('Content Assessments extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Immediately return false to indicate sync handling
    return false;
});

// Handle any connection errors
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    return false;
});