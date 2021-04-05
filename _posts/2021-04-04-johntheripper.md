---
layout: writeup
title: John Ripping Through The Passwords (Misc Challenge)
date: 2021-02-05
---
# Problem

For this challenge we start off with nothing more than a tar file named “CTG-2020-10-0001.tar.gz” containing a pdf, a text file containing a long list of words, and a file-system in the form of an .iso file.  The pdf file contains some neat lore but the real interesting stuff is in the .iso file which we can mount with a few commands easily attainable through a [quick google search](https://www.cyberciti.biz/tips/how-to-mount-iso-image-under-linux.html).

Inside the file-system we find a mysterious file called `rhodgson.kdbx` which we can quickly identify through `file rhodgson.kdbx` which returns:
 `rhodgson.kdbx: Keepass password database 2.x KDBX`

This is a database file for keepass, a popular password manager.  We can actually open the database file directly using `kpcli`, but without the user password we’re left to dry.  We *could* try a brute forcing program but without a specific topical list of potential passwords, it wouldn’t be particularly efficient.

## Using JOHN

Luckily, we DO have a list of potential passwords through the word list file mentioned earlier and packaged in the tar file.  Using (John-the-Ripper)[https://github.com/openwall/john], a popular open-source password cracking utility which if still from source allows us to quickly crack the database’s password.

First we run a utility script included with john to convert the .kdbx into a format john likes via `/src/john/run/keepass2john rhodgson.kdbx > johnableRhodgson`  After that we can quickly supply the word-list to John and let the program do the heavy lifting via: `~/src/john/run/john --wordlist="./CTG-2020-10-0001/CTG_STANDARD_WORDLIST.txt" johnableRhodgson`.

Afterwards we can run john directly on the database file to tell us the passwords:
`~/src/john/run/john --show johnableRhodgson` which then informs us of the user’s passwords.

Now that we’ve cracked the password hashes we can directly view the applicable passwords for the keepass database: `~/src/john/run/john --show johnableRhodgson`

And Hazahh, we find Ryan Hodgson’s keepass username & password combo of `rhodgson:1hodgson`.  Honestly, probably could have just guessed it.

## KPCLI

Now when we open the database file using `kpcli` and we can open the db via `open rhodgson.kdbx` which allows us to quickly run through the database file and stumble upon their flag box password (accessed via `show 0 -f`) which gives us an IP address of some linux box along with their username and password for the system.

## SSHing into Linux Box & Privilege Escalation

Upon accessing the linux box via the IP and credentials found in the `.kdbx` we can quickly spot the flag file named `.flag`--however we’re unable to access the file with our current user privileges.  A quick trick to try and get around file permissions is through abusing a SUID permission (e.g. a sticky-bit on a binary which allows any user to run the program with a set of permissions).  We can quickly query the file system to see if there’s any potential program which has the sticky-bit set that could allow us to read the file via `find / -perm -4000 2>/dev/null` or `find / -perm -u=s 2>/dev/null`.

Sure enough, we can spot that vim has the sticky bit set!  And upon trying to load the file with vim, we retrieve the flag text.

## Lessons Learned:

This challenge introduced me to a really scary but powerful tool in John-the-Ripper along with the conceptual privilege escalation seen in the sticky-bit exploit at the end.  Some big take-aways from this challenge are the efficiency of john-the-ripper and the genre of privilege exploits on Linux systems.

