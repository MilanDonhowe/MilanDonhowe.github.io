/*
==============================
=====- Popup.js script =======
==============================
====== By Milan Donhowe ======
==============================
*/


'use strict';

window.onload = function(){

    // attach functions to buttons on HTML
    var loadListen = document.getElementById("load").addEventListener('click', loadUrls);
    var saveListen = document.getElementById("save").addEventListener('click', savePage);
       

}


let loadUrls = () => {
    // load saved urls and iterate through them
    console.log("loadUrls called");
}

let savePage = () => {
    // get the current page, check if amazon product and if price is extractable.
    console.log("savePage called");
    
    let tabURL = "loading...";

    // ask background.js to do the heavily lifting

    let port = chrome.extension.connect({
        name: "Get Current Tab URL"
    });



    port.postMessage("TABURL");
    port.onMessage.addListener(function(msg){
        console.log("Message recieved:" + msg);
        tabURL = msg;
        // switch case for future expandability
        switch(msg){
            case "NONAMAZON":
                console.log("ERROR: Page not amazon.");
                break;
        }
        
    });


}