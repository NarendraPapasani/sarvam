# Myntra Delivery Support Voice Agent — Backend API

> **DEMO PROJECT** — This is a hackathon/portfolio simulation. All customer data, orders, and policies are fictional. These do **not** represent real Myntra policies or production systems.

A complete REST API backend for a fictional Myntra delivery-support voice agent powered by [Sarvam AI](https://www.sarvam.ai/).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [Database Schema](#database-schema)
- [ER Diagram](#er-diagram)
- [API Endpoints](#api-endpoints)
- [Demo Scenarios](#demo-scenarios)
- [Sarvam AI Integration](#sarvam-ai-integration)
- [Demo Business Rules](#demo-business-rules)
- [Testing with curl](#testing-with-curl)
- [Security Limitations](#security-limitations)

---

## Prerequisites

- **Node.js** v18+ 
- **PostgreSQL** v14+
- **npm** v9+

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd sarvam-backend

# Install dependencies
npm install
```

## Database Setup

1. **Create the PostgreSQL database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE myntra_voice_agent;
\q
```

2. **Configure `.env`** (see below)

3. **Run Prisma migrations:**

```bash
npx prisma migrate dev --name init
```

4. **Generate Prisma client:**

```bash
npx prisma generate
```

5. **Seed exactly 20 demo orders:**

```bash
npm run prisma:seed
```

The seed script is **idempotent** — running it multiple times will not create duplicates.

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/myntra_voice_agent?schema=public"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
API_SECRET="replace-with-a-long-random-secret"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `CORS_ORIGIN` | ❌ | Allowed CORS origins (comma-separated) |
| `API_SECRET` | ✅ | Shared secret for API authentication |

## Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The server will output:
```
✅ PostgreSQL connected via Prisma
🚀 Server running on http://localhost:3000 [development]
```

---

## Database Schema

Exactly **7 application models**:

| # | Model | Description |
|---|-------|-------------|
| 1 | **Customer** | Fictional customers with masked phone numbers |
| 2 | **Address** | Shipping addresses linked to customers |
| 3 | **Order** | Orders with independent order/payment/delivery status |
| 4 | **OrderItem** | Fashion products (shirts, jeans, shoes, etc.) |
| 5 | **Shipment** | Delivery tracking with attempt counts |
| 6 | **DeliveryEvent** | Consolidated: attempts, issues, disputes, reschedules, cancellations |
| 7 | **Escalation** | Support escalations linked to orders/events |

### Key Design Decisions

- **DeliveryEvent** replaces separate attempt, issue, interaction, and action-log tables
- **Decimal** type for all monetary values (not floating-point)
- **UTC timestamps** throughout
- **PostgreSQL enums** for status fields
- Order status, payment status, and delivery status are **independent**

## ER Diagram

```mermaid
erDiagram
    Customer ||--o{ Address : "has many"
    Customer ||--o{ Order : "places"
    Address ||--o{ Order : "ships to"
    Order ||--o{ OrderItem : "contains"
    Order ||--o{ Shipment : "shipped via"
    Order ||--o{ DeliveryEvent : "has events"
    Order ||--o{ Escalation : "may escalate"
    Shipment ||--o{ DeliveryEvent : "tracks events"
    DeliveryEvent ||--o{ Escalation : "may escalate"

    Customer {
        uuid id PK
        string customerCode UK
        string fullName
        string phone UK
        enum preferredLanguage
    }

    Address {
        uuid id PK
        uuid customerId FK
        string label
        string line1
        string city
        string state
        string postalCode
    }

    Order {
        uuid id PK
        string orderNumber UK
        uuid customerId FK
        uuid shippingAddressId FK
        enum orderStatus
        enum paymentMethod
        enum paymentStatus
        decimal totalAmount
        datetime placedAt
    }

    OrderItem {
        uuid id PK
        uuid orderId FK
        string productName
        string productCategory
        string size
        int quantity
        decimal unitPrice
    }

    Shipment {
        uuid id PK
        string shipmentNumber UK
        uuid orderId FK
        enum deliveryStatus
        string carrierName
        string trackingReference
        datetime estimatedDeliveryDate
        int attemptCount
    }

    DeliveryEvent {
        uuid id PK
        string eventNumber UK
        uuid orderId FK
        uuid shipmentId FK
        enum eventType
        enum eventStatus
        string description
        enum priority
        datetime preferredDeliveryDate
    }

    Escalation {
        uuid id PK
        string escalationNumber UK
        uuid orderId FK
        uuid deliveryEventId FK
        string reason
        enum priority
        enum status
        string assignedTeam
    }
```

---

## API Endpoints

All protected endpoints require the `x-api-secret` header.

### Health

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | GET | `/health` | ❌ | Liveness check |
| 2 | GET | `/api/v1/health/ready` | ❌ | Readiness + DB check |

### Customers

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 3 | GET | `/api/v1/customers/:customerCode` | ✅ | Get customer (masked phone) |
| 4 | GET | `/api/v1/customers/:customerCode/orders` | ✅ | Paginated customer orders |

### Orders

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 5 | GET | `/api/v1/orders` | ✅ | List orders (filterable) |
| 6 | GET | `/api/v1/orders/:orderNumber` | ✅ | Full order details |
| 7 | GET | `/api/v1/orders/:orderNumber/status` | ✅ | Concise status for Sarvam |
| 8 | GET | `/api/v1/orders/:orderNumber/delivery-options` | ✅ | Eligible actions |

### Delivery Events

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 9 | GET | `/api/v1/orders/:orderNumber/delivery-events` | ✅ | List events (chronological) |
| 10 | POST | `/api/v1/orders/:orderNumber/delivery-events` | ✅ | Record event |
| 11 | GET | `/api/v1/delivery-events/:eventNumber` | ✅ | Get single event |
| 12 | PATCH | `/api/v1/delivery-events/:eventNumber/status` | ✅ | Update event status |

### Rescheduling

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 13 | POST | `/api/v1/orders/:orderNumber/reschedule-requests` | ✅ | Request reschedule |

### Cancellation

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 14 | POST | `/api/v1/orders/:orderNumber/cancellation-requests` | ✅ | Request cancellation |
| 15 | GET | `/api/v1/orders/:orderNumber/cancellation-requests` | ✅ | Cancellation history |

### Escalations

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 16 | POST | `/api/v1/escalations` | ✅ | Create escalation |
| 17 | GET | `/api/v1/escalations/:escalationNumber` | ✅ | Get escalation |
| 18 | GET | `/api/v1/escalations` | ✅ | List escalations |
| 19 | PATCH | `/api/v1/escalations/:escalationNumber/status` | ✅ | Update status |

### Demo

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 20 | GET | `/api/v1/demo/scenarios` | ❌ | List 20 scenarios |
| 21 | POST | `/api/v1/demo/reset` | ✅ | Reset data (dev only) |

---

## Demo Scenarios

| # | Order | Scenario |
|---|-------|----------|
| 1 | ORD-1001 | Confirmed, not shipped, prepaid |
| 2 | ORD-1002 | Processing, COD |
| 3 | ORD-1003 | Shipped, in transit, prepaid |
| 4 | ORD-1004 | Shipped, delayed, prepaid |
| 5 | ORD-1005 | Out for delivery |
| 6 | ORD-1006 | One failed attempt — customer unavailable |
| 7 | ORD-1007 | Failed attempt disputed by customer |
| 8 | ORD-1008 | Multiple failed attempts |
| 9 | ORD-1009 | Marked delivered but customer reports non-receipt |
| 10 | ORD-1010 | Delivered successfully |
| 11 | ORD-1011 | Address issue |
| 12 | ORD-1012 | Customer requested a future delivery date |
| 13 | ORD-1013 | Cancellation request pending |
| 14 | ORD-1014 | Cancellation request rejected under demo rules |
| 15 | ORD-1015 | COD order with delivery refusal event |
| 16 | ORD-1016 | Prepaid order with REFUND_PENDING payment status |
| 17 | ORD-1017 | Two shipments with distinct delivery statuses |
| 18 | ORD-1018 | Shipment with a damaged-parcel issue |
| 19 | ORD-1019 | Order with an open support escalation |
| 20 | ORD-1020 | Multiple historical attempts + unresolved issue |

---

## Sarvam AI Integration

The backend exposes standard HTTP endpoints that Sarvam's configurable API tools can call directly.

### Tool Mappings

| Tool Name | Method | URL | Purpose |
|-----------|--------|-----|---------|
| `get_order_status` | GET | `/api/v1/orders/:orderNumber/status` | Get concise delivery status |
| `get_delivery_options` | GET | `/api/v1/orders/:orderNumber/delivery-options` | Check eligible actions |
| `get_delivery_events` | GET | `/api/v1/orders/:orderNumber/delivery-events` | View delivery history |
| `record_delivery_event` | POST | `/api/v1/orders/:orderNumber/delivery-events` | Record an event |
| `request_reschedule` | POST | `/api/v1/orders/:orderNumber/reschedule-requests` | Request rescheduling |
| `request_cancellation` | POST | `/api/v1/orders/:orderNumber/cancellation-requests` | Request cancellation |
| `create_support_escalation` | POST | `/api/v1/escalations` | Escalate to support |

### Example: `get_order_status`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/orders/ORD-1004/status \
  -H "x-api-secret: your-secret"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-1004",
    "orderStatus": "SHIPPED",
    "paymentMethod": "PREPAID",
    "paymentStatus": "PAID",
    "shipments": [
      {
        "shipmentNumber": "SHP-4001",
        "deliveryStatus": "DELAYED",
        "estimatedDeliveryDate": "2026-10-26T00:00:00.000Z",
        "attemptCount": 0,
        "lastFailureReason": null
      }
    ],
    "latestDeliveryEvent": {
      "eventNumber": "EVT-4001",
      "eventType": "DELIVERY_DELAYED",
      "eventStatus": "OPEN",
      "description": "Shipment delayed due to weather conditions."
    }
  },
  "meta": { "requestId": "abc-123" }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found."
  },
  "meta": { "requestId": "abc-123" }
}
```

### Example: `request_cancellation`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/orders/ORD-1001/cancellation-requests \
  -H "Content-Type: application/json" \
  -H "x-api-secret: your-secret" \
  -d '{
    "reason": "Customer found a better price elsewhere",
    "confirmation": true
  }'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "eventNumber": "EVT-123401",
    "eventStatus": "RECORDED",
    "orderStatus": "CANCELLATION_PENDING",
    "eligibility": { "eligible": true, "reason": "Order is eligible for cancellation under demo rules." },
    "message": "Cancellation request submitted. The order is now pending cancellation review."
  },
  "meta": { "requestId": "abc-456" }
}
```

### Example: `create_support_escalation`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/escalations \
  -H "Content-Type: application/json" \
  -H "x-api-secret: your-secret" \
  -d '{
    "orderNumber": "ORD-1004",
    "reason": "Customer frustrated with delayed delivery",
    "priority": "HIGH"
  }'
```

### Authentication

All protected endpoints require the `x-api-secret` header:
```
x-api-secret: your-configured-secret
```

Store the secret in the `API_SECRET` environment variable. **Never embed it in frontend code or agent instructions.**

---

## Demo Business Rules

> ⚠️ These rules are **simulated for demonstration only** and do not represent real Myntra policies.

### Cancellation Eligibility
- Eligible when order status is `PLACED`, `CONFIRMED`, or `PROCESSING`
- Not eligible once `SHIPPED`, `DELIVERED`, or `CANCELLED`
- Requires **explicit customer confirmation** (`confirmation: true`)
- Submitting a request sets order to `CANCELLATION_PENDING` — it does **not** cancel the order

### Rescheduling Eligibility
- Eligible when shipment status is `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELAYED`, or `DELIVERY_FAILED`
- Not eligible when no shipment exists or delivery is complete
- Not eligible when attempt count ≥ 3
- A reschedule request is **not** a confirmed delivery slot

### Event Status Transitions
```
OPEN → RECORDED, IN_PROGRESS, RESOLVED, REJECTED, ESCALATED
RECORDED → IN_PROGRESS, RESOLVED, REJECTED, ESCALATED
IN_PROGRESS → RESOLVED, REJECTED, ESCALATED
ESCALATED → IN_PROGRESS, RESOLVED
RESOLVED → (terminal)
REJECTED → (terminal)
```

### Escalation Status Transitions
```
OPEN → ASSIGNED, RESOLVED, CLOSED
ASSIGNED → RESOLVED, CLOSED
RESOLVED → CLOSED
CLOSED → (terminal)
```

---

## Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/api/v1/health/ready

# Get customer
curl -H "x-api-secret: your-secret" http://localhost:3000/api/v1/customers/CUST-1001

# List orders
curl -H "x-api-secret: your-secret" "http://localhost:3000/api/v1/orders?page=1&limit=5"

# Get order status
curl -H "x-api-secret: your-secret" http://localhost:3000/api/v1/orders/ORD-1004/status

# Check delivery options
curl -H "x-api-secret: your-secret" http://localhost:3000/api/v1/orders/ORD-1006/delivery-options

# Record delivery event
curl -X POST http://localhost:3000/api/v1/orders/ORD-1005/delivery-events \
  -H "Content-Type: application/json" \
  -H "x-api-secret: your-secret" \
  -d '{"eventType": "DELIVERY_ATTEMPT", "description": "Second delivery attempt", "attemptNumber": 2}'

# Request cancellation
curl -X POST http://localhost:3000/api/v1/orders/ORD-1001/cancellation-requests \
  -H "Content-Type: application/json" \
  -H "x-api-secret: your-secret" \
  -d '{"reason": "Changed my mind", "confirmation": true}'

# View demo scenarios
curl http://localhost:3000/api/v1/demo/scenarios
```

---

## Security Limitations

This is a **demo/portfolio project**. Before production deployment, address:

1. **Authentication**: Replace shared API secret with JWT/OAuth2
2. **Authorization**: Customer-code lookup alone is not sufficient access control
3. **Input sanitization**: Add deeper sanitization beyond Zod validation
4. **Rate limiting**: Not implemented per spec requirements
5. **HTTPS**: Required in production
6. **Secrets management**: Use a vault, not environment variables
7. **Audit logging**: Add comprehensive audit trails
8. **Data encryption**: Encrypt PII at rest
9. **CORS**: Lock down origins for production
10. **Error details**: Production mode hides stack traces (already implemented)

---

## License

MIT
