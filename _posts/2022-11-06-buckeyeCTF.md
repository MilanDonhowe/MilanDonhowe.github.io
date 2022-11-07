---
layout: writeup
title: Buckeye CTF (Web Challenges)
date: 2022-02-06
---

# Buckeye 2022 CTF
This weekend I partook in the CTF hosted by the other OSU (Ohio State University) and solve some of their easier "beginner" challenges.

Here are some write-ups for the web challenges I solved.  These are all somewhat basic challenges but I felt they would be good to showcase since it establishes a good introduction to basic web vulns in web applications.

## Web Challenges

### Buckeyenotes
We're provided a standard login form with a given username whose account we want to access: "brutusB3stNut9999".
![input form with sql injection](/assets/writeup_imgs/buckeyenotes1.png)

The password field is vulnerable to SQL injection but removes `=` signs as a type of attempted input sanitization.

A payload of `' or 1 --` works to bypass the login authentication--but we login as user "rene" and not brutus!  This is because our query will return all the accounts in the table (since 1 will evaluato a boolean "true" for all table entries--and it probably just greedily selects the first row it returns.

There's about a million ways to get the solution here but I figured there were probably only two accounts in the MySQL table so I just ordered the result entries by the username parameter in ascending order (since ascii 'b' is lower numeric value than 'r').
![pwned input form revealing flag](/assets/writeup_imgs/buckeyesnotes2.png)

The payload of `' or 1 order by username asc --` in the password field yields the flag: `buckeye{wr1t3_ur_0wn_0p3n_2_pwn}`

### Scanbook
![scanbook website which contains a plaintext input form and file upload feature for QR codes](/assets/writeup_imgs/scanbook1.png)

In this challenge we're provided a simple web-app which lets us submit plaintext entries which it then provides us a QR code which we can upload to the website to access our prior entry.

![numeric id from parsed QR code in cyberchef](/assets/writeup_imgs/scanbook2.png)

If we parse a QR code for a given post we see it's just a signed 64 bit integer (I'll explain how I know that in a second) and so we can generate a QR code with any plaintext number, and it will provide us with the note for that id.

If I upload a QR code with a numeric value of 9223372036854775807 (the max signed int value), the app will say my post was lost (since there's no post with that id) but if I upload a QR code which encodes an integer 922372036854775808--the app gives me a 500 internal server error, which suggests the data-type it expects is a signed 64 bit integer.

Since we can arbitrarily access any note this is an IDOR vulnerability (insecure direct object reference).  If we access the note associated with id=0, we find our flag: `buckeye{buckeye{4n_1d_numb3r_15_N07_4_p455w0rd}}`

### Pong

Basically just web socket abuse--send a bunch of commands saying that you won the game through the socket and the server will respond with your flag.
In the console just type: `for (let i=0; i<10; i++) socket.emit('score', 9999999999999);` to recieve the flag: `buckeye{1f_3v3ry0n3_ch3475_175_f41r}`

### Textual

LaTeX parser which has LFI vulnerability via `\usepackage{flag.tex}` to get flag: `buckeye{w41t_3v3n_l4t3x_15_un54f3}`.












