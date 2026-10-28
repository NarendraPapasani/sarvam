# Project: Myntra Delivery Support Voice Agent — Simplified Backend

## 1. Role and Objective

Act as a Senior Backend Engineer. Build a complete, runnable REST API backend for a fictional Myntra delivery-support voice agent.

The existing voice agent uses Sarvam AI to speak with customers. This backend provides fictional order data, checks delivery options, records delivery events, handles eligible cancellation and rescheduling requests, and creates support escalations.

This is a hackathon/portfolio simulation. We do not have access to Myntra's production database or internal APIs. Use fictional customers, orders, delivery records, and explicitly defined demo rules. Never present simulated policies as confirmed Myntra policies.

Build working code, not just an architecture proposal.

## 2. Technology Stack

- Node.js
- Express.js
- JavaScript using ES modules
- PostgreSQL
- Prisma ORM
- Zod for request validation
- dotenv for environment variables
- cors with explicit configuration
- Helmet for basic security headers
- Nodemon for development
- Swagger/OpenAPI documentation

Do not use TypeScript, Docker, Docker Compose, rate limiting, or automated test frameworks.

Use Prisma for database access, migrations, relations, and seeding. Use a clean modular structure with separate routes, controllers, services, middleware, validation schemas, and Prisma configuration.

## 3. Project Structure

Create a structure similar to:

src/
  app.js
  server.js
  config/
    env.js
    prisma.js
  routes/
    health.routes.js
    customer.routes.js
    order.routes.js
    delivery.routes.js
    cancellation.routes.js
    escalation.routes.js
  controllers/
    customer.controller.js
    order.controller.js
    delivery.controller.js
    cancellation.controller.js
    escalation.controller.js
  services/
    customer.service.js
    order.service.js
    delivery.service.js
    cancellation.service.js
    escalation.service.js
  middleware/
    error-handler.js
    request-id.js
    authentication.js
    not-found.js
  schemas/
    customer.schema.js
    order.schema.js
    delivery.schema.js
    cancellation.schema.js
    escalation.schema.js
  utils/
    api-response.js
    generate-reference.js
prisma/
  schema.prisma
  seed.js
docs/
  openapi.yaml
.env.example
.gitignore
package.json
README.md

You may adjust this structure if necessary, but keep the application modular and easy to understand.

## 4. Database Schema — Only 7 Tables

Create exactly these seven application models using Prisma and PostgreSQL:

1. Customer
2. Address
3. Order
4. OrderItem
5. Shipment
6. DeliveryEvent
7. Escalation

Do not create separate tables for delivery attempts, delivery issues, interactions, action logs, cancellation requests, or callback requests.

Use PostgreSQL enums where appropriate. Use `Decimal` for money, not floating-point types. Use `DateTime` for timestamps and store timestamps consistently in UTC. Use foreign keys, appropriate indexes, unique constraints, and Prisma relations.

### A. Customer

Fields:
- id: UUID primary key
- customerCode: unique human-readable identifier, such as CUST-1001
- fullName
- phone: unique fictional test number
- preferredLanguage: ENGLISH, HINDI, HINGLISH
- createdAt
- updatedAt

### B. Address

Fields:
- id: UUID primary key
- customerId: foreign key to Customer
- label
- line1
- line2, optional
- city
- state
- postalCode
- createdAt
- updatedAt

Relationships:
- One customer has many addresses.
- An address belongs to one customer.
- An address can be referenced by multiple orders over time.

### C. Order

Fields:
- id: UUID primary key
- orderNumber: unique identifier, such as ORD-1001
- customerId: foreign key to Customer
- shippingAddressId: foreign key to Address
- orderStatus: PLACED, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLATION_PENDING, CANCELLED
- paymentMethod: PREPAID, COD
- paymentStatus: PENDING, PAID, FAILED, REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED, NOT_APPLICABLE
- totalAmount: Decimal
- currency: default INR
- placedAt
- createdAt
- updatedAt

Relationships:
- One customer has many orders.
- One address can be associated with many orders.
- One order has many order items.
- One order can have multiple shipments.

