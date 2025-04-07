---
title: NATS Service
---

NATS Service in Ame Bus provides a high-level abstraction for building request-response style services using NATS. It's designed to handle RPC-like interactions while leveraging NATS's powerful load-balancing and service discovery features.

## Core Components

### FinalNatsProcessor

The `FinalNatsProcessor` trait is the foundation of NATS Services. It processes NATS messages and returns bytes as responses:

```rust
use ame_bus::service_rpc::FinalNatsProcessor;
use async_nats::Message;
use bytes::Bytes;

struct MyService {
    // service state
}

impl FinalProcessor<Message, Result<Bytes, Error>> for MyService {
    async fn process(state: Arc<Self>, message: Message) -> Result<Bytes, Error> {
        // Process the message and return response
    }
}

impl FinalNatsProcessor for MyService {} // Implement the marker trait
```

### ServiceEndpoint

The `ServiceEndpoint` trait marks a processor as a service endpoint with a specific subject:

```rust
use ame_bus::service_rpc::ServiceEndpoint;

struct CreateUserEndpoint {
    db: DatabaseConnection,
}

impl ServiceEndpoint for CreateUserEndpoint {
    const SUBJECT: &'static str = "user.create";
}
```

### NatsService

The `NatsService` struct ties everything together:

```rust
use ame_bus::service_rpc::NatsService;

let service = NatsService::new(
    my_processor,
    nats_client,
    error_tracer
);

// Run the service
service.run(request_stream).await;
```

You still need to get the request stream and combine it manually before running the service.

## Routing Messages

Ame Bus provides a `service_route!` macro for routing messages to appropriate endpoints:

```rust
use ame_bus::service_route;

let result = service_route![
    message,
    (CreateUserEndpoint, &state.create_endpoint),
    (UpdateUserEndpoint, &state.update_endpoint),
    (DeleteUserEndpoint, &state.delete_endpoint)
];
```

## Best Practices

1. **Subject Organization**
   - Use hierarchical subjects (e.g., `user.create`, `user.update`)
   - Keep subjects consistent across related services

2. **Error Handling**
   - Implement proper error tracing using `ErrorTracer`
   - Return appropriate error types from processors

3. **State Management**
   - Use `&'static` references for long-lived connections
   - Consider using `Arc` for shared state between endpoints

4. **Response Types**
   - Implement `ByteSerialize` and `ByteDeserialize` for request/response types
   - Use protobuf or JSON serialization (via feature flags)

## Example Service

Here's a complete example of a NATS service:

```rust
use ame_bus::service_rpc::{FinalNatsProcessor, NatsService, ServiceEndpoint};

struct UserService {
    db: &'static DatabaseConnection,
}

impl FinalProcessor<Message, Result<Bytes, Error>> for UserService {
    async fn process(state: Arc<Self>, message: Message) -> Result<Bytes, Error> {
        service_route![
            message,
            (CreateUserEndpoint, &state.create_endpoint),
            (UpdateUserEndpoint, &state.update_endpoint),
            (DeleteUserEndpoint, &state.delete_endpoint)
        ]
    }
}

impl FinalNatsProcessor for UserService {}

// Start the service
let service = NatsService::new(
    UserService { db },
    nats_client,
    ErrorTracer::new()
);

service.run(requests).await;
```

## Comparison with HTTP Services

Unlike traditional HTTP services, NATS services:
- Use subject-based routing instead of URL paths
- Support built-in load balancing and service discovery
- Provide better performance for microservice communication
- Can be exposed via HTTP through an API gateway if needed

