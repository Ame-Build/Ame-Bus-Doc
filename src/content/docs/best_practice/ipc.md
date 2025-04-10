---
title: IPC-like
---

This document describes how to structure your Shizuku-based application using patterns similar to traditional IPC mechanisms. While Shizuku doesn't enforce or provide specific tools for this architecture, organizing your code this way can help create a clear and maintainable codebase structure in a distributed context.

## Communication Patterns

### Request-Response (Like Unix Domain Sockets)

Using NATS Services for synchronous communication:

```rust
// Service definition
struct EchoService;

impl FinalNatsProcessor<Message, Result<Bytes, Error>> for EchoService {
    async fn process(state: Arc<Self>, msg: Message) -> Result<Bytes, Error> {
        // Echo back the message payload
        Ok(msg.payload.into())
    }
}

// Client request
let response = request.call(&nats_client).await?;
```

### Message Queue (Like Named Pipes)

Using JetStream Consumers for asynchronous message processing:

```rust
// Consumer definition
struct LogProcessor;

impl Processor<Message, Result<(), Error>> for LogProcessor {
    async fn process(&self, msg: Message) -> Result<(), Error> {
        // Process the message
        Ok(())
    }
}

// Publisher
event.publish(&js_context).await?;
```

### Distributed Locking (Like File Locks)

Using KV Store's distributed read-write locks:

```rust
// Acquire read lock
let result = LockedResourceReadProcessor::new(
    Arc::new(my_processor),
    &store,
    "shared-resource"
).process(input).await?;

// Acquire write lock
let result = LockedResourceWriteProcessor::new(
    Arc::new(my_processor),
    &store,
    "shared-resource"
).process(input).await?;
```

### Shared State and Interface (Like Shared Memory and ABI)

Shizuku enables components to share both state and behavior through two mechanisms:

1. **Interface Sharing via Rust Contexts**
```rust
// Define shared interface
pub struct UserService {
    db: &'static DatabaseConnection,
}

impl Processor<UserId, Result<User, Error>> for UserService {
    async fn process(&self, user_id: UserId) -> Result<User, Error> {
        // shared function
    }
}

impl Processor<User, Result<bool, Error>> for UserService {
    async fn process(&self, user: User) -> Result<(), Error> {
        // shared function
    }
}

// shared object
pub struct User {
    // ...
}
```

2. **State Sharing via Database/KV Store**
```rust
#[derive(Entity)]
pub struct Model {
    id: String,
    name: String,
}
```

This dual approach provides several benefits:
- Direct access to other components' logic without network calls
- Shared business rules and validations across components
- Consistent state access through database/KV store when needed
- Clear separation between pure logic and state operations

:::caution
While Shizuku provides IPC-like patterns, remember that network communication has different security implications than traditional IPC:

- NATS traffic should be encrypted in production
- Access control should be implemented at the NATS level
- Sensitive data in KV Store should be encrypted before storage
:::

## Comparison with Traditional IPC

| IPC Mechanism | Shizuku Equivalent | Key Differences |
|--------------|-------------------|-----------------|
| Unix Sockets | NATS Services | Network-based, distributed |
| Named Pipes | JetStream Consumers | Persistent, scalable |
| Shared Memory & ABI | Rust Contexts + Database/KV Store | Direct logic access via contexts, state access via persistence layer |
| File Locks | DistroRwLock | Distributed, automatic cleanup |

:::tip
For local development, you can run NATS in a single-node configuration to simulate traditional IPC patterns while maintaining compatibility with distributed deployments.
:::


# Shizuku Components (SZKC)

Backend components examples for business.

## Components structure

All the components have these public parts:

- **Events**: Asynchronous event. When something happens inside the component, the event will be sent to other components.
- **Hooks**: Event handlers. Listening events of other components and do something that require accessing private context.
- **RPC**: **External** function calls. Expose interface for representing layer and external system.
- **Shared**: For performance reason, some part of the component's context should be "shared" to other components.

### Events & Hooks

Events and hooks are working like ports or process channels. They are an asynchronous way to communicate between components.

As you know, the communicating method between process are channels or shared memory. Events and hooks are like channels.

If you need a synchronous way to communicate between components, you should know:

1. Unless you have a good reason, you should use asynchronous way.
2. To keep code clean and performance, you should never use rpc to communicate between components.
3. Thus, you should use shared part to communicate between components synchronously.

After an event is triggered, it will be sent to NATS JetStream as a message. If there is no consumer, messages will be accumulated.
To avoid that, a default empty hook is created for each event in the component.

Events are serialized and deserialized by proto buffers.

Events can have headers.

Events can have dynamic subject.

### RPC

RPC is for representing layer and external system. It is not the way to communicate between components.

RPC also have headers, but unlike events, subjects are static.

### Shared

Like shared memory between processes, this provides a way to share data between components.

Data or memory are not shared actually, the data is stored in KV store, database or etc. With dependency injection, the data
can be accessed by other components like shared memory.

Shared part usually contains:

- Entities: including entities in database or in kv store.
- Functions: some helper functions or RPCs' implementation.
- Objects: data transfer objects.