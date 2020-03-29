/*

REFERENCES
https://medium.com/@ssaitta13/recipal-a-first-chrome-extension-18c2848cf822
https://github.com/rubenmv/extension-goodreads-ratings-for-amazon/blob/master/content.js
https://github.com/ssaitta/ReciPal

*/
var website = '';
var parser = new DOMParser();
var key = '8skO59XMpdv088mf68ehZQ'; // Goodreads API key unique to user
var gr_user_id = '23956770'; // Goodreads ID unique to user


// Checks Goodreads shelf using BookID 
// When successful, posts div on top of page

function checkAuthor(gr_author_id, gr_author_name) {
	console.log ('in checkAuthor');
	gr_author_id = gr_author_id;
	gr_author_name = gr_author_name;

	
	// replace spaces in authors name to make search query	
	var query_author_name = gr_author_name.replace(/ /g,'+').replace(/\./g,'');
	console.log('query author name ' + query_author_name);

	// first call to determine # of results
	var pg_num = 1; // not really needed when querying author with enough per_page
	var per_page = 50; // up to 200, 50 should be safe
	// https://www.goodreads.com/review/list/23956770.xml?key=8skO59XMpdv088mf68ehZQ&sort=author&per_page=10&v=2
	var urlGoodreadsAuthor = 
        "https://www.goodreads.com/review/list/" + 
        gr_user_id +
        ".xml?" +
        "key=" + key + 
        "&search%5Bquery%5D=" + query_author_name + // the %5B and D are encoding for square brackets
        "&sort=author" + // maybe not needed
        "&per_page=" + per_page +
        "&page=" + pg_num +
        "&v=2";
    console.log(urlGoodreadsAuthor);

    // empty return object - a list of lists
    var author_results = [];

	 chrome.runtime.sendMessage({
	    contentScriptQuery: "fetchHTML",
	    url: urlGoodreadsAuthor
	}, data => {
	    let doc = parser.parseFromString(data, "text/html");

	    const reviews = doc.querySelectorAll('review');

	    for (let i = 0; i < reviews.length; i++) {
	    	//console.log('review' + reviews[i].innerHTML);
	    	auth_id = reviews[i].querySelectorAll('author id')[0].innerHTML;
	    	console.log('author id ' + auth_id);

	    	if (auth_id == gr_author_id) {

	 			var title = reviews[i].querySelectorAll("title")[0].innerHTML;
	 			var rating = reviews[i].querySelectorAll("rating")[0].innerHTML;
	 			// below getElemntsByTagName works for 'id' but not 'link'
	 			var book_url = reviews[i].getElementsByTagName("link");
                var book_url_other = reviews[i].querySelectorAll("link")[0].innerHTML;
                var book_url_other2 = reviews[i].querySelectorAll("link")[0].innerText;


	 			console.log('title ' + title);
	 			console.log('rating ' + rating);
	 			console.log('url ' + book_url);
	 			console.log('url length' + book_url.length);
                console.log('url other' + book_url_other);
                console.log('url other2' + book_url_other2);

	 			var j;
	 			for (j = 0; j < book_url.length; j++) {
	 				console.log('book url ' + book_url[j].innerText);
                    console.log('length' + book_url[j].length );
	 			}

	 			author_results.push([title, rating, book_url]);
	 			//console.log('author results in loop ' + author_results);
	    	}

	    }

	    //console.log('author_results out of loop ' + author_results);

	    // append this info to div
	    var current_div = document.getElementById('testResults');
	    console.log('div contents' + current_div.innerHTML);
	    var current_div_height = current_div.offsetHeight;


	    if (author_results.length === 0) {

	    	var text_content = "No other books read by this author";
			console.log('text content ' + text_content);
			var current_div_height = current_div.offsetHeight;
			var new_current_div_height = 20;
			current_div.style.height = new_current_div_height + 'px';
			current_div.innerHTML += "<br>" + text_content;

		} else {

			var x;
			for (x = 0; x < author_results.length; x++) {

				var auth_content = author_results[x];
				console.log('auth content ' + auth_content);
				var current_div_height = current_div.offsetHeight;
				var new_current_div_height = current_div_height + 20;
				current_div.style.height = new_current_div_height + 'px';
				current_div.innerHTML += "<br>" + auth_content;
			}
	    } 


	});

}

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
        
        // get rating
        let gr_rating_check = doc.querySelectorAll("rating")[0];

        if (typeof gr_rating_check === 'undefined') {
            console.log('either request failed (??) or not rated');
            bar_text = 'No rating found';
            
        } else {
            let gr_rating = doc.querySelectorAll("rating")[0].textContent;
            console.log('Goodreads rating: ' + gr_rating);
            bar_text = 'Goodreads rating for this book: ' + gr_rating;
        }

        // get author
        let gr_author_id = doc.querySelectorAll("author id")[0].textContent;
        let gr_author_name = doc.querySelectorAll("author name")[0].textContent;
        console.log('author id: ' + gr_author_id);
        console.log('author name: ' + gr_author_name);

        const div = document.createElement("div");
        div.setAttribute("id", "testResults");
        div.style.height = "20px";
        div.style.background = "LemonChiffon";
        var para = document.createElement("p"); // used?
        var text_content = document.createTextNode(bar_text);
        para.style.fontSize = "14px";
        document.body.insertBefore(div, document.body.firstChild);
        testResults.appendChild(text_content);

        // GO TO AUTHOR FUNCTIONS
        checkAuthor(gr_author_id, gr_author_name);

    });

}


