---
title: JSON
---

Shizuku provides JSON serialization support through the `json` feature flag. This integration uses `serde_json` for serialization and deserialization.

## Installation

Add the `json` feature to your Shizuku dependency in `Cargo.toml`:

```toml ins="\"json\""
// Cargo.toml
[dependencies]
shizuku = { version = "0.0.2-alpha.2", features = ["json"] }
```

## Usage

The JSON integration provides two derive macros:
- `JsonByteSer`: Implements `ByteSerialize` for JSON serialization
- `JsonByteDes`: Implements `ByteDeserialize` for JSON deserialization

### Example

```rust ins="JsonByteSer, JsonByteDes"
use serde::{Serialize, Deserialize};
use shizuku::{JsonByteSer, JsonByteDes};

#[derive(Serialize, Deserialize, JsonByteSer, JsonByteDes)]
struct User {
    id: String,
    name: String,
    email: String,
}
```

This will automatically implement:
- `ByteSerialize` for converting the struct to JSON bytes
- `ByteDeserialize` for parsing JSON bytes back into the struct

:::note
Your types must implement `serde::Serialize` for `JsonByteSer` and `serde::Deserialize` for `JsonByteDes`.
:::

### Using in Services

The JSON serialization works seamlessly with NATS services:

```rust
#[derive(Serialize, Deserialize, JsonByteSer, JsonByteDes)]
struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Serialize, Deserialize, JsonByteSer, JsonByteDes)]
struct CreateUserResponse {
    id: String,
}

impl NatsRpcCallTrait<CreateUserResponse> for CreateUserRequest {
    fn subject() -> (NatsSubjectPath, PhantomData<CreateUserResponse>) {
        (subject_path!["user", "create"], PhantomData)
    }
}
```


### Using with JetStream

You can use JSON serialization for JetStream events and consumers:

```rust
use serde::{Serialize, Deserialize};
use shizuku::{JsonByteSer, JsonByteDes, DynamicSubjectMessage, JetStreamMessageSendTrait};
use shizuku::jetstream::FinalJetStreamProcessor;

// Define an event with JSON serialization
#[derive(Serialize, Deserialize, JsonByteSer)]
struct OrderCreatedEvent {
    order_id: String,
    customer_id: String,
    amount: f64,
}

// ImStatnt dynamic subject for the event
impl DynamicSubessage for OrderCreatedEvent {
    fn subject(&self) -> NatsSubjectPath {
        subject_path!["order", "created", &self.order_id]
    }
}

// The trait is automatically implemented
impl JetStreamMessageSendTrait for OrderCreatedEvent {}

// Define a consumer that processes JSON messages
#[derive(Serialize, Deserialize, JsonByteDes)]
struct OrderData {
    order_id: String,
    customer_id: String,
    amount: f64,
}

struct OrderProcessor;

impl Processor<Message, Result<(), Error>> for OrderProcessor {
    async fn process(&self, msg: Message) -> Result<(), Error> {
        // Parse JSON message
        let order = OrderData::parse_from_bytes(msg.payload)?;
        
        // Process the order
        println!("Processing order: {}", order.order_id);
        Ok(())
    }
}

impl FinalJetStreamProcessor for OrderProcessor {}
```
