/* 
PSEUDOCODE
[] Get the URL of the page
[] Using that, extract the ISBN
[] Send that to background_script to look up book_id
[] Use book_id to do the user and book lookup
[] Send flag back to content_script 
[] Change pag accordingly

REFERENCES
https://medium.com/@ssaitta13/recipal-a-first-chrome-extension-18c2848cf822
https://github.com/rubenmv/extension-goodreads-ratings-for-amazon/blob/master/content.js
https://github.com/ssaitta/ReciPal

*/
var website = '';
var parser = new DOMParser();
var key = '8skO59XMpdv088mf68ehZQ';
var gr_user_id = '23956770';


function checkMyShelf(gr_book_id) {

    gr_book_id = gr_book_id;

    var urlGoodreadsShelf =
        "https://www.goodreads.com/review/show_by_user_and_book.xml?book_id=" + gr_book_id + "&key=" + key +
        "&user_id=" + gr_user_id;
    console.log(urlGoodreadsShelf);

    chrome.runtime.sendMessage({
        contentScriptQuery: "fetchHTML",
        url: urlGoodreadsShelf
    }, data => {
        let doc = parser.parseFromString(data, "text/html");
        let gr_rating_check = doc.querySelectorAll("rating")[0];

        if (typeof gr_rating_check === 'undefined') {
            console.log('either request failed (??) or not rated');
            bar_text = 'No rating found';
        } else {
            let gr_rating = doc.querySelectorAll("rating")[0].textContent;
            console.log('Goodreads rating: ' + gr_rating);
            bar_text = 'Goodreads rating: ' + gr_rating;
        }

        const div = document.createElement("div");
        div.setAttribute("id", "testResults");
        div.style.height = "30px";
        div.style.background = "yellow";
        div.textContent = bar_text;
        div.style.fontSize = "18px";
        document.body.insertBefore(div, document.body.firstChild);

    });

}


function getBookID(asin) {
    var isbn = asin;
    var urlGoodreads = "https://www.goodreads.com/book/isbn/" + isbn + "?key=" + key;
    console.log("Retrieving goodreads info from url: " + urlGoodreads);
    
    chrome.runtime.sendMessage({
        contentScriptQuery: "fetchHTML",
        url: urlGoodreads
    }, data => {
        console.log('data' + data);
        let doc = parser.parseFromString(data, "text/html");
        let gr_title = doc.querySelectorAll("title")[0].textContent;
        let gr_book_id = doc.querySelectorAll("best_book_id")[0].textContent;

        console.log('Goodreads title tag: ' + gr_title);
        console.log('Goodreads book ID: ' + gr_book_id);

        checkMyShelf(gr_book_id);

    });
}


/**

 * ISBN-10 to ISBN-13 conversor
 * http://www.dispersiondesign.com/articles/isbn/converting_isbn10_to_isbn13
 */
function isbn10to13(isbn10) {
    log("isbn10to13 : isbn10 = " + isbn10);
    // Get every char into an array
    var chars = isbn10.split("");
    // Prepend 978 code
    chars.unshift("9", "7", "8");
    // Remove last check digit from isbn10
    chars.pop();
    // Convert to isbn-13
    var i = 0;
    var sum = 0;
    for (i = 0; i < 12; i++) {
        sum += chars[i] * ((i % 2) ? 3 : 1);
    }
    var check_digit = (10 - (sum % 10)) % 10;
    chars.push(check_digit);
    // Array back to string
    var isbn13 = chars.join("");
    // Conversion failed?
    if (isbn13.indexOf("NaN") !== -1) {
        isbn13 = "";
    }
    log("isbn13 = " + isbn13);
    return isbn13;
}


function findAsinOrIsbnText() {
    let found = extractByTerm("isbn-10:");
    if (found === undefined) found = extractByTerm("isbn-13:");
    if (found === undefined) found = extractByTerm("asin:");
    console.log("found: " + found);
    return found;
}

function extractByTerm(searchTerm) {
    searchTerm = searchTerm.toUpperCase();
    var aTags = document.getElementsByTagName("li");
    let text;
    for (let i = 0; i < aTags.length; i++) {
        if (aTags[i].textContent.toUpperCase()
            .indexOf(searchTerm) > -1) {
            text = aTags[i].textContent.toUpperCase()
                .replace(searchTerm, '')
                .trim();
            break;
        }
    }
    return text;
}


function getISBNAmazon() {

    // Method 1
    asin = findAsinOrIsbnText();
    if (asin !== undefined) console.log("Method 1 asin found: " + asin);
    // Method 2
    if (asin === undefined) {
        var asinElement = document.querySelectorAll('[data-detailpageasin]')[0];
        if (asinElement !== undefined) {
            asin = asinElement.getAttribute('data-detailpageasin');
            console.log("Method 2 asin found: " + asin);
        }
    }
    // Method 3
    if (asin === undefined) {
        // ASIN not found (not Amazon.com), search again by hidden input
        asin = document.querySelectorAll("input[name*=ASIN]")[0];
        if (asin !== undefined) {
            asin = asin.value;
            console.log("Method 3 asin found: " + asin);
        }
    }
    // Method 4
    if (asin === undefined) {
        asin = document.querySelectorAll('[data-asin]')[0];
        if (asin !== undefined) {
            asin = asin.getAttribute('data-asin');
            console.log("Method 4 asin found: " + asin);
        }
    }
    // Everything fails, all is lost
    if (asin === undefined || asin.length === 0 || asin.trim() === "") {
        console.log("GoodreadsForAmazon: ASIN not found");
        return false;
    }

    getBookID(asin);
}


//delayed so that the async chrome.storage.sync.get() is completed first ??
function getSite() {

    // remove testResults if it exists -> is this ever used??
    if (document.contains(document.getElementById("testResults"))) {
            document.getElementById("submitbutton").remove();
        }


    if (website === 'amazon') {
        console.log('amazon');
        getISBNAmazon();
    } else if (website === 'overdrive') {
        console.log('overdrive');
        console.log('not on right site');
        getISBNOverdrive();
    } else {}

}

//use the async API chrome.storage to retreive the url from the backgorund script. 
chrome.storage.sync.get('url', (obj) => {
    let url = obj.url;
    if (url.indexOf('amazon') !== -1) {

        website = 'amazon';
    } else if (url.indexOf('overdrive') !== -1) {
        website = 'overdrive';
    }

    getSite();
});