Keep order, delivery, and payment statuses independent.

### D. OrderItem

Fields:
- id: UUID primary key
- orderId: foreign key to Order
- productName
- productCategory
- size, optional
- quantity
- unitPrice: Decimal
- createdAt

Use fictional fashion products such as shirts, jeans, dresses, shoes, and accessories.

Relationship:
- Each order item belongs to one order.

### E. Shipment

Fields:
- id: UUID primary key
- shipmentNumber: unique identifier
- orderId: foreign key to Order
- deliveryStatus: NOT_SHIPPED, IN_TRANSIT, OUT_FOR_DELIVERY, DELAYED, DELIVERY_FAILED, DELIVERED, RETURN_TO_ORIGIN
- carrierName
- trackingReference
- estimatedDeliveryDate: optional DateTime
- actualDeliveryAt: optional DateTime
- attemptCount: integer, default 0
- lastFailureReason: optional
- createdAt
- updatedAt

Relationships:
- Each shipment belongs to one order.
- One order can have multiple shipments.
- One shipment has many delivery events.

Do not assume that every order has exactly one shipment.

### F. DeliveryEvent — Consolidated Attempts and Issues

This table replaces both the separate delivery-attempt and delivery-issue tables.

Fields:
- id: UUID primary key
- eventNumber: unique human-readable identifier, such as EVT-5001
- orderId: foreign key to Order
- shipmentId: optional foreign key to Shipment
- eventType: DELIVERY_ATTEMPT, DELIVERY_FAILED, DELIVERY_SUCCESSFUL, DELIVERY_DELAYED, ADDRESS_ISSUE, CUSTOMER_UNAVAILABLE, CUSTOMER_DISPUTE, MARKED_DELIVERED_NOT_RECEIVED, RESCHEDULE_REQUESTED, CANCELLATION_REQUESTED, DAMAGED_PARCEL, OTHER
- eventStatus: OPEN, RECORDED, IN_PROGRESS, RESOLVED, REJECTED, ESCALATED
- description
- failureReason: optional
- attemptNumber: optional integer
- customerContacted: optional boolean
- priority: LOW, MEDIUM, HIGH, URGENT
- preferredDeliveryDate: optional DateTime
- resolutionNotes: optional
- createdAt
- updatedAt

Relationships:
- One order has many delivery events.
- One shipment can have many delivery events.
- A delivery event belongs to one order and may optionally refer to a shipment.

Use this table to record delivery attempts, failed deliveries, disputes, issues, rescheduling requests, and cancellation requests.

Do not create separate attempt, issue, interaction, or action-log tables.

### G. Escalation

Fields:
- id: UUID primary key
- escalationNumber: unique identifier, such as ESC-7001
- orderId: optional foreign key to Order
- deliveryEventId: optional foreign key to DeliveryEvent
- reason
- priority: LOW, MEDIUM, HIGH, URGENT
- status: OPEN, ASSIGNED, RESOLVED, CLOSED
- assignedTeam: optional
- createdAt
- updatedAt

Relationships:
- An escalation may reference an order and/or a delivery event.
- An order can have multiple escalations.
- A delivery event can have multiple escalations.

Require at least one meaningful reference, such as an order or delivery event, when creating an escalation.

## 5. API Endpoints

Use the `/api/v1` prefix.

Implement the following endpoints with Zod validation, Prisma queries, consistent JSON responses, appropriate HTTP status codes, and centralized error handling.

### Health

1. `GET /health`
   - Return service name, status, and version.

2. `GET /api/v1/health/ready`
   - Check PostgreSQL connectivity using Prisma.
   - Return 503 if the database is unavailable.

### Customers

3. `GET /api/v1/customers/:customerCode`
   - Retrieve a customer by customer code.
   - Return customer code, name, preferred language, and masked phone.
   - Do not return full addresses or unrelated customer information.

4. `GET /api/v1/customers/:customerCode/orders`
   - Return paginated orders belonging to the customer.
   - Include order number, order status, payment status, total amount, and shipment summary.
   - Validate page and limit parameters.
   - Document that customer-code lookup alone is not sufficient authentication for a real production system.

