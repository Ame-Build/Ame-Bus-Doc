---
title: What is Shizuku
---

Shizuku is a microservices framework based on NATS for Rust. It provides a simple and easy-to-use API for building microservices. It also provides a powerful routing system for NATS.

Shizuku is trying to challenge Spring Boot with rust's ecosystem.

## Compared to other frameworks

I personally say: most backend frameworks are garbage.

- Express.js: give you nothing. You have to install a lot of packages to make it work. And you must sacrifice a lot of performance to ensure type safety.
- Koa, Hono, Elysia, or other JS/TS frameworks: same as Express.js.
- django: As slow as python should be. When you want to customize something, you have to write a huge amount of code to make it work.
- Ruby on Rails: Who is using it? Btw, scale up ruby on rails is a pain.
- Spring Boot: You need to write JAVA.
- Laravel: Worse than Express.js.

And many rust backend frameworks are not useable in production.

- Actix: Performance? That's actix's performance, not yours. Unsafe rust let's go!
- Axum, rocket, poem: Good for API gateway. But not for microservice.
- Tonic: Enjoy configuring you nginx.

## Let Microservice be how it should be

For startups whose project is complex enough to use microservice, they will probably create thousands of API endpoints. This is not a good idea and often let the project fail.

But, in our project, we have tools to do what they want so that they don't need to create so many API endpoints.

### Fetch data in frontend?

We have [NATS Service](/core_concepts/service) with version route, load balance, service discovery out of box.

### API gateway?

Also, we have [NATS Service](/core_concepts/service) with version route, load balance, service discovery out of box.

*It doesn't provide HTTP Server. But all you need to do is reverse proxy it with any API framework you want like Axum or even Express.js.*

### Async task?

We have [JetStream Consumer](/core_concepts/consumer/) act like a message queue but easier to use. Tt also has powerful routing system.

### Cache?

We have [KV Store](/core_concepts/kv_store/) to store cache. It's as fast as redis.

*Because it's just as fast as redis. Redis is slow. So if you need faster cache, you should other solution.*

*And you usually don't need cache so fast.*

*If you don't have more than 10k users, you shouldn't use cache at all.*

### Configuration management?

We have [KV Store](/core_concepts/kv_store/) to store configuration. It's easy to use and powerful.

Configure in KV Store is **not encrypted by default**, if you need to store **sensitive information more sensitive than database password**, you should **encrypt it by yourself.**

### Distributed Lock?

We have [KV Store](/core_concepts/kv_store/) with atomic operation and soft delete supported. Of course it's also easy to use it to implement lock free concurrency.

