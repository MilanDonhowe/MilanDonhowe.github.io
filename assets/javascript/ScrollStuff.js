// Add scrolling revealing stuff

// make an array of all my elements on the page.
let myProjects = [
	document.querySelectorAll('h1'),
	document.querySelectorAll('p'),
	document.querySelectorAll('h3'),
	document.querySelectorAll('img')
]


ScrollReveal().reveal(myProjects);