### Orders

5. `GET /api/v1/orders`
   - Return a paginated list of orders for the demo/admin interface.
   - Support filters for orderStatus, deliveryStatus, paymentStatus, and orderNumber.
   - Support date-range filtering where practical.
   - Validate query parameters.

6. `GET /api/v1/orders/:orderNumber`
   - Retrieve an order with its customer summary, items, shipping address summary, shipments, and delivery events.
   - Return a safe response DTO instead of raw Prisma objects.
   - Mask personal information.

7. `GET /api/v1/orders/:orderNumber/status`
   - Return a concise summary suitable for Sarvam.
   - Include order status, delivery status, payment status, estimated delivery date, attempt count, and latest delivery event.
   - If an order has multiple shipments, return their statuses separately rather than choosing an arbitrary shipment.

8. `GET /api/v1/orders/:orderNumber/delivery-options`
   - Evaluate the demo business rules.
   - Return permitted actions, unavailable actions, reasons, and required customer confirmations.
   - Keep business rules inside a service, not in route handlers.
   - Do not let the LLM independently determine eligibility.

### Delivery Events

9. `GET /api/v1/orders/:orderNumber/delivery-events`
   - Return delivery events in chronological order.
   - Include event type, event status, description, attempt number, failure reason, and timestamp.
   - Return an empty array when no events exist.

10. `POST /api/v1/orders/:orderNumber/delivery-events`
    - Record a delivery attempt, delivery issue, complaint, or other supported event.
    - Accept eventType, description, optional shipmentNumber, failureReason, attemptNumber, customerContacted, priority, and preferredDeliveryDate.
    - Validate event types and field combinations.
    - Verify that the shipment belongs to the requested order.
    - Update shipment attemptCount and lastFailureReason consistently when an applicable attempt event is created.
    - Use a Prisma transaction for related writes.
    - Return the created event number and event status.

11. `GET /api/v1/delivery-events/:eventNumber`
    - Retrieve one delivery event and its safe related order/shipment summary.

12. `PATCH /api/v1/delivery-events/:eventNumber/status`
    - Update the event status through permitted transitions only.
    - Accept status and optional resolutionNotes.
    - Reject invalid transitions with HTTP 409 or 422 as appropriate.
    - Do not allow arbitrary modification of historical attempt records.

### Rescheduling

13. `POST /api/v1/orders/:orderNumber/reschedule-requests`
    - Accept preferredDeliveryDate, optional preferredTimeWindow, reason, and optional shipmentNumber.
    - Validate the date and shipment relationship.
    - Check the demo eligibility service before creating a `RESCHEDULE_REQUESTED` DeliveryEvent.
    - Return the event number, event status, and requested delivery date.
    - A request is not a confirmed delivery slot. Never claim it has been scheduled unless the backend explicitly confirms it.

Use `DeliveryEvent` to store reschedule requests. Do not create a separate reschedule table.

### Cancellation

14. `POST /api/v1/orders/:orderNumber/cancellation-requests`
    - Accept reason and an explicit confirmation flag.
    - Check cancellation eligibility using demo rules.
    - If eligible, create a `CANCELLATION_REQUESTED` DeliveryEvent and update order status to CANCELLATION_PENDING in a transaction.
    - Do not mark the order CANCELLED merely because a request was submitted.
    - Return the event number, request status, and eligibility explanation.

15. `GET /api/v1/orders/:orderNumber/cancellation-requests`
    - Retrieve cancellation request history by filtering the order's delivery events for `CANCELLATION_REQUESTED`.
    - Return request status, reason, event number, and timestamp.
    - Do not create a separate cancellation-request table.

### Escalations

16. `POST /api/v1/escalations`
    - Accept orderNumber (optional), eventNumber (optional), reason, and priority.
    - Require at least one meaningful reference.
    - Validate that the referenced order and event exist and that the event belongs to the order if both are provided.
    - Create the escalation.
    - If appropriate, update the related DeliveryEvent status to ESCALATED in a Prisma transaction.
    - Return the escalation number and status.