// Takes Amazon ASIN and checks Goodreads for book 
// When successful goes to see if it's on Goodreads shelf
function getBookIDASIN(asin) {
    var isbn = asin;
    var urlGoodreads = "https://www.goodreads.com/book/isbn/" + isbn + "?key=" + key;
    console.log("Retrieving goodreads info from url: " + urlGoodreads);

    chrome.runtime.sendMessage({
        contentScriptQuery: "fetchHTML",
        url: urlGoodreads
    }, data => {
        //console.log('data' + data);
        let doc = parser.parseFromString(data, "text/html");
        console.log(doc);
        let gr_title = doc.querySelectorAll("title")[0].textContent;
        let gr_book_id = doc.querySelectorAll("best_book_id")[0].textContent;

        console.log('Goodreads title tag: ' + gr_title);
        console.log('Goodreads book ID: ' + gr_book_id);

        checkMyShelf(gr_book_id);

    });
}


// Code to get ASIN from Amazon
// This all comes from https://github.com/rubenmv/extension-goodreads-ratings-for-amazon/blob/master/content.js

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


// Gets ASIN from Amazon using one of the three methods above
// When succcessful, goes to get BookID from Goodreads 
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

    getBookIDASIN(asin);
}


// Fetch Goodreads Book ID using the ISBN
// When successful, goes to see if it's on the Goodreads shelf
function getBookIDfromISBN(overdriveISBN) {

	var isbn = overdriveISBN;
    var urlGoodreads = "https://www.goodreads.com/book/isbn/" + isbn + "?key=" + key;
    console.log("Retrieving goodreads info from url: " + urlGoodreads);

    chrome.runtime.sendMessage({
        contentScriptQuery: "fetchHTML",
        url: urlGoodreads
    }, data => {
        //console.log('data' + data);
        let doc = parser.parseFromString(data, "text/html");
        console.log(doc);
        let gr_title = doc.querySelectorAll("title")[0].textContent;
        let gr_book_id = doc.querySelectorAll("best_book_id")[0].textContent;

        console.log('Goodreads title tag: ' + gr_title);
        console.log('Goodreads book ID: ' + gr_book_id);

        checkMyShelf(gr_book_id);
    });
}


// Extract the ISBN from OverDrive page
// When successful, sends to function that gets Goodreads bookID using ISBN
function getISBNOverdrive() {
	console.log('in getISBNOverdrive');

	let overdriveISBNelement = document.querySelectorAll("[aria-label^='ISBN']")[0].textContent
	console.log('overdriveISBNelement ' + overdriveISBNelement)
	var numberPattern = /\d+/g;
	overdriveISBN = overdriveISBNelement.match(numberPattern);
	console.log('overdriveISBN ' + overdriveISBN);

	getBookIDfromISBN(overdriveISBN);
}


// Checks website and only runs on Amazon or NYPL ebooks library
// TODO: except hoopla, bookbub, and others using the same Amazon info?
function getSite() {

    if (website === 'amazon') {
        console.log('amazon');
        getISBNAmazon();
    } else if (website === 'overdrive') {
        console.log('overdrive');
        getISBNOverdrive();
    } else {
        console.log('not on right site');
    }

}

// Use the async API chrome.storage to retreive the url from the backgorund script. 
chrome.storage.sync.get('url', (obj) => {
    let url = obj.url;
    if (url.indexOf('amazon') !== -1) {
        website = 'amazon';
    } else if (url.indexOf('overdrive') !== -1) {
        website = 'overdrive';
    }

    console.log ('initial get website = ' + website);

    getSite();
});