---
title: "The $10/Month Dev Machine"
description: "Why I run my development work on a $200 Galaxy Tab S7 and a $10/month VPS over RDP, instead of a $1000 laptop. A thin client, done right."
date: 2026-09-22
tags: [efficiency, philosophy, infrastructure, thin-client]
infographic:
    - "📟 $200 tablet + $10/mo VPS beats a $1000 laptop"
    - "🧠 Efficiency while maintaining effectiveness"
    - "🏠 Compute is rented, state is yours"
    - "🐇 My recurring red herring: the least machine that does the job"
    - "🤖 Perfect for the coding-agent era"
---

# The $10/Month Dev Machine

My development machine, right now, is:

- A **Samsung Galaxy Tab S7**. Used, about $200.
- A **cantilever keyboard case**: the keyboard rests on my lap, a rigid magnetic arm holds the screen floating above it.
- A **$10/month VPS** somewhere in a datacenter, running the actual operating system.
- One app on the tablet: Microsoft's **"Windows App"** for Android. It is just an RDP client.

That's it. The editor, the terminal, the browser, my files, my database — all of it lives on the server. The tablet is a screen with a keyboard attached. I sit back, pull the tablet onto my lap, and I am inside my machine.

One hardware note, because it is the unsung hero of the whole setup: what I bought is a **cantilever keyboard case** — a rigid keyboard-and-cover assembly where the screen floats on an arm above the keys, and the whole thing lands on my lap like an open laptop. The screen attaches magnetically. Only a limited set of tablets can do this — the **Samsung Galaxy Tab S series, the Xiaomi Pad 7/8, the iPad** — and the reason matters when you shop. Search for **"Magic Keyboard"**-style cases, the ones where the keyboard and the folio form one rigid structure. Do not buy a regular folding keyboard case. The moment you lift it by the keyboard, the whole thing goes floppy: there is no structural support behind the tablet. A magnetic Magic Keyboard case is rigid. You can carry the entire "laptop" by the keyboard, and it holds.

If you read my other posts, you already know where this is going.

## The red herring I keep dragging in

There is one theme that shows up in almost everything I write. I call it my common red herring:

> **Efficiency while maintaining effectiveness.**

Cheap is worthless if it stops you working. A $10 tool you cannot do real work with is not $10 saved, it is $10 wasted. So the constraint is the second half: effectiveness has to stay.

This setup is that philosophy applied to the most expensive productivity decision most developers make: what machine do I code on.

## Why a laptop fails anyway

The reflex answer is: buy a good laptop. About $1000 for something that will not embarrass you.

Let me be honest about what that $1000 actually buys. Most of it is **short-term appeal**:

- A 120Hz screen that makes scrolling feel expensive.
- Direct human-to-machine contact. Everything computed under your thumb, zero perceived latency.
- The pride of "I own the machine." It is *yours*, in a way a rented server is not.

None of that is fake. It feels good, and feeling good is part of work. But look at what happens over time:

1. **It fails on price anyway.** $1000 up front versus roughly $120 a year for the VPS. The laptop's money argument does not even survive basic arithmetic, let alone a dead mainboard in year three — out of warranty, obviously.
2. **Right-to-repair is shrinking.** More laptops come from a handful of ODMs, with soldered RAM, soldered storage, glued batteries, and parts pairing. When one board dies, the machine dies. Fewer and fewer vendors will sell you the part to fix it yourself, and in some jurisdictions it is now legally complicated for them.
3. **The failure mode is total.** Crash, theft, water, Hinge of Death — and your development environment, your configs, your half-finished branches are inside a box that stopped working. Recovery is a weekend, if the data survives.

The thin-client model flips all of this. The rented compute is the disposable part. If the VPS host eats it, I rebuild from a script and reconnect from any other screen in the building. If the tablet dies, the next $200 one logs in and nothing was lost — because nothing lived on it.

That is the definition of not sacrificing long-term benefit for short-term benefit. The laptop feels better today and is structurally more fragile for years. I take the opposite trade.

## What runs on the server

Nothing exotic. A modest entry-tier VPS — shared vCPU, a few gigabytes of RAM, no GPU, because a GPU you cannot see does not matter when the pixels are being encoded into a video stream anyway.

- **Ubuntu Server 24.04**
- **KDE Plasma 5 on X11** as the desktop
- **xrdp 0.10.6.1 and xorgxrdp 0.10.5**, built from source, so the session uses the GFX pipeline. The Android client negotiates RFX Progressive — it has no H.264 decode anyway

I connect from the tablet over a **VPN tunnel**. RDP never touches the open internet; port 3389 is not your friend.

## Proof it is not a toy: the tuning

I will not pretend the default setup is nice. Out of the box, RDP over WAN to a GPU-less server is laggy and muddy. The fix is a series of unglamorous adjustments, and each one is measurable. All of it is scripted now: one file per concern, each idempotent, each backing up every file it touches, and `xrdp-notes` explaining what every change does and how to roll it back.