17. `GET /api/v1/escalations/:escalationNumber`
    - Return escalation details and a safe related order/event summary.

18. `GET /api/v1/escalations`
    - Return paginated escalations.
    - Support filtering by status and priority.

19. `PATCH /api/v1/escalations/:escalationNumber/status`
    - Update status through allowed transitions.
    - Accept status and optional assignedTeam.
    - Reject invalid state transitions.

### Demo Scenario Information

20. `GET /api/v1/demo/scenarios`
    - Return the 20 seeded order numbers and their scenario descriptions.
    - Include safe metadata only.

21. `POST /api/v1/demo/reset`
    - Development-only endpoint to reset and reseed demo data.
    - Disable it in production.
    - Never expose destructive reset functionality publicly in a real deployment.

## 6. Demo Business Rules

Implement a separate eligibility service.

These rules are simulated for the project and must be clearly labelled as demo rules.

- Check the current order and shipment state before recommending an action.
- Never assume every failed delivery permits cancellation or rescheduling.
- Do not promise a refund amount, refund completion time, compensation, or guaranteed delivery date without authoritative data.
- Creating a delivery event is not proof that an order was cancelled or rescheduled.
- Keep payment, order, shipment, and event statuses independent.
- Reject illegal state transitions.
- Do not allow a shipment from another order to be attached to an event.
- Do not let a customer-supplied order number alone authorize access to private customer information.
- Require explicit customer confirmation before submitting a cancellation request.
- Use Prisma transactions for operations that modify multiple related records.
- Generate unique event and escalation identifiers.
- Return consistent error codes and messages.

Use suitable HTTP statuses:
- 400: malformed or invalid request.
- 401: authentication required.
- 403: unauthorized action.
- 404: record not found.
- 409: state conflict or invalid transition.
- 422: business-rule rejection.
- 500: unexpected server error.
- 503: database unavailable.

## 7. Sarvam AI Integration

The backend must expose standard HTTP endpoints that Sarvam's configurable API tools can call.

Do not assume undocumented Sarvam API behavior.

Document how to configure these tool mappings:

- `get_order_status` → GET `/api/v1/orders/:orderNumber/status`
- `get_delivery_options` → GET `/api/v1/orders/:orderNumber/delivery-options`
- `get_delivery_events` → GET `/api/v1/orders/:orderNumber/delivery-events`
- `record_delivery_event` → POST `/api/v1/orders/:orderNumber/delivery-events`
- `request_reschedule` → POST `/api/v1/orders/:orderNumber/reschedule-requests`
- `request_cancellation` → POST `/api/v1/orders/:orderNumber/cancellation-requests`
- `create_support_escalation` → POST `/api/v1/escalations`

For each mapping, document:
- Tool name.
- Purpose.
- HTTP method and URL.
- Required input fields.
- Example request.
- Example success response.
- Example error response.

Use consistent response envelopes.

Success:

{
  "success": true,
  "data": {
    "orderNumber": "ORD-1001",
    "deliveryStatus": "DELAYED",
    "eligibleActions": ["REPORT_ISSUE"]
  },
  "meta": {
    "requestId": "req-example"
  }
}

Error:

{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "The requested order could not be found."
  },
  "meta": {
    "requestId": "req-example"
  }
}

Never return Prisma errors, SQL errors, stack traces, credentials, or secrets to the voice agent.

Document the use of an API secret or another appropriate authentication mechanism for protected endpoints. Store secrets in environment variables, never in frontend code or agent instructions.

## 8. Seed Exactly 20 Fictional Orders

Implement an idempotent Prisma seed script that creates exactly 20 unique orders with varied order, payment, shipment, and delivery-event states.

Use deterministic identifiers such as `ORD-1001` through `ORD-1020`. Running the seed multiple times must not create duplicate orders.

Seed scenario categories:

