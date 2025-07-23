---
title: Jujutsu makes things easier
description: The easy things are easy, and the hard things are also easy.
tags:
    - Software Development
date: 2025/07/22
---

I've recently started using [Jujutsu](https://jj-vcs.github.io/) and I'm really liking it.
Sufficiently so that I'm evangelising it on social media.

In response to [a comment on HN](https://news.ycombinator.com/item?id=44646354):

Jujutsu might look like it's for people who want to perfect their commits and juggle a lot in their minds -- but in my case (and anecdotally in others' too) it's because it lets us easily do things which would require that mindset/ability with plain Git.

In Git, I need to keep in mind all the different things I'm working on and which branch goes where, or I wind up with a monster PR with a chain of commits that mix everything up enough that it's even more effort to pull the PR apart to be reviewable. Ask my colleagues how I know that :P.

With jj, I don't feel that I'm putting more effort into organising my changes -- quite the opposite -- not least because there's very little book-keeping involved in parking something that's in progress or coming back to it later. And when I come to ask for a review, I've got separate changes I can push as smaller PRs, and I can easily pull the right sets of changes out to make each one reviewable.

I think the biggest improvement is that if I just need to look at something else for a couple of minutes then come back, I can `jj new main` to switch and not bring my changes with me then I can `jj edit <oldref>` to get my working copy back into the state it was in before, with all my old changes.

I'm pretty sure none of my colleagues have started using it (although they're free to) but I can confidently say (because I've asked) that they've noticed the difference in my work and prefer the more focused changes.