- **Make it ugly (`xrdp-ugly.sh`).** Without a GPU, the compositor renders in software, burns CPU, and sends extra redraws down the wire. So: Breeze Dark flat theme, solid black wallpaper, no window borders or shadows, no animations, no notification popups, no ticking seconds on the clock. Fonts stay antialiased, with full hinting and subpixel RGB — I tried turning antialiasing off for the compression win, and it was unreadably rough. This pass alone transformed the session.
- **Build the right xrdp (`xrdp-setup.sh`).** The distro's 0.9.x has no GFX pipeline; 0.10.x built from source does. GFX requires 32-bit color, so depth stays at 32 bpp — going lower silently falls back to the older, slower path. The same script installs Plasma, sets 4 MB TCP buffers, caps the H.264 bitrate, and kills KDE compositing and animations.
- **Make it snappy (`xrdp-snappy.sh`).** Big buffers buy throughput; latency wants the opposite instinct: `tcp_notsent_lowat` small so stale frames do not queue behind a 4 MB buffer, `tcp_slow_start_after_idle=0` so the first redraw after a pause is fast, and **BBR** congestion control, which behaves much better on lossy links. Then the frame interval halves, from 32 ms to 16 ms, raising the frame-rate cap from about 30 to about 60.
- **Make it lean (`xrdp-lean.sh`).** Strip the session to what matters: virtual channels down to clipboard plus the dynamic channel, xrdp at nice -10, Xorg at -5, the desktop at 0 so the encoding pipeline always outranks everything else, `fq` as the queueing discipline, AES-128-GCM negotiated first, DPMS off. The experimental shelf lives here too: an 8 ms frame interval and a deliberately small send buffer.
- **Screenshots that reach the tablet (`xrdp-flameshot.sh`).** Flameshot, bound to Ctrl+Alt+Shift+P: drag a region, press Enter, and the image is on the client's clipboard — or paste it straight into an AI chat inside the session.

The client side matters just as much, and none of it is scriptable:

- **A deliberately small resolution: 1280x800 at 100% scale.** Fewer pixels to encode per frame. On a cantilever arm at lap height, 1280x800 is plenty; dropping to 1024x640 is the single biggest latency lever, about a third fewer pixels, if you dare.
- **Mouse pointer mode, not touch mode.** The keyboard's touchpad then drives a real pointer with exact clicks and hover; screen taps still work.
- **Redirection:** sound, storage, camera, microphone off. Clipboard on. Fewer moving pixels in the apps too: smooth scrolling off, cursor blink off, minimap off, file indexer disabled with `balooctl disable`.

Every part of this is published, use it freely:

> **Repo:** [github.com/vmasdani/xrdp-tune](https://github.com/vmasdani/xrdp-tune) — `sudo ./install.sh` on a fresh Ubuntu 24.04 server and all five scripts run in order.

The result is not "usable, I guess." It is my daily machine.

## About providers

A short list of hosts where an entry plan sits in the single-digit-to-$10 range: **Contabo, OVH, Hetzner, Scaleway**.

**Disclaimer: this is not an endorsement of any of them.** I am listing them because they come up constantly, at the price point, in Europe. Their terms, performance, regions, and restrictions vary a lot, and they change. Do your own research before handing anyone a card. The point of the article is the pattern, not the vendor.

## Why this is even more correct now

Here is the timing argument.

The traditional shape of development was: you, inside an IDE, typing every line, needing instant feedback on every keystroke. That shape genuinely rewards a fast local machine and hates latency.

That shape is fading. More of my day is now spent **directing coding agents that run in cloud environments**. I review diffs, steer, approve. The work happens server-side whether the thin client exists or not — the agent is already on remote compute. My job is supervision, and supervision over RDP is fine.

If the machine doing the heavy lifting is in a datacenter, the honest question for your local device is only: does it give me a good enough interface to the work? A $200 tablet answers yes. So yes, I am consciously deprioritizing the flashy local interface, and I think that is the correct prioritization, not a compromise to apologize for.

## The cons, honestly

- **Lag.** There is network latency between your keystroke and the screen, always, and RDP adds encoding time. I will not pretend otherwise. What I will tell you is that after a few days, you stop perceiving it. The brain is absurdly good at absorbing a fixed delay. The first afternoon feels like typing underwater; the following week feels normal; going back to a local machine feels weirdly *too* instant for an hour, then you stop noticing that too.
- **You need the internet.** True, and it is the hard dependency of the whole model. But look at where work actually lives: almost all white-collar work is already in the cloud — email, docs, chat, ticketing, payments, CI. Even accounting, administration, and law practices have moved their real systems onto hosted platforms. No connection means no work, with or without a laptop; the laptop's offline capability is mostly vestigial. Trade jobs are the genuine exception, and this model is simply not aimed at them.
- **No direct hardware access.** You cannot flash a microcontroller, mount weird USB peripherals, or debug serial protocols through a thin client. Fine — keep one cheap, boring **x86 box** nearby for exactly this. x86 has the widest hardware support in existence, drivers for things that died twice, and secondhand prices are a joke. The physical-world jobs go there; the thinking jobs go to the VPS.

## The takeaway

A developer needs three things from "a machine": an interface, a compute environment, and their own state. This setup decouples them.

The interface is rented cheap and replaced without grief. The compute is rented monthly and rebuilt from a script without grief. Only the state — configs, repos, notes like this one — is actually mine, and it is where it should be: synced, backed up, hardware-independent.

Efficiency, while maintaining effectiveness. The red herring leads somewhere good this time.
