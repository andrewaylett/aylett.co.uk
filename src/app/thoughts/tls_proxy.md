---
author: Andrew Aylett
date: 2023/04/23
title: TLS Termination Delegation in Browsers
description:
    A call for a mechanism for a browser to delegate TLS termination to a proxy,
    without resorting to MITM, making it possible for the browser to properly
    warn users when it’s active and support this feature in environments where
    it’s useful.
tags:
    - HTTPS
    - TLS
    - proxy
    - MITM
---

_Originally [posted](https://social.aylett.co.uk/notice/AUmwZvpCcKvQ2yrwPo) with
ActivityPub_

I’d like a mechanism for a browser to delegate TLS termination to a proxy. This
is the true analogue for Cloudflare, or Cloudfront, or Akamai, or Fastly: as a
service owner, I delegate TLS termination to my CDN, so the CDN can process the
traffic it receives. It’s not an interception, or a MITM, as far as the client
is concerned the CDN is the service.

Behind the CDN, we use TLS to the origin too, to make sure the right content
gets served securely.

As a browser operator, I want something similar. As it happens, Cloudflare
provides that service too, but not in the way I want it to, so more on that
later.

Browsers have a mechanism to use proxies for HTTP, and even to use HTTPS to
connect to proxies. But they (quite reasonably in many ways) decline to delegate
TLS termination to the proxy. If I ask for an HTTPS website, the browser will
ask the proxy for a tunnelled connection. I want the browser to properly warn
users when it’s active, but also properly support this in environments where
it’s useful. Probably a privacy-preserving pony, too, while I’m at it? I’m quite
sure it’s not even possible to implement in a way that satisfies everyone.

What happens instead is actual MITM that needs to try to hide from the browser.
This is classic middleware box, and also what Cloudflare offer in their “zero
trust” product – replace your OS certificate store with their root certificate
and they’ll intercept every request and make sure it’s legit. Which is fine if
that’s what you want but it’s too similar to black-hat MITM for my liking.

I’m the volunteer administrator of a small school network. Mostly I use custom
DNS for content moderation, which isn’t very precise and itself only works
because I can delegate secure DNS lookups – and if a client makes a plain text
DNS lookup via the router, it’ll be upgraded to DoH before being sent to the
service provider too :).

_Neil
[replies](https://social.aylett.co.uk/@neil@mastodon.neilzone.co.uk/posts/AUmxgcGNqShFMKKlwO)_

> Interesting.
>
> Does something like brow.sh do what you have in mind (even if not the UX you
> might want)?
>
> i.e. the https connection is between the client-on-the-server and the remote
> server, and there is a separate session between user terminal and the
> client-on-the-server, showing the content to the user?

_I [respond](https://social.aylett.co.uk/@andrew/posts/AUnrk0pmCFCYqklx2m)_

Interesting project :). Not quite, I think - that moves the rendering to the
server too.

It shares with my wish that it isn't compromising the secure connection, which
is really important for me - as an individual (and a member of society) I want
to know who I'm talking to and that no one is listening.

Where it differs is in composability. In my day job, I want to be able to
redirect requests for development without compromising the rest of my browsing.
In school, I want to expand the trust boundary of the user agent to encompass a
filtering proxy. At home, I want to be sure I'm talking directly to the origin.
So I want to use a regular browser, and plain HTTP proxies already support all
these use cases for plain HTTP.

Where it goes wrong is that a binary filter (IP, DNS, or TLS) doesn't give as
much signal or control to a malicious administrator as the ability to see which
content is actually loaded and to manipulate it. And even if it's entirely clear
to the user what's happening, the capability to force use of a proxy is bad.

We see from real-world reports that in practice, the alternative to a content
filter isn't an outright block, but less granular blocking. So unless we can
work out a way to avoid it being abused, I'm quite happy to retain privacy and
security against malicious administrators even if it makes things more
challenging for benign administrators.
