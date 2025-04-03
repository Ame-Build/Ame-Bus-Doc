---
title: Processor
---

## What is a Processor?

A Processor is one of the fundamental building blocks in Ame Bus. In essence, a Processor is a durable async operation handler - think of it as a persistent async function with dependencies bundled in.

While Rust's async closures are still unstable, a Processor achieves similar functionality through a trait-based approach. It encapsulates both state (dependencies) and behavior (the processing logic) in a single abstraction.

## Why Use Processors?

Processors provide several benefits in a functional microservice architecture:

1. **Separation of concerns** - Each processor has a single responsibility
2. **Dependency injection** - Dependencies are explicitly included in the processor implementation
3. **Testability** - Easy to test in isolation
4. **Composability** - Processors can be composed and chained together
5. **Type safety** - Input and output types are clearly defined

## Core Processor Trait

The fundamental trait that defines a Processor is:

```rust
pub trait Processor<I, O>: Sized {
    fn process(&self, input: I) -> impl Future<Output = O> + Send + '_;
}
```

Where:
- `I` - The input type the processor accepts
- `O` - The output type the processor produces
- The return type is an implementor of `Future` that is `Send` (can be sent between threads)

:::note
We don't use `async_trait` macro for performance reasons. `async_trait` uses dynamic dispatch which adds type erasure overhead and prevents certain compiler optimizations.
:::

## `FinalProcessor<I,O>` Variant

To address certain lifetime issues that can arise with the standard `Processor`, we also provide a `FinalProcessor`:

```rust
pub trait FinalProcessor<I, O>: Sized {
    fn process(state: Arc<Self>, input: I) -> impl Future<Output = O> + Send;
}
```

The key difference is that `FinalProcessor` takes an `Arc<Self>` instead of `&self`, ensuring the processor outlives the future it returns. This is particularly useful in cases where the future needs to live independently of the original context.

## Implementation Guide

Processors are central to Ame Bus's components:

- **NATS Services** require a `FinalProcessor<async_nats::Message, Result<bytes::Bytes, ame_bus::error::Error>>`
- **JetStream Consumers** require a `Processor<async_nats::Message, Result<(), ame_bus::error::Error>>`

For best practice, processors should:

- Almost stateless. The only state (like database connection, NATS connection) should be same for all instances, making it impossible to distinguish between instances from the outside.
- Avoid clone or atomic operation when called. `FinalProcessor<I,O>` is excluded, but you should only one `FinalProcessor<I,O>` for each progress.
- Make dependencies explicit. All external dependencies should be fields of your processor.

### Basic Implementation

Here's how to implement a simple processor:

```rust
// single responsibility. this processor is only used to create ticket
struct TicketCreateProcessor {
    // Dependencies go here
    db_client: &'static DatabaseConnection, // Avoid clone or `Arc` by using `OnceCell<T>` and `&'static T`
    jetstream_context: &'static async_nats::jetstream::Context,
}

impl Processor<
    TicketCreateRequest, anyhow::Result<NewTicketResponse>  // use `anyhow::Result` to make error handling simpler
> for TicketCreateProcessor {
    async fn process(&self, input: TicketCreateRequest) -> anyhow::Result<NewTicketResponse> {
        // insert the ticket into database
        let new_ticket = entities::ticket::Entity {
            ticket_subject: Set(input.subject),
            ticket_content: Set(input.content),
            ticket_priority: Set(input.priority),
            ..Default::default()
        }.insert(self.db_client).await?;

        // trigger event
        // for example, by listening the event, customer service can be notified
        let ticket_created_event = TicketCreatedEvent {
            ticket_id: new_ticket.id,
            user_id: new_ticket.user_id,
            ticket_subject: new_ticket.ticket_subject.clone(),
            ticket_priority: new_ticket.ticket_priority,
        };
        self.jetstream_context.publish(
            ticket_created_event.subject(),
            ticket_created_event.to_bytes().into()
        ).await?;

        // let the user can be redirected to the ticket page
        let response = NewTicketResponse {
            ticket_id: new_ticket.id,
        };
        Ok(response)
    }
}
```

:::note
We use `impl Future<Output = O> + Send + '_` for the return type because `async fn` will desugar to `impl Future<Output = O>` which is not `Send`, and you cannot add extra bound (like `Send`) to it. [More information](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits.html)

The async block usually is `Send`, and the usage of that async function usually needs `Send`, we have to use `impl Future<Output = O> + Send + '_`.

But you don't need to use `impl Future<Output = O> + Send + '_` in your code, since `async fn` will desugar to `impl Future<Output = O> + Send + '_` for you.
:::

### Using FinalProcessor

`FinalProcessor<I,O>` is not recommended for most use cases.

Here's an example of implement `FinalNatsProcessor` which requires `FinalProcessor<Message, Result<Bytes, ame_bus::error::Error>>`:

```rust
/// nest processors inside FinalProcessor
struct TicketService {
    ticket_create_processor: TicketCreateProcessor,
    ticket_reply_processor: TicketReplyProcessor,
    ticket_delete_processor: TicketDeleteProcessor,
}

enum Route {
    Create(TicketCreateRequest),
    Reply(TicketReplyRequest),
    Delete(TicketDeleteRequest),
}

enum Response {
    Create(NewTicketResponse),
    Reply(NewTicketReplyResponse),
    Delete(NewTicketDeleteResponse),
}

impl FinalProcessor<async_nats::Message, Result<bytes::Bytes, Error>> for TicketService {
    async fn process(state: Arc<Self>, input: async_nats::Message) -> Result<bytes::Bytes, Error> {
        let subject = input.subject.to_compact_string();
        let payload = input.payload;
        // route the request to the correct processor based on the subject
        if subject == TicketCreateRequest::subject() {
            let request = TicketCreateRequest::from_bytes(payload)?;
            let response = state.ticket_create_processor.process(request).await?
            return Ok(Response::Create(response).to_bytes()?);
        } else if subject == TicketReplyRequest::subject() {
            let request = TicketReplyRequest::from_bytes(payload)?;
            let response = state.ticket_reply_processor.process(request).await?
            return Ok(Response::Reply(response).to_bytes()?);
        } else if subject == TicketDeleteRequest::subject() {
            let request = TicketDeleteRequest::from_bytes(payload)?;
            let response = state.ticket_delete_processor.process(request).await?
            return Ok(Response::Delete(response).to_bytes()?);
        } else {
            return Err(Error::PreProcessorError(PreProcessorError::UnexpectedSubject(input.subject)));
        }
    }
}

// implement the marker trait
impl FinalNatsProcessor for TicketService {}
```

:::caution
`FinalProcessor` is not recommended for most use cases. It's only useful when you need to ensure the processor outlives the future it returns.

If you use `FinalProcessor` more than once in a progress, you should consider nest `Processor` inside `FinalProcessor`.
:::