var parser = new DOMParser();

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


function parseNYPL(response) {
  console.log('in parseNYPL');
  console.log('response: ' + response);
  let doc = parser.parseFromString(data, "text/html");
  console.log(doc.title);
}

  
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    console.log('in addListener'); 
    //console.log('sender.url = ' + sender.url); // this is page it comes from
    // console.log('request.url = ' + request.url);
    console.log('request.contentScriptQuery = ' + request.contentScriptQuery);

    var requestQuery = request.contentScriptQuery;
    // console.log('request query ' + requestQuery);

    var queryNYPLresponse = []; // doc.title extact, ebook avail, audio avail

    if (request.contentScriptQuery == "fetchHTML") {   
        console.log('in fetchHtml');
        fetch(request.url)
        .then(response=>response.text())
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
        return true;  // this makes it async
    }

    else if (requestQuery.includes("query") === true) { // not sure why doesnt' work with above code
        console.log('in queryNYPL');
        console.log('book data: ' + request.book_data);

        fetch(request.url)
        .then(response=>response.text())
        .then(function(data) {
          //console.log('in function data');
          book_data = request.book_data;

          let doc = parser.parseFromString(data, "text/html");
          // console.log('doc.title ' + doc.title);
          title = doc.title.replace("Search results for ", "");
          title = title.replace(" - New York Public Library - OverDrive", "");
          console.log('title ' + title);
            
          const no_results = doc.getElementsByTagName("h1")[0]; // this seems fragile, but works for now, only no results has
          console.log('no results (h1): ' + no_results);

          if(typeof no_results == "undefined") {
              //console.log("we might have results for " + gr_to_read[r][1] + " at " + doc.title );
              book_data.push('ebook maybe', 'audiobook maybe');
          } else {
              //console.log("no results found for " + gr_to_read[r][1] + " at " + doc.title);
              
              var od_obj = doc.getElementsByTagName("script")[0].innerText;
              console.log('overdrive_obj ' + od_obj);
              console.log('typeof ' + typeof od_obj);
              
              // var med_beg = 'OverDrive.mediaItems = { \"';
              // var med_end = ':';
              // var myRe = new RegExp(med_beg + "(.*)" + med_end);             

              var medIDre = /(mediaItems = {)(.*?)(?=:)/;
              var result = medIDre.exec(od_obj);
              //var result = od_obj.match(medIDre);
              console.log('result ' + result);



              //book_data.push('ebook no', 'audiobook no');

          }

            //console.log('full book data: ' + book_data);
            return book_data;
        })
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
        return true;  // this makes it async


    }

});

