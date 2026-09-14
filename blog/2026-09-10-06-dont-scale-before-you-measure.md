---
title: "Don't Scale Before You Measure"
description: "Why database bottlenecks are often mistaken for infrastructure problems, and why serverless and Kubernetes can sometimes be unnecessary complexity."
date: 2026-09-09
tags: [performance, database, architecture, efficiency, systems-thinking]
infographic:
    - "📏 Measure before you scale"
    - "🐘 Check the database first"
    - "🚫 Kubernetes never fixes a missing index"
    - "🎯 Scale the bottleneck"
    - "🗣️ Make the AI argue against you"
---

# Don't Scale Before You Measure

I think we sometimes get caught up in **marketing a little too much**.

Serverless functions. AWS Lambda. Firebase Functions. Kubernetes. Microservices. Distributed systems.

They are all useful technologies.

But sometimes you just have a normal application with a database.

And the database is slow.

## For most apps, check the database first

My assumption here is that the application is **I/O-heavy**, which describes most ordinary web applications, APIs, CRUD systems, and business software.

If the application is CPU-heavy, this philosophy may not apply.

But for an ordinary application, before adding more servers or introducing a more complicated architecture, I would ask:

> **What is the database doing?**

Very often, the bottleneck is simply:

- An unoptimized database configuration
- An unoptimized query
- Missing indexes
- N+1 queries
- Too many database round trips
- Excessive data being retrieved
- Bad joins
- Connection-pool problems
- Lock contention
- Unnecessary writes

## I learned this in 2019

Back in 2019, I worked on a manufacturing project.

The project manager and CEO insisted on Spring Boot.

The idea was to build a centralized work-order system so manufacturing manpower could be tracked: who was working, what they were working on, and how work was progressing.

The relationship looked roughly like:

```text
Work Order
    └── Tasks
          └── Target Dates
```

Target dates also had history because we wanted to know how many times a task had been delayed.

It became a mess.

One of the first problems was N+1.

Imagine:

```text
100 work orders
× 10 tasks
× 5 target dates
```

A naive traversal could generate an absurd number of queries.

We eventually mitigated parts of it with subselects and batch fetching.

Then I needed date-range queries.

To determine the useful date range, I had to traverse from the work order to its tasks and then to target dates.

The solution eventually became a replication of the data into MongoDB, where each work order had:

```text
taskStart = earliest task start
taskEnd   = furthest target date
```

It worked.

But after running it for a while, I realized:

**I didn't need MongoDB.**

I could simply have added `taskStart` and `taskEnd` to the work-order table and indexed them.

The root problem wasn't that the database was incapable.

It was that **the query and data representation were not optimized**.

Never underestimate a bad query.

## Don't let architecture become a fashion contest

There is a tendency in technology to treat the newest architecture as the default architecture.

Need to run some backend code?

> Use serverless.

Need to deploy multiple containers?

> Use Kubernetes.

Need to scale?

> Use microservices.

Need high availability?

> Build a distributed system.

Sometimes those are exactly the right answers.

Sometimes they're like putting a jet engine on a bicycle.

A single Go instance with MySQL or PostgreSQL can handle a surprising amount of work.

Laravel can also achieve high throughput when configured correctly.

If the application is spending most of its time waiting for the database, changing from one application server to ten application servers doesn't magically make the query faster.

## Serverless is not free

Serverless is great when the problem actually looks like a serverless problem.

But it introduces its own complexity:

- Invocation and platform limits
- Cold starts
- Stateless execution
- More complicated local development
- Distributed logging
- More networking boundaries
- Platform-specific behavior
- Potentially complicated database connections

AWS Lambda and Firebase Functions are excellent tools.

But "excellent tool" doesn't mean "default architecture."

If I have a small application that can comfortably run as one process on one server, putting every endpoint into a function platform may be solving a problem I don't have.

## Kubernetes is the same story

Kubernetes is an incredible piece of engineering.

But it solves a particular class of problems.

If I have one application, one database, and one developer, Kubernetes may provide more operational complexity than operational value.

Now I have:

- Containers
- Deployments
- Services
- Ingress
- ConfigMaps
- Secrets
- Health checks
- Resource limits
- Cluster upgrades
- Observability
- Networking

None of these are inherently bad.

They become bad when they exist **without a problem to justify them**.

Complexity has a maintenance cost.

## We have LLMs now

There is one big difference between today and 2019.

We have LLMs.

We can describe the workload, architecture, traffic, queries, hardware, and constraints to an AI and ask:

> "Is this architecture actually justified?"

That is incredibly useful.

An LLM can help us compare one server vs. multiple servers, PostgreSQL vs. another database, monolith vs. microservices, traditional server vs. serverless, and simple deployment vs. Kubernetes.

It can also point out bottlenecks we might have missed.

But there is an important warning.

## Be careful: LLMs are often too agreeable

Mainstream LLMs such as ChatGPT are, by default, designed to be helpful and agreeable.

Ask:

> "I have a small application. Should I use Kubernetes?"

and you may get a very reasonable explanation of why Kubernetes *could* work.

Ask:

> "Should I use microservices?"

and you may get a beautifully structured microservices architecture.

The answer can sound extremely convincing.

That doesn't mean you need it.

So don't only ask an LLM:

> "How do I build this architecture?"

Ask it:

> **"Is this architecture overkill for my actual workload? Argue against my proposal."**

Give it the constraints.

Tell it the traffic, database size, CPU and RAM, number of developers, and acceptable downtime.

Then explicitly ask it to find reasons **not** to use your proposed architecture.

Make the AI challenge you instead of simply validating you.

## Measure first

Before reaching for a bigger architecture, measure.

Look at:

- Query execution plans
- Slow queries
- Database CPU
- Database I/O
- Connection counts
- Application CPU
- Application memory
- Network latency
- Request latency
- Error rates

Then fix the actual bottleneck.

If the database takes 800 ms and your application code takes 20 ms, rewriting the application in a faster language isn't going to produce a miracle.

If an endpoint makes 500 database queries, adding another application server isn't the first thing I'd do.

If the query is missing an index, Kubernetes certainly isn't the solution.

## Scale the bottleneck

My general rule is:

> **Don't scale the application. Scale the bottleneck.**

And before scaling the bottleneck, make sure it is actually the bottleneck.

For an I/O-heavy application, a simple architecture can go surprisingly far:

```text
Internet
    ↓
Nginx
    ↓
Go / Laravel
    ↓
MySQL / PostgreSQL
```

One machine.

One application.

One database.

No Kubernetes.

No serverless functions.

No microservice zoo.

If that is enough for the workload, **that is the efficient architecture**.

When the workload eventually changes, add complexity because reality demands it.

Not because a conference talk did.

> **Complexity should be earned by the problem.**
