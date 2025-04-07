---
title: JetStream Consumer
---

JetStream Consumer in Ame Bus provides a high-level abstraction for consuming messages from NATS JetStream. It includes a powerful routing system and automatic acknowledgment handling.

## Core Components

### FinalJetStreamProcessor

The `FinalJetStreamProcessor` trait is the foundation of JetStream Consumers. It processes NATS messages and returns a Result indicating success or failure:

```rust
use ame_bus::jetstream::FinalJetStreamProcessor;
use async_nats::Message;

struct MyConsumer {
    // consumer state
}

impl Processor<Message, Result<(), Error>> for MyConsumer {
    async fn process(&self, message: Message) -> Result<(), Error> {
        // Process the message
        Ok(())
    }
}

impl FinalJetStreamProcessor for MyConsumer {} // Implement the marker trait
```

:::note
`FinalJetStreamProcessor` requires `Processor<Message, Result<(), Error>>`, not `FinalProcessor<Message, Result<(), Error>>`.
:::

### JetStreamConsumer

The `JetStreamConsumer` struct handles message consumption and acknowledgment:

```rust
use ame_bus::jetstream::JetStreamConsumer;

let consumer = JetStreamConsumer::new(
    my_processor,
    nats_client,
    error_tracer
);

// Run the consumer
consumer.run(message_stream).await;
```

You still need to get the message stream and combine it manually before running the consumer.

## Message Routing

Ame Bus provides a powerful `jet_route!` macro for routing JetStream messages:

```rust
use ame_bus::jet_route;

impl Processor<Message, Result<(), Error>> for OrderService {
    async fn process(&self, input: Message) -> Result<(), Error> {
        jet_route![
            input,
            ["invoice"] => (&self.invoice_processor),
            ["order", "paid", "*"] => (&self.order_paid_processor),
            ["order", "cancelled"] => (&self.order_cancelled_processor)
        ]
    }
}
```

### Route Patterns

The routing system supports several pattern types:
- Static segments: `["order", "paid"]`
- Single-level wildcard: `["order", "*", "paid"]`
- Multi-level wildcard: `["order", ">"]` (must be last segment)
- Nested routes: See example below

## Best Practices

1. **Message Organization**
   - Use hierarchical subjects (e.g., `order.paid`, `order.cancelled`)
   - Keep subject patterns consistent across related consumers

2. **Error Handling**
   - Implement proper error tracing using `ErrorTracer`
   - Handle errors appropriately to ensure message acknowledgment

3. **State Management**
   - Use `&'static` references for long-lived connections
   - Consider using `Arc` for shared state between processors

4. **Processing Flow**
   - Keep processors focused on single responsibilities
   - Use the routing system to direct messages to appropriate handlers

## Complete Example

Here's a full example of a JetStream consumer with routing:

```rust
use ame_bus::jetstream::{FinalJetStreamProcessor, JetStreamConsumer};
use ame_bus::{jet_route, Error, Processor};
use async_nats::Message;

struct OrderService {
    order_paid_processor: OrderPaidProcessor,
    order_cancelled_processor: OrderCancelledProcessor,
    invoice_processor: InvoiceProcessor,
}

impl Processor<Message, Result<(), Error>> for OrderService {
    async fn process(&self, input: Message) -> Result<(), Error> {
        jet_route![
            input,
            // Basic routes
            ["invoice"] => (&self.invoice_processor),
            ["order", "paid", "*"] => (&self.order_paid_processor),
            ["order", "cancelled"] => (&self.order_cancelled_processor),
            
            // Nested routes example
            ["order"] => [
                ["paid"] => (&self.order_paid_processor),
                ["cancelled"] => (&self.order_cancelled_processor)
            ]
        ]
    }
}

impl FinalJetStreamProcessor for OrderService {}

// Start the consumer
let consumer = JetStreamConsumer::new(
    OrderService::new(),
    nats_client,
    error_tracer
);

consumer.run(message_stream).await;
```

## Publishing Events

When you need to publish events from your processors, use the `JetStreamMessageSendTrait`:

```rust
use ame_bus::core::message::JetStreamMessageSendTrait;

#[derive(ByteSerialize)]
struct OrderPaidEvent {
    order_id: String,
    amount: f64,
}

impl DynamicSubjectMessage for OrderPaidEvent {
    fn subject(&self) -> NatsSubjectPath {
        vec!["order", "paid", &self.order_id].into()
    }
}

impl JetStreamMessageSendTrait for OrderPaidEvent {}

// Publishing the event
let event = OrderPaidEvent {
    order_id: "123".to_string(),
    amount: 99.99,
};
event.publish(&js_context).await?;
```

Or, if the subject is static, after `StaticSubjectMessage` is implemented, the `JetStreamMessageSendTrait` can be implemented automatically.

## Comparison with Traditional Message Queues

JetStream Consumers in Ame Bus offer several advantages:
- Built-in subject-based routing with pattern matching
- Automatic acknowledgment handling
- Integrated error tracing
- High performance and reliability through NATS JetStream

