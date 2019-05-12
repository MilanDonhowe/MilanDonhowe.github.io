'use strict';

let notifications = 0;

// run code on install/reload
chrome.runtime.onInstalled.addListener(function() {

	console.log(' background.js loaded');


	// test save urls
	
	//chrome.storage.sync.set({"AmazonURLS": {"https://www.amazon.com/Amazon-Echo-Dot-Portable-Bluetooth-Speaker-with-Alexa-Black/dp/B01DFKC2SO/ref=zg_bs_electronics_home_3?_encoding=UTF8&psc=1&refRID=B2NH4HN9QXK5K1D9KW8C":"4.43"}}, function(data){
	//	loadUrls();
	//});
	
	chrome.browserAction.setBadgeText({text: ""});

	
});

// run code on extension startup
chrome.runtime.onStartup.addListener(function(){
	console.log('running on start up');
	loadUrls();
});




// Notes:
// the id priceblock_ourprice outputs the main price of a page.  However this seems to vary for book listings which have multiple purchase options.  Maybe figure out how to test difference or just ignore books?


// Scrapes the price of an amazon price product when given a url
function scrapePage(url){

	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
				
				// Parse using DOM Parser
				let parser = new DOMParser();
				let htmlDoc = parser.parseFromString(xhttp.responseText, "text/html");
				
				// For book listings there are multiple prices.
				let price = ""
				try {
					price = htmlDoc.getElementById('priceblock_ourprice').innerHTML;
				}
				catch(err) {
					try{
						price = htmlDoc.getElementById('priceblock_dealprice').innerHTML;
					}
					catch(err){
						alert('Sorry I couldn\'t find the price of this product.');
					}
				}

				
				//remove any dollar signs ($) that may mess with parsing the string to a float.
				let formatPrice = price.replace("$", "");

				console.log(formatPrice);
				
				// save new price.
				saveNew({[url]:formatPrice});
				
			}
		};
	xhttp.open("GET", url, true);
	xhttp.send();
}


// example amazon urls for testing purposes
function saveNew(test){
	// {"urlhere": "18.95"}
	// only one at a time for now

	chrome.storage.sync.get({"AmazonURLS": {}}, function(data){
		
		console.log(Object.keys(data.AmazonURLS));

		console.log(Object.keys(test)[0]);

		// save unique urls
		if(Object.keys(test)[0] in data.AmazonURLS){
			
			console.log("URL already stored.");
			for (let key in test){
				let tempPrice = test[key];
				console.log("Temp price is " + tempPrice);
				let tempUrl = key;
				console.log("Temp url is " + tempUrl);
				comparePrice(tempUrl, tempPrice);
			}

		} else {
		
			for(var key in test){
				let value = test[key];
				
				let newData = data.AmazonURLS;
			
				// add the new value to data
				newData[key] = value;
				chrome.storage.sync.set({"AmazonURLS": newData});
				
			}
		}

	});
}

// compares old amazon price with the new amazon price and then saves new price if it is lower.
function comparePrice(url, newPrice){

	chrome.storage.sync.get({"AmazonURLS": {}}, function(data){
		
		if (url in data.AmazonURLS){
			// make saved price a float
			let oldPrice = data.AmazonURLS[url];
			console.log("The old price is " + oldPrice);
			if(newPrice < oldPrice){
				
				//update new price
				let newData = data.AmazonURLS;
				newData[url] = newPrice;

				//notification of new deal
				//chrome.browserAction.setBadgeText({text: "!"});
				//alert('price change friendo');

				// fun stuff
				
				let notify = confirm("There has been a new deal detected!  Price drop from " + oldPrice + " to " + newPrice + ".  Do you want to view product?");
				if (notify == true){
					chrome.tabs.create({url:url});
				}

				chrome.storage.sync.set({ "AmazonURLS" : newData });
				
				
				// check that save worked
				chrome.storage.sync.get({"AmazonURLS": {}}, function(data){
					console.log(data.AmazonURLS);
				});
				
				

			} else {
				console.log("no price change for " + url);
				//TESTING
				//loadUrls();
			}


		} else {
			console.log("There is no saved history of tracking " + url);
		}
	});

}






// Load saved urls

function loadUrls(){
	chrome.storage.sync.get({"AmazonURLS": {}}, function(data){
		let keyLength = Object.keys(data.AmazonURLS).length;
		console.log(data.AmazonURLS); 
		// loop through array
		for(let key in data.AmazonURLS){
			// check price for each url
			scrapePage(key);
		}

	});
}




// GRAB TAB URL
chrome.extension.onConnect.addListener(function(port){
	console.log("Message recieved.  Sending response.");

	port.onMessage.addListener(function(msg){
		if (msg == "TABURL"){


			// initialize variable to hold the url in this context
			let tabURL = "";

			chrome.tabs.query({lastFocusedWindow: true, active: true}, function(tabs){
				// test if url can be retrieved
				if(tabs[0].url != undefined){
					console.log(tabs[0].url);
					tabURL = tabs[0].url;
					// do stuff with this new data
					if (tabURL.startsWith("https://www.amazon.com/")){
						console.log("Amazon Link Recieved.");
						scrapePage(tabURL);
					}
					else {
						console.log("NON-AMAZON LINK.");
						// return err msg;
						alert("Sorry this is a non-amazon page so I can't track this product.")
						port.postMessage("NONAMAZON");
					}
				}	
			});

			
		}
	});

});