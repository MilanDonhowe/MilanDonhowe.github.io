// Add scrolling revealing stuff


//test that the code runs
console.log("Running script...");

// the elements I want
let headerOne = document.querySelectorAll('h1:not(.project-name)');
let headerThree = document.querySelectorAll('h3');
let imageTag = document.querySelectorAll('img');
let pTag = document.querySelectorAll('p');

let Elems = headerOne.concat(headerThree, imageTag, pTag);


ScrollReveal().reveal(Elems, {
	distance: "50px",
	duration: 600,
	easing: 'ease-in',
	origin: 'right',
	reset: true,
});