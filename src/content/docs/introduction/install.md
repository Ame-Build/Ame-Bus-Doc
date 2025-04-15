---
title: Install
---

## Prerequisites

Before installing Shizuku, ensure you have:
- Rust toolchain installed (latest stable version)
- Basic understanding of Rust (see [Before You Start](/introduction/before_you_start))
- A running NATS server (see [What is NATS](/introduction/what_is_nats))

## Adding Shizuku to Your Project

Add Shizuku to your project's `Cargo.toml`:

```toml
// Cargo.toml
[dependencies]
shizuku = "0.0.2-alpha.2"
```

### Optional Features

Shizuku provides several optional features that you can enable:

```toml
// Cargo.toml
[dependencies]
shizuku = { version = "0.0.2-alpha.2", features = ["json", "protobuf"] }
```

Available features:
- [`json`](/integration/json): Enables JSON serialization support
- [`protobuf`](/integration/protobuf): Enables Protocol Buffers serialization support

## Quick Start

1. Create a new Rust project:
```bash
cargo new my-shizuku-service
cd my-shizuku-service
```

2. Add Shizuku to your dependencies as shown above

3. Create a basic service:

```rust
use shizuku::service_rpc::FinalNatsProcessor;
use async_nats::Message;
use bytes::Bytes;

struct EchoService;

impl FinalNatsProcessor<Message, Result<Bytes, Error>> for EchoService {
    async fn process(_state: Arc<Self>, msg: Message) -> Result<Bytes, Error> {
        Ok(msg.payload.into())
    }
}
```

## Next Steps

- Learn about [What is Shizuku](/introduction/what_is_shizuku)
- Explore [Core Concepts](/core_concepts/processor)
- Check out the [API Reference](https://docs.rs/shizuku/latest/shizuku/)

