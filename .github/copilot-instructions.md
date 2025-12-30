# Puente Hotel Management System - AI Agent Instructions

## Project Overview
Puente Hotel is a comprehensive hotel management system implementing Domain-Driven Design with microservices architecture. Core domains: Room Management, Reservations, Guest Services, Billing, Housekeeping, and Staff Management.

## Architecture
- **Layered Architecture**: Presentation (React/Vue) → API Gateway → Business Logic (Node.js/.NET) → Data Access → PostgreSQL
- **Microservices**: Separate services for Reservations, Rooms, Billing, etc.
- **Event-Driven**: Use events like `ReservationConfirmedEvent` for cross-service communication

## Key Patterns
- **DDD Aggregates**: `Reservation` (root), `Room`, `Guest` with value objects like `DateRange`, `Money`
- **Repository Pattern**: `ReservationRepository.findByDateRange(dates)` for availability checks
- **State Machine**: Reservation states: Inquiry → Tentative → Confirmed → CheckedIn → CheckedOut
- **Strategy Pattern**: Pricing strategies (Base, Seasonal, Promotional) in `PricingStrategy.calculateRate()`

## Critical Workflows
- **Booking Flow**: Check availability via Room Service, calculate rates, create tentative reservation, confirm on payment
- **Check-in/Check-out**: Verify guest, issue key card, generate final invoice with taxes
- **Housekeeping**: Assign cleaning tasks, track completion, escalate maintenance

## Conventions
- **Database**: Snake_case columns (`guest_id`), audit fields (`created_at`, `updated_at`), soft deletes (`is_deleted`)
- **API**: RESTful endpoints (`POST /api/reservations`), consistent response format with `success`, `data`, `errors`
- **Naming**: Tables plural (`reservations`), enums for statuses (`RoomStatus.AVAILABLE`)

## Integration Points
- Payment gateways (Stripe) for billing
- Email/SMS services for notifications
- Message queues (RabbitMQ) for events
- External APIs for channel managers

## Development Notes
- Use UUIDs for primary keys
- Implement RBAC for staff access
- Focus on KPIs: Occupancy Rate, ADR, RevPAR
- Ensure PCI compliance for payments