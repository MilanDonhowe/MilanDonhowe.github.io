// Add scrolling revealing stuff


//test that the code runs
console.log("Running script...");

// the elements I want
let Elems = document.querySelectorAll('h1:not(.project-name), h3, p, img');



ScrollReveal().reveal(Elems, {
	distance: "50px",
	duration: 600,
	easing: 'ease-in',
	origin: 'right',
	reset: true,
});