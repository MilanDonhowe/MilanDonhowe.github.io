/*
==============================
===== Product.js script ======
==============================
====== By Milan Donhowe ======
==============================
*/



// Loads saved urls
window.onload = function(){

    //var table = Document.createElement('p');

    chrome.storage.sync.get({"AmazonURLS": []}, function(data){
        
        for ( let i in Object.keys(data.AmazonURLS) ){
        
            let url = Object.keys(data.AmazonURLS)[i];
            let price = data.AmazonURLS[Object.keys(data.AmazonURLS)[i]];
            
            
            // regex recipe:
            var findName = /(?<=www.amazon.com\/)\w*/

            let name = url.match(findName);
            let newHTML = "<tbody> " + "<tr><td><a href=" + url + " target='_blank'>" + String(name) + "</a></td>" + "<td>" + String(price) + "</td><td class='del'>X</td></tr></tbody>";
            let listing = document.getElementById('table').innerHTML += newHTML;

        }


        //add event listeners to delete listings!


        let listRows = document.getElementsByClassName('del');
        let entry = 0

        while (entry < listRows.length){
            // test if entry is numerical
            if (typeof(entry) == typeof(3)){
                arg = listRows[entry];
                listRows[entry].addEventListener('click', function(arg){

                    // get the url 
                    let tURL = arg.srcElement.parentNode.firstChild.lastChild.href;
                    // remove from storage with url name
                    
                    
                    chrome.storage.sync.get({"AmazonURLS": {}}, function(data){
                        

                        //console.log(Object.keys(data.AmazonURLS));

                        for (var key in Object.keys(data.AmazonURLS)){
                            if (tURL == Object.keys(data.AmazonURLS)[key]){
                                delete data.AmazonURLS[tURL];
                            }
                        }

                        let newData = data.AmazonURLS;
                        chrome.storage.sync.set({"AmazonURLS":newData});

                    });


                    // delete HTML
                    arg.srcElement.parentElement.innerHTML = '';
                });
            }
            entry += 1;
        }
        


    });

}

