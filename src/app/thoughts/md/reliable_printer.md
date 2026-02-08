---
date: 2023/05/13
author: Andrew Aylett
title: Setting up and using the MFC-L3550CDW printer over a network
description: >
    The Brother MFC-L3550CDW just works over Ethernet via IPP and mDNS -- no
    driver installation needed. Network printing has quietly gone from dark
    magic to plug-and-play, and works better on Linux than Mac or Windows.
tags:
    - Technology
---

When I got my recently-acquired MFC-L3550CDW home, I went to set it up over the
network and it just worked. Trying to install the drivers stopped it working :P.

I've not tried printing to it over USB, but over Ethernet it supports IPP and
mDNS so all you need to do to print is connect the printer to the network and
CUPS will find it automatically.

At some point in the last ten years, network printing has gone from dark magic
to just working, and in my experience working better on Linux than Mac or
Windows. Printing from Android took a smidge of manual set up but now also just
works when called upon. It's almost disappointing, until I remember that while I
quite enjoy tinkering I also bought the printer to actually print stuff.

The scanner? Also just works over the network. Mind blown.
