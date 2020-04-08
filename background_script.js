var parser = new DOMParser();
var book_result_url = "";

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

    //console.log('in addListener'); 
    //console.log('sender.url = ' + sender.url); // this is page it comes from
    // console.log('request.url = ' + request.url);
    //console.log('request.contentScriptQuery = ' + request.contentScriptQuery);

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
        
        //console.log('in queryNYPL');
        //console.log('book data: ' + request.book_data);

        fetch(request.url)
        .then(response=>response.text())
        .then(function(data) {
          //console.log('in function data');
          book_data = request.book_data;
          console.log('book data ' + book_data);

          let doc = parser.parseFromString(data, "text/html");

          //console.log('doc.title ' + doc.title);
          title = doc.title.replace("Search results for ", "");
          title = title.replace(" - New York Public Library - OverDrive", "");
          console.log('title ' + title);
            
          const no_results = doc.getElementsByTagName("h1")[0]; // this seems fragile, but works for now, only no results has
          console.log('no results (h1) - ergo, we have book results: ' + no_results);

          // create empty
          gr_to_read_obj = {
                  isbn: book_data[0], // not using but more work to remove
                  author: book_data[1],
                  title: book_data[2],
                  searchURL: book_data[3],
              };

          if(typeof no_results == "undefined") {
              //console.log('doc.body: ' + doc.body.innerHTML);
              
              var od_obj = doc.getElementsByTagName("script")[0].innerText;
              //console.log('script: ' + od_obj);

              var mediaItemsRe = /(mediaItems = )(.*?)(}};)/s; // seems somewhat fragile but thunderhost line break is pain
              var mediaItems = mediaItemsRe.exec(od_obj)[0];
              // cuz regx not great
              mediaItems = mediaItems.replace("mediaItems = ","");
              mediaItems = mediaItems.replace("}};", "}}");
              //console.log('mediaItems: '+ mediaItems);

              var medItemsObj = JSON.parse(mediaItems);

              book_result_url_base = "https://nypl.overdrive.com/media/";
              
              for (var key in medItemsObj) {
                if (medItemsObj.hasOwnProperty(key)) {
                    console.log(key + " -> " + medItemsObj[key]);

                    book_result_url = book_result_url_base + key;
                    var avail = medItemsObj[key].isAvailable;
                    var ownedCopies = medItemsObj[key].ownedCopies;
                    var pplWaiting = medItemsObj[key].holdsCount;
                    var estWaitDays = medItemsObj[key].estimatedWaitDays;

                    var formats = [];
                    for (var f in medItemsObj[key].formats) {
                      console.log('format: ' + medItemsObj[key].formats[f].name);
                      formats.push(medItemsObj[key].formats[f].name);
                    }
                    
                    formats = formats.join(' ');
                    console.log('flattened formats ' + formats);


                    // this only works for two results
                    
                    if (formats.includes("audiobook")) {
                      console.log('in audiobook');
                       Object.assign(gr_to_read_obj, {
                        a_bookURL: book_result_url,
                        a_available: avail,
                        a_pplWaiting: pplWaiting,
                        a_estWaitDays: estWaitDays
                      });

                    } else {
                      console.log('in ebook');
                       Object.assign(gr_to_read_obj, {
                        e_bookURL: book_result_url,
                        e_available: avail,
                        e_pplWaiting: pplWaiting,
                        e_estWaitDays: estWaitDays
                      });
                    }
                    // book_data.push(gr_to_read_obj);
                    book_data = gr_to_read_obj;
                }
              }
          
          } else {
              console.log("no results found for " + book_data[2] + " at " + doc.title);
                  //gr_to_read_obj.bookURL = 'NA';
                  Object.assign(gr_to_read_obj, {
                    bookURL: 'NA',
                    formatType: 'NA', 
                  });

              //book_data.push('ebook no', 'audiobook no');
              book_data = gr_to_read_obj;

          }
            //console.log('full book data: ' + book_data);
            return book_data;
        })
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
        return true;  // this makes it async


    }

});

