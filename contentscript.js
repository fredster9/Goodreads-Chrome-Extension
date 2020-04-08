/*

REFERENCES
https://medium.com/@ssaitta13/recipal-a-first-chrome-extension-18c2848cf822
https://github.com/rubenmv/extension-goodreads-ratings-for-amazon/blob/master/content.js
https://github.com/ssaitta/ReciPal


///// AMAZON CHECK READ ////

*/
var website = '';
var parser = new DOMParser();
var key = '8skO59XMpdv088mf68ehZQ'; // Goodreads API key unique to user
var gr_user_id = '23956770'; // Goodreads ID unique to user
var gr_to_read = []; // empty return object - a list of lists
var gr_to_read_array = []; // list of obj
var gr_final_obj;


// https://www.goodreads.com/review/show_by_user_and_book.xml?book_id=42112733&key=8skO59XMpdv088mf68ehZQ&user_id=23956770
// https://www.goodreads.com/review/69647/show.xml?key=8skO59XMpdv088mf68ehZQ


// Checks Goodreads shelf using BookID 
// When successful, posts div on top of page

function checkAuthor(gr_author_id, gr_author_name, gr_book_id) {
    console.log('in checkAuthor');
    gr_author_id = gr_author_id;
    gr_author_name = gr_author_name;
    gr_book_id = gr_book_id;

    // replace spaces in authors name to make search query  
    var query_author_name = gr_author_name.replace(/ /g, '+').replace(/\./g, '');
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

                var book = reviews[i].getElementsByTagName("book")[0];
                // console.log('book tag ' + book);

                var books = doc.querySelectorAll('book');

                var book_child = books[i].children[9].innerText;
                // console.log('book_child ' + book_child);

                var book_id_this = books[i].querySelectorAll("id")[0].innerHTML; 

                var book_url = book_child.match(/\bhttps?:\/\/\S+/gi);

                console.log('book_id_this' + book_id_this); 
                console.log('title ' + title);
                console.log('rating ' + rating);
                console.log('url ' + book_url);

                author_results.push([book_id_this, title, rating, book_url[0]]);
                
            }
        }
        textBar(author_results, gr_book_id);
    }

)}

    function textBar(author_results, gr_book_id) {
            // create div and append results
            const div = document.createElement("div");
            div.setAttribute("id", "testResults");
            div.style.height = "20px";
            div.style.background = "Azure"; // bar color
            var para = document.createElement("p"); // used?
            var text_content = document.createTextNode(bar_text);
            para.style.fontSize = "14px";
            document.body.insertBefore(div, document.body.firstChild);
            testResults.appendChild(text_content);

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
                        //current_div.innerHTML += "<br>" + auth_content;


                        console.log('gr book id ' + gr_book_id);
                        console.log('this book id ' +  author_results[x][0]);
                
                        if (author_results[x][0] == gr_book_id) {
                            
                            console.log('ids match');
                            current_div.innerHTML += '<br><a href="' + auth_content[3] + '">' + auth_content[1] + 
                            '</a>' + ', ' + auth_content[2] + '  <-- on this book page right now';
                        
                        } else {

                            current_div.innerHTML += '<br><a href="' + auth_content[3] + '">' + auth_content[1] + 
                            '</a>' + ', ' + auth_content[2];
                        }
                    }
            }
    
        }    


    function checkMyShelf(gr_book_id, gr_author_id, gr_author_name) {

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
                //getAuthorIDnotread(gr_book_id);
                checkAuthor(gr_author_id, gr_author_name);

            } else {
                let gr_rating = doc.querySelectorAll("rating")[0].textContent;
                console.log('Goodreads rating: ' + gr_rating);
                bar_text = 'Goodreads rating for this book: ' + gr_rating;
            }

            checkAuthor(gr_author_id, gr_author_name, gr_book_id);

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
            let gr_author_name = doc.querySelectorAll("author name")[0].textContent;
            let gr_author_id = doc.querySelectorAll("author id")[0].textContent;

            console.log('Goodreads title tag: ' + gr_title);
            console.log('Goodreads book ID: ' + gr_book_id);
            console.log('Goodreads author name: ' + gr_author_name);
            console.log('Goodreads author ID: ' + gr_author_id);


            checkMyShelf(gr_book_id, gr_author_id, gr_author_name);

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
            let gr_author_name = doc.querySelectorAll("author name")[0].textContent;
            let gr_author_id = doc.querySelectorAll("author id")[0].textContent;

            console.log('Goodreads title tag: ' + gr_title);
            console.log('Goodreads book ID: ' + gr_book_id);
            console.log('Goodreads author name: ' + gr_author_name);
            console.log('Goodreads author ID: ' + gr_author_id);

            checkMyShelf(gr_book_id, gr_author_id, gr_author_name);

        });
    }

    // Extract the ISBN from OverDrive page
    // When successful, sends to function that gets Goodreads bookID using ISBN
    function getISBNOverdrive() {
        console.log('in getISBNOverdrive');

        let overdriveISBNelement = document.querySelectorAll("[aria-label^='ISBN']")[0].textContent;
        console.log('overdriveISBNelement ' + overdriveISBNelement);
        var numberPattern = /\d+/g;
        overdriveISBN = overdriveISBNelement.match(numberPattern);
        console.log('overdriveISBN ' + overdriveISBN);

        getBookIDfromISBN(overdriveISBN);
    }

    ///// GOODREADS CHECK TO READ IS AVAIL ON NYPL /////

    function fetchNYPL(gr_to_read) {
        console.log('in fetchNYPL');
        
        for (var i = 0; i < gr_to_read.length; i++) {
            console.log('in fetch NYPL loop' + i);
            //     gr_to_read_array.push(data);
            //     console.log('gr_to_read array IN LOOP: ' + gr_to_read_array);
            // }

            //console.log('gr_to_read[i]' + gr_to_read[i]);
            
            urlNYPL = gr_to_read[i][3];
            book_data = gr_to_read[i];

            chrome.runtime.sendMessage({
                contentScriptQuery: "queryNPL",
                url: urlNYPL,
                book_data: gr_to_read
            }, data => {

                console.log(" in data part of fetchHTML");
                //console.log('background gr_to_read: ' + data);
                console.log('gr_to_read_obj returned' + JSON.stringify(data, null, 4));
                gr_to_read_array.push(data);
                //return gr_to_read_array;
                console.log('array in for loop' + gr_to_read_array);
  

            });
            
        }

        console.log('gr array outside for loop' + gr_to_read_array);
    }

    
        function makeurlNYPL(gr_to_read) {
    // gr_to_read is list of lists, [isbn, author, title, NYPL url, ebook avail, audio avail, ppl waiting, est wait days]

        console.log('in queryNYPL');

        var nypl_url_base = 'https://nypl.overdrive.com/search/title?query=';  // https://nypl.overdrive.com/search/title?query=speedboat&creator=renata+adler
        
        for (var i = 0; i < gr_to_read.length; i++) {
            console.log('gr_to_read loop, pos ' + i); //+ ' : ' + gr_to_read[i]);

            // replace spaces with +
            // because author format is 'last, first' use only last
            var url_author = gr_to_read[i][1].split(',')[0];
            
            // strip subtitles 
            var url_title = gr_to_read[i][2].split('(')[0];
            url_title = url_title.split(':')[0];
            url_title = url_title.replace(/ /g, '+').replace(/\./g, '');
            // console.log('url_author: ' + url_author);
            // console.log('url_title: ' + url_title);

            urlNYPL = nypl_url_base + url_title + "&creator=" + url_author;
            //console.log('urlNYPL: ' + urlNYPL);
            gr_to_read[i].push(urlNYPL);

        }

        // var promises = [];

        // for (var i = 0; i < gr_to_read.length; i++) {
        //     console.log('in go fetch loop' + i);
        //     promises.push(fetchNYPL(gr_to_read[i]));

        // }

        // Promise.all(promises)
        // .then(function() {
        //     gr_to_read_array.push(data);
        //     console.log('in function push'); // NOT GETTING HERE
        // }).then(function() {
        //     console.log('FINAL ANSWER' + gr_to_read_array);
        // }) //;
        // .catch(function(err) {
        // console.log('promise error'); // IS GETTING HERE
        // });

        asyncFetch(gr_to_read);
    }

    async function asyncFetch(gr_to_read) {
        gr_final = await fetchNYPL(gr_to_read);
        console.log('FINAL RESULTS' + gr_final);
    }


    ////

    function parseToRead() {
        console.log('in parseToRead');
        var books = document.getElementsByClassName('bookalike review');
        //console.log('book alike ' + books.innerHTML);  

        var without_isbn = 0;

        for (let i = 0; i < books.length; i++) {
            // console.log('books id ' + books[i].id);
            
            var title_row = books[i].getElementsByClassName('field title')[0];
            var title = title_row.querySelectorAll("div a")[0].innerText;
            // console.log('title: ' + title);

            var author_row = books[i].getElementsByClassName('field author')[0];
            var author = author_row.querySelectorAll("div a")[0].innerText;
            // console.log('author: ' + author);

            var isbn_row = books[i].getElementsByClassName('field isbn')[0];
            var gr_isbn = isbn_row.querySelectorAll("div.value")[0].innerText.trim();
            // console.log('isbn length ' + isbn.length);
            // console.log('isbn: ' + isbn);

            if (gr_isbn.length === 1) {
                // console.log('in isbn loop');
                // console.log('isbn in loop ' + gr_isbn);
                gr_isbn = "NO ISBN";
                //console.log('book does not have isbn ' + title);
                without_isbn++;
                //return gr_isbn;
            } 
            
            gr_to_read.push([gr_isbn, author, title]);
            //console.log('book # ' + i + ': ' + gr_isbn);
        }

        //console.log("without isbn: " + without_isbn); // 11/37 - 30% - don't have ISBN
        // console.log('gr_to_read_ list: ' + gr_to_read);
        makeurlNYPL(gr_to_read);

    }


    ///// CHECK CURRENT SITE /////

    // Checks website and only runs on Amazon or NYPL ebooks library
    // TODO: except hoopla, bookbub, and others using the same Amazon info?
    function getSite() {

        if (website === 'amazon') {
            console.log('amazon');
            getISBNAmazon();
        } else if (website === 'overdrive') {
            console.log('overdrive');
            getISBNOverdrive();
        } else if (website === 'goodreads-to-read') {
            console.log('goodreads');
            parseToRead();
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
        } else if (url.indexOf('shelf=to-read') !== -1 ) {
            website = 'goodreads-to-read';
        }

        console.log('initial get website = ' + website);
        getSite();


    });