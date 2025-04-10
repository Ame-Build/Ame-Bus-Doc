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


## Recommended Component Structure

We recommend structuring your Shizuku-based applications with the following component interfaces. 

:::note
In real applications, components should be implemented as Rust modules (`mod`), not as separate crates.

But it's normal to create separate crates for each component in components implementation examples because it's easier to copy the code.
:::

### Component Interfaces

Each component in your application should expose these public interfaces:

- **Events**: Asynchronous notifications emitted when significant state changes occur within a component. These events are published to other components that may need to react to these changes.
- **Hooks**: Event handlers that subscribe to events from other components and perform actions that require access to the component's private context.
- **RPC**: External function calls that expose interfaces for presentation layers and external systems to interact with the component.
- **Shared**: Carefully selected parts of the component's context that are made available to other components for performance optimization.

### Events & Hooks

Events and hooks function similar to inter-process communication channels. They provide an asynchronous communication mechanism between components.

In the context of distributed systems, events and hooks serve a similar purpose to IPC channels between processes, enabling loosely coupled communication.

When considering synchronous communication between components:

1. Prefer asynchronous communication patterns unless you have a specific requirement for synchronous operations.
2. For maintainability and performance reasons, avoid using RPC for inter-component communication.
3. When synchronous communication is necessary, use the shared interfaces to interact between components.

When an event is triggered, it's published to NATS JetStream as a message. To prevent message accumulation when there are no active consumers, each component should create a default empty hook for its events.

Events use Protocol Buffers for serialization and deserialization.

Events support custom headers for metadata.

Events can utilize dynamic subjects for flexible routing.

### RPC

RPC interfaces are designed for presentation layers and external systems to interact with components. They are not intended for inter-component communication.

Like events, RPC calls support headers, but unlike events, RPC subjects are statically defined.

### Shared

The shared interface provides controlled access to component data, similar to how shared memory works between processes.

Rather than directly sharing memory, data is typically stored in a KV store, database, or other persistence layer. Through dependency injection, this data can be accessed by other components in a manner similar to shared memory.

The shared interface typically includes:

- **Entities**: Data models representing records in databases or KV stores.
- **Functions**: Utility functions and implementations of RPC handlers.
- **Objects**: Data transfer objects for structured information exchange.