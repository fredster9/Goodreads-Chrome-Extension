var book_result_url;

// Injects contentscript.js into a tab, skipping restricted pages it can't run on
function injectContentScript(tabId, tabUrl) {
  if (tabUrl && !tabUrl.startsWith("chrome://") && !tabUrl.startsWith("chrome-extension://") && !tabUrl.startsWith("about:")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["contentscript.js"],
    }).catch((error) => {
      console.log("Cannot inject script: " + error.message);
    });
  } else {
    console.log("Cannot inject script into restricted page: " + tabUrl);
  }
}

// when icon is clicked
chrome.action.onClicked.addListener(function (tab) {
  console.log("onclicked, url =", tab.url);
  getCurrentTabUrl((url) => {
    chrome.storage.sync.set(
      {
        url: url,
      },
      () => {}
    );
  });

  injectContentScript(tab.id, tab.url);
});

// utility function for getting the current url taken from the chrome getting started tutorial
function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true,
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    var tab = tabs[0];
    var url = tab.url;
    console.log("tab url", url);
    console.assert(typeof url == "string", "tab.url should be a string");
    callback(url);
  });
}

chrome.tabs.onActivated.addListener(function (activeInfo) {
  console.log("in tabs.onActivated");
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    if (chrome.runtime.lastError) {
      console.log("Error getting tab: " + chrome.runtime.lastError.message);
      return;
    }

    var url = tab.url;
    getCurrentTabUrl((url) => {
      chrome.storage.sync.set(
        {
          url: url,
        },
        () => {}
      );
    });

    injectContentScript(tab.id, tab.url);
  });
});

// chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
//   console.log("in tabs.onUpdated");
//   if (tab.active && change.url) {
//     var url = change.url;
//     getCurrentTabUrl((url) => {
//       chrome.storage.sync.set(
//         {
//           url: url,
//         },
//         () => {}
//       );
//     });
//     chrome.tabs.executeScript(null, {
//       file: "contentscript.js",
//     });
//   }
// });

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //console.log('in addListener');
  //console.log('sender.url = ' + sender.url); // this is page it comes from
  // console.log('request.url = ' + request.url);
  //console.log('request.contentScriptQuery = ' + request.contentScriptQuery);

  var requestQuery = request.contentScriptQuery;
  // console.log('request query ' + requestQuery);

  var queryNYPLresponse = []; // doc.title extact, ebook avail, audio avail

  // FETCH HTML
  if (request.contentScriptQuery == "fetchHTML") {
    console.log("in fetchHtml");
    console.log("fetch request url: " + request.url);
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
    return true; // this makes it async
    //
    // ADDTOSHELF
    // KILL THIS
    // } else if (requestQuery.includes("addToShelf") === true) {
    //   console.log("in addtoshelf");
    //   addURL = request.url;
    //   console.log("addBookID: " + addBookID);

    //   oauthTime(addBookID);
    //
    // QUERY
  } else if (requestQuery && requestQuery.includes("queryHoopla") === true) {
    // Hoopla API query
    console.log("in queryHoopla");
    var book_data_short = request.book_data_short;
    var hooplaLibraryId = request.hooplaLibraryId;

    if (!hooplaLibraryId || hooplaLibraryId.length < 1) {
      console.log("No Hoopla library ID provided");
      sendResponse(book_data_short);
      return true;
    }

    // Extract title and author from book data
    // book_data_short is an object from OverDrive processing, or array from Goodreads
    var title, author;
    if (Array.isArray(book_data_short)) {
      title = book_data_short[2]; // title is at index 2
      author = book_data_short[1]; // author is at index 1
    } else {
      // It's an object from OverDrive processing
      title = book_data_short.title || "";
      author = book_data_short.author || "";
    }

    // Clean title (strip subtitles, etc.)
    var cleanTitle = title.split("(")[0].split(":")[0].trim();
    // Clean author (if format is "last, first", just use last name)
    var cleanAuthor = author.split(",")[0].trim();

    // Hoopla API search endpoint
    var hooplaUrl = "https://api.hoopladigital.com/api/v1/libraries/" +
                    encodeURIComponent(hooplaLibraryId) +
                    "/search?term=" + encodeURIComponent(cleanTitle) +
                    "&author=" + encodeURIComponent(cleanAuthor) +
                    "&limit=10";

    console.log("Hoopla search URL: " + hooplaUrl);

    fetch(hooplaUrl)
      .then((response) => {
        if (!response.ok) {
          console.log("Hoopla API error: " + response.status);
          return null;
        }
        return response.json();
      })
      .then(function (data) {
        if (!data) {
          sendResponse(book_data_short);
          return;
        }

        console.log("Hoopla API response:", data);

        // Look for matching title/author in results
        var hooplaResult = null;
        if (data.found > 0 && data.titles && data.titles.length > 0) {
          // Try to find best match
          for (var i = 0; i < data.titles.length; i++) {
            var item = data.titles[i];
            var itemTitle = (item.title || "").toLowerCase();
            var itemAuthor = (item.artist || item.author || "").toLowerCase();

            // Fuzzy match - check if title and author are similar
            if (itemTitle.includes(cleanTitle.toLowerCase()) ||
                cleanTitle.toLowerCase().includes(itemTitle)) {
              if (!cleanAuthor || itemAuthor.includes(cleanAuthor.toLowerCase()) ||
                  cleanAuthor.toLowerCase().includes(itemAuthor)) {
                hooplaResult = item;
                break;
              }
            }
          }

          // If no exact match found, use first result
          if (!hooplaResult && data.titles.length > 0) {
            hooplaResult = data.titles[0];
          }
        }

        if (hooplaResult) {
          console.log("Hoopla match found:", hooplaResult);

          // Check available formats
          var formats = hooplaResult.formats || [];
          var hasAudiobook = false;
          var hasEbook = false;

          for (var f = 0; f < formats.length; f++) {
            var formatName = (formats[f].name || "").toLowerCase();
            if (formatName.includes("audiobook") || formatName.includes("audio")) {
              hasAudiobook = true;
            }
            if (formatName.includes("ebook") || formatName.includes("epub") ||
                formatName.includes("pdf") || formatName.includes("kindle")) {
              hasEbook = true;
            }
          }

          // Hoopla items are typically always available (no holds/waiting)
          var hooplaBaseUrl = "https://www.hoopladigital.com/title/";
          var hooplaTitleUrl = hooplaBaseUrl + hooplaResult.titleId;

          if (hasAudiobook) {
            book_data_short.h_a_bookURL = hooplaTitleUrl;
            book_data_short.h_a_available = true; // Hoopla items are typically available
            book_data_short.h_a_pplWaiting = 0;
            book_data_short.h_a_estWaitDays = 0;
          }

          if (hasEbook) {
            book_data_short.h_e_bookURL = hooplaTitleUrl;
            book_data_short.h_e_available = true;
            book_data_short.h_e_pplWaiting = 0;
            book_data_short.h_e_estWaitDays = 0;
          }
        } else {
          console.log("No Hoopla match found for: " + cleanTitle + " by " + cleanAuthor);
        }

        sendResponse(book_data_short);
      })
      .catch((error) => {
        console.error("Hoopla API error:", error);
        sendResponse(book_data_short);
      });
    return true; // this makes it async
  } else if (requestQuery && requestQuery.includes("query") === true) {
    // not sure why doesnt' work with above code
    console.log("in queryNYPL");
    //console.log('book data: ' + request.book_data_short);
    fetch(request.url)
      .then((response) => response.text())
      .then(function (data) {
        //console.log('in function data');
        book_data_short = request.book_data_short;
        console.log("book data short " + book_data_short);

        // Service workers have no DOM (no DOMParser), so pull everything we
        // need directly out of the raw HTML text with regex instead.

        var titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(data);
        title = titleMatch ? titleMatch[1] : "";
        title = title.replace("Search results for ", "");
        // Remove library name and OverDrive suffix (works for any library)
        title = title.replace(/\s*-\s*.*?\s*-\s*OverDrive$/i, "");
        console.log("title " + title);

        // Check for "no results" - look for common no results indicators in any <h1>
        var no_results = null;
        var h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
        var h1Match;
        while ((h1Match = h1Re.exec(data)) !== null) {
          var h1Text = h1Match[1].toLowerCase();
          if (h1Text.includes("no results") || h1Text.includes("no matches") || h1Text.includes("try again")) {
            no_results = h1Match[1];
            break;
          }
        }

        // create empty
        gr_to_read_obj = {
          pos_on_page: book_data_short[0],
          author: book_data_short[1],
          title: book_data_short[2],
          searchURL: book_data_short[3],
        };

        console.log("gr_to_read_obj short");
        console.log(JSON.stringify(gr_to_read_obj, null, 4));

        if (no_results === null) {
          // Try to find mediaItems by scanning the raw HTML text (no DOM available)
          var medItemsObj = null;

          // Try multiple patterns to find mediaItems
          var patterns = [
            /mediaItems\s*=\s*({[^}]*{[^}]*}})\s*;/s,
            /mediaItems\s*=\s*({[\s\S]*?}});/s,
            /var\s+mediaItems\s*=\s*({[\s\S]*?});/s,
            /window\.mediaItems\s*=\s*({[\s\S]*?});/s,
            /"mediaItems":\s*({[\s\S]*?}),/s,
            /mediaItems\s*:\s*({[\s\S]*?})/s
          ];

          for (var p = 0; p < patterns.length; p++) {
            var match = data.match(patterns[p]);
            if (match && match[1]) {
              try {
                var mediaItemsStr = match[1];
                // Clean up the string
                mediaItemsStr = mediaItemsStr.trim();
                // Try to parse as JSON
                medItemsObj = JSON.parse(mediaItemsStr);
                console.log("Found mediaItems using pattern " + p);
                break;
              } catch (e) {
                console.log("Pattern " + p + " matched but JSON parse failed: " + e);
                // Try to extract just the object part
                try {
                  // Look for the object structure more carefully
                  var objMatch = /({[\s\S]*?})/s.exec(match[0]);
                  if (objMatch) {
                    medItemsObj = JSON.parse(objMatch[1]);
                    console.log("Found mediaItems using pattern " + p + " (second attempt)");
                    break;
                  }
                } catch (e2) {
                  console.log("Second parse attempt also failed");
                }
              }
            }
          }

          if (medItemsObj) {
            // Extract base URL from the search URL or use default
            var urlObj = new URL(request.url);
            book_result_url_base = urlObj.origin + "/media/";

            // Process all media items - handle multiple formats correctly
            for (var key in medItemsObj) {
              if (medItemsObj.hasOwnProperty(key)) {
                console.log(key + " -> " + JSON.stringify(medItemsObj[key]));

                book_result_url = book_result_url_base + key;
                var item = medItemsObj[key];
                var avail = item.isAvailable;
                var pplWaiting = item.holdsCount || 0;
                var estWaitDays = item.estimatedWaitDays || 0;

                // Check formats array
                var formats = [];
                if (item.formats && Array.isArray(item.formats)) {
                  for (var f = 0; f < item.formats.length; f++) {
                    if (item.formats[f].name) {
                      formats.push(item.formats[f].name.toLowerCase());
                    }
                  }
                } else if (item.formats) {
                  // Handle object-based formats
                  for (var f in item.formats) {
                    if (item.formats[f].name) {
                      formats.push(item.formats[f].name.toLowerCase());
                    }
                  }
                }

                var formatStr = formats.join(" ");
                console.log("Formats for " + key + ": " + formatStr);

                // Set ebook and audiobook info separately - don't overwrite
                if (formatStr.includes("audiobook") || formatStr.includes("audio")) {
                  console.log("Setting audiobook info");
                  gr_to_read_obj.a_bookURL = book_result_url;
                  gr_to_read_obj.a_available = avail;
                  gr_to_read_obj.a_pplWaiting = pplWaiting;
                  gr_to_read_obj.a_estWaitDays = estWaitDays;
                }

                if (formatStr.includes("ebook") || formatStr.includes("epub") || formatStr.includes("pdf") || formatStr.includes("kindle")) {
                  console.log("Setting ebook info");
                  gr_to_read_obj.e_bookURL = book_result_url;
                  gr_to_read_obj.e_available = avail;
                  gr_to_read_obj.e_pplWaiting = pplWaiting;
                  gr_to_read_obj.e_estWaitDays = estWaitDays;
                }
              }
            }
            book_data_short = gr_to_read_obj;
          } else {
            console.log("Could not find mediaItems in page HTML - may need to update parsing logic");
            // Still return the object structure but without availability data
            book_data_short = gr_to_read_obj;
          }
        } else {
          console.log("No results found for " + book_data_short[2]);
          // No results - ensure object structure is correct
          book_data_short = gr_to_read_obj;
        }
        //console.log('full book data: ' + book_data_short);
        return book_data_short;
      })
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
    return true; // this makes it async
  }
});

// when option page link is clicked
chrome.runtime.onMessage.addListener(function (message) {
  console.log("options page listnener");
  switch (message.action) {
    case "openOptionsPage":
      openOptionsPage();
      break;
    default:
      break;
  }
});

function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}
