// Add scrolling revealing stuff


//test that the code runs
console.log("Running script...");

// the elements I want
window.onload =  function(){

let STUFF = document.querySelectorAll('h1:not(.project-name), h2:not(.project-name), h3, p, img');



ScrollReveal().reveal(STUFF, {
	distance: "50px",
	duration: 600,
	easing: 'ease-in',
	origin: 'right',
	reset: true,
});

}
