// Add scrolling revealing stuff


//test that the code runs
console.log("Running script...");

ScrollReveal().reveal(document.querySelectorAll('*', {
	distance: "50px",
	duration: 700,
	easing: 'ease-in',
	origin: 'right',
	reset:true
}));