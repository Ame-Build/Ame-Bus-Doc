---
title: Before You Start
---

Do you have Rust experience? If not, you should learn Rust first.

It's not a simple framework if you don't understand the concepts.

It's too new to code with AI, which means if you are a vibe coder or beginner who depend on AI, you have to understand the concepts first.

To check if you are ready, the concepts you must know are:

rust fundamentals:

- async rust: `Future` and `tokio`.
- ownership and life circle: how to use less `.clone()` and `Arc`.
- pointers: the difference between `&[T]`, `Box<[T]>`, `Vec<T>`, `Arc<[T]>`.
- memory optimization(optional), especially how to decrease the heap allocation.

architecture:

- RPC: what is RPC and how to use it.
- distributed system: how to solve the data consistency problem and race condition problem.
- event driven: how to design an event driven system.
- inter-process communication: when should you use shared memory and when should you use channel.
- single responsibility principle: what is a single responsibility principle. when you should use it.

functional programming:

- closure: what is a closure. why [Processor](/core_concepts/processor) is like an async closure.
- pipeline: what is a pipeline. how to reuse functions with pipeline.
- `map`, `filter`, `fold`: how to understand these functions.
- partial application: what is partial application. how to use it.
- monads(optional)

You probably don't know what is NATS. But it's not a problem. You can learn it easily.