1. Confirmed, not shipped, prepaid.
2. Processing, COD.
3. Shipped, in transit, prepaid.
4. Shipped, delayed, prepaid.
5. Out for delivery.
6. One failed attempt due to customer unavailability.
7. Failed attempt disputed by the customer.
8. Multiple failed attempts.
9. Marked delivered but customer reports non-receipt.
10. Delivered successfully.
11. Address issue.
12. Customer requested a future delivery date.
13. Cancellation request pending.
14. Cancellation request rejected under demo rules.
15. COD order with a delivery refusal event.
16. Prepaid order with payment status REFUND_PENDING.
17. Order with two shipments and distinct delivery statuses.
18. Shipment with a damaged-parcel issue.
19. Order with an open support escalation.
20. Order with multiple historical attempts and an unresolved issue.

Create appropriate customers, addresses, order items, shipments, delivery events, and escalations for these scenarios.

Use fictional names and safe test data. Include realistic variation in fashion products, sizes, prices, cities, preferred languages, dates, payment methods, and delivery states.

Requirements:
- Exactly 20 unique orders.
- Use Prisma `upsert` or another safe idempotent seeding strategy.
- Avoid duplicate related records on repeated runs.
- Maintain valid foreign-key relationships.
- Use multiple shipments for scenario 17.
- Include multiple events for scenarios with delivery history.
- Print the number of seeded orders, customers, shipments, and delivery events after seeding.
- Verify exactly 20 seeded orders exist and fail if the count is wrong.
- Include a scenario manifest in the README.
- Make resetting data easy in development only.

## 9. Validation and Error Handling

- Validate route parameters, query parameters, and request bodies with Zod.
- Use Prisma safely and return explicit response objects.
- Add a centralized Express error handler.
- Add a not-found route handler.
- Generate a request ID for each request.
- Use structured, readable development logs.
- Handle Prisma known errors appropriately.
- Do not leak stack traces in production responses.
- Configure CORS with an explicit allowlist.
- Use Helmet.
- Do not implement rate limiting.
- Do not add a testing framework or automated tests.
- Do not add Docker or Docker Compose.

## 10. Environment Configuration

Provide `.env.example` with:

DATABASE_URL="postgresql://postgres:your_password@localhost:5432/myntra_voice_agent?schema=public"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
API_SECRET="replace-with-a-long-random-secret"

Validate required configuration at startup. Never commit the actual `.env` file.

Use Prisma migrations to create the PostgreSQL schema.

## 11. README and API Documentation

Write a clear README explaining:

- Prerequisites and installation.
- How to create the PostgreSQL database.
- How to configure `.env`.
- How to run Prisma migrations.
- How to seed exactly 20 orders.
- How to start the development server.
- All API endpoints, HTTP methods, and sample payloads.
- The seven database tables and their relationships.
- An ER diagram in Mermaid.
- The consolidated DeliveryEvent model.
- Demo eligibility rules and status transitions.
- Sarvam API-tool configuration.
- How to test endpoints manually with Postman or curl.
- Security limitations before production deployment.

Generate an OpenAPI specification for the implemented endpoints.

## 12. Implementation Order

1. Inspect the current workspace and preserve any existing work.
2. Initialize the JavaScript/Express project.
3. Configure PostgreSQL and Prisma.
4. Define the seven Prisma models and their relationships.
5. Generate and run Prisma migrations.
6. Implement environment configuration and middleware.
7. Implement repositories or service modules using Prisma.
8. Implement all API endpoints.
9. Implement the seed script for exactly 20 orders.
10. Add Sarvam integration examples and OpenAPI documentation.
11. Verify the server starts and explain any checks that could not be performed.

Do not stop after writing a plan. Create the actual application code.

## 13. Definition of Done

The project is complete when:
- The Express server starts.
- PostgreSQL connects through Prisma.
- Exactly seven application models exist.
- Exactly 20 unique fictional orders are seeded.
- The seed script is idempotent.
- All 21 endpoints are implemented and documented.
- Delivery attempts and issues are stored in DeliveryEvent.
- No Interaction or ActionLog models exist.
- No TypeScript, Docker, rate limiting, or automated test framework is included.
- Sarvam API-tool request/response examples are documented.
- The README explains setup, schema relationships, and the demo scenarios.

At the end, summarize the implemented structure, list the endpoints, show the ER diagram, report the seed counts, and identify any remaining limitations.