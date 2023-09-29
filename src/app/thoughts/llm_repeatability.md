---
uuid: d819c400-360e-47a6-9b9e-24a433dee072
title: Is an LLM inherently deterministic?
description:
    Exploring the determinism of large language models like GPT, and the
    possibility of designing them to be deterministic.
tags:
    - LLM
    - determinism
    - randomness
    - GPT
author: 'Andrew Aylett'
date: '2023/04/05'
---

_Whether an LLM is inherently deterministic_

https://social.aylett.co.uk/@andrew/posts/AUHfaZt7Go8OO5rrdI

The model is immutable at the point of use, so (use of a RNG or timing data
notwithstanding) the output should be entirely deterministic? Not letting the
caller pick a random seed seems to me to be a design choice.

Controlling all sources of entropy is hard if no-one has deliberately decided to
try to make a process repeatable, but that doesn’t make the LLM
non-deterministic.

(Back when I worked on a compiler, we carefully didn’t depend on any randomness
– and on a single thread, the same input with the same compiler build should
always give the same output. But change anything and all bets were off)

_In response to the idea that GPT may be non-deterministic in design_

https://social.aylett.co.uk/@andrew/posts/AUHvZBcQHtC6t3DMcC

I can easily believe it. That's where the design decision kicks in -- if they
are happy allowing non-reproducible results, they don't need to spend the effort
to make sure they don't introduce hard-to-remedy uncontrolled randomness.

Any source of true randomness may be replaced with pseudo-randomness, and any
parallelism can be linearised. I'd be quite surprised if this weren't already in
place for testing, although I may well be overestimating the utility of
deterministic tests for LLMs or underestimating just how much of a performance
regression I'm proposing.

I'm not saying it would necessarily be easy, cheap, or even worthwhile to expose
a deterministic API -- but it would be possible. And I'd quite like one, even at
a significantly higher per-call cost, if only because it makes it easier to
argue that a large language model is not an AI.
