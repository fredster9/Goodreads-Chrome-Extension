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

  
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    console.log('in addListener'); 
    // console.log('sender.url = ' + sender.url); // this is page it comes from
    console.log('request.url = ' + request.url);
    console.log('request.contentScriptQuery = ' + request.contentScriptQuery);

    if (request.contentScriptQuery == "fetchHTML")
    {   
        console.log('in fetchHtml block');
        // fetch(request.url, {mode: 'cors'})
        //     .then(response => response.text())
        //     .then(data => sendResponse(data))
        //     .catch(error => sendResponse(error));
        // return true; // Will respond asynchronously.

        fetch(request.url)
        .then(response=>response.text())
        // .then(data => {
        //   console.log(data);
        // })
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
        //return true;  // this makes it async
    }

});

