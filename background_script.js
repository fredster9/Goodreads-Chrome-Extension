/* 
PSEUDOCODE
[] Get the URL of the page
[] Using that, extract the ISBN
[] Send that to background_script to look up book_id
[] Use book_id to do the user and book lookup
[] Send flag back to content_script 
[] Change pag accordingly
*/

//Utility function for getting the current url taken from the chrome getting started tutorial

//Utility function for getting the current url taken from the chrome getting started tutorial
function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    var tab = tabs[0];
    var url = tab.url;
    console.assert(typeof url == 'string', 'tab.url should be a string');
    callback(url);
  });
}

//whenever the browser action is clicked the chrome stored url is updated and the content script is run.
chrome.browserAction.onClicked.addListener(function(tab,url) {
  getCurrentTabUrl((url) => {
    chrome.storage.sync.set({"url": url},()=>{
   });
  });
    chrome.tabs.executeScript(null, {file: "contentscript.js"});
});

  
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
    if (request.contentScriptQuery == "fetchHtml")
    {
    	   	console.log('in fetchhtml');
        fetch(request.url, {mode: 'cors'})
            .then(response => response.text())
            .then(data => sendResponse(data))
            .catch(error => sendResponse(error));
            console.log('before return true');
        return true; // Will respond asynchronously.
        console.log('after return true');
    }
});

