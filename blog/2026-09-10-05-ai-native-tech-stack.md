---
title: "An AI-Native Tech Stack"
description: "A simpler way of thinking about modern software development: strong specifications, efficient models, and boring technology."
date: 2026-09-09
tags: [ai, programming, tanstack, architecture, spec-driven-development]
infographic:
    - "📐 Spec first, code second"
    - "🧠 MoE: intelligence per watt"
    - "🚧 Guard the boundaries"
    - "🤖 AI implements, tests verify"
    - "🥱 Boring is often the most efficient"
---

# An AI-Native Tech Stack

I think software development is entering a new paradigm.

It isn't simply **"AI writes code."**

The interesting combination is:

**spec-driven development + efficient LLMs.**

Instead of asking an AI to figure out the architecture every time, I define the rules once. The AI then implements within those boundaries, while the compiler and tests provide feedback.

At the same time, increasingly efficient **Mixture-of-Experts (MoE)** models can provide a lot of capability without activating their entire parameter count on every token.

More useful intelligence, less wasted compute.

That combination is very interesting to me.

## Spec first, code second

LLMs are extremely good at producing plausible code.

The problem is that there are usually many plausible ways to build something.

So I prefer to make the important decisions beforehand:

- What framework do we use?
- Where does state belong?
- How does authentication work?
- Where does database access happen?
- Which libraries are allowed?
- What must never be done?
- How do we verify the result?

Then the AI doesn't have to invent the system.

**It implements the system.**

This is why I think a good specification is becoming almost as important as the code itself.

I keep my current TanStack project specification here:

[My TanStack project specification on GitHub Gist](https://gist.github.com/vmasdani/5c09a8367295d1119fbce51e2db3e4ed)

## My stack

My preferred TypeScript stack is fairly simple:

- **TanStack Start / Router**
- **TypeScript + Vite**
- **shadcn/ui + Tailwind**
- **Drizzle + PostgreSQL**
- **Zustand** for client state

The important part isn't the individual libraries.

It's the boundaries between them.

Server data stays on the server. Client state has a clear owner. The database has one authoritative schema. Routing is typed. The project has explicit rules.

I don't want twenty abstractions doing the same job.

## Why efficient MoE models matter

I care more about **useful output per unit of compute** than raw parameter count.

An MoE model can have a large total number of parameters while activating only a smaller subset for each token.

That makes the model potentially much cheaper and faster to run.

This fits my general technology philosophy:

> **Get more capability while using fewer resources.**

It is the same reason I like efficient laptops, simple vehicles, and software with fewer moving parts.

## My other favorites

TanStack isn't the only stack I like.

**Go** is extremely robust. It is fast, predictable, and excellent for standalone services and infrastructure. My only hesitation is that it feels more loosely coupled from the rest of the application stack I prefer.

**Laravel** is the master of cost-to-value.

It is more verbose than my preferred TanStack setup, but it gives one developer an enormous amount out of the box. If the priority is simply:

> **"How much useful software can I build for the least effort and money?"**

I'd pick Laravel without hesitation.

Sometimes boring is the most efficient technology.

## The new workflow

The workflow I am interested in looks like this:

**Human defines the system → AI implements it → compiler/tests verify it → AI fixes it → human reviews the important decisions.**

The AI is not replacing the engineer.

It is becoming a much better implementation machine.

And the better the specification and the more efficient the model, the more leverage one developer gets.

That's the part I find exciting.

> **Don't ask AI to replace the engineer. Give the engineer a better machine.**
