# stripe-best-practices

Best practices for building Stripe payment integrations.

## Installation

```bash
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --skill stripe-best-practices
```

## Type

`knowledge` - Guidelines and decision rules

## Keywords

stripe, payment, checkout, subscription, billing

## Overview

This skill provides guidance on modern Stripe integration patterns, helping you avoid deprecated APIs and choose the right integration approach.

## Key Guidelines

### Never Use
- Charges API (use PaymentIntents/Checkout instead)
- Sources API (use SetupIntents instead)
- Card Element (use Payment Element instead)
- Legacy Connect terms (Standard/Express/Custom)

### Always
- Use latest API/SDK versions
- Use controller properties for Connect
- Advise PCI compliance for raw PAN handling

### Prefer
- CheckoutSessions over PaymentIntents for on-session payments
- Stripe-hosted Checkout as default choice
- Billing APIs for subscriptions/recurring

## Decision Rules

| Scenario | Recommendation |
|----------|----------------|
| Recurring revenue / SaaS | Billing APIs + Checkout |
| Platform / Marketplace | Connect with controller properties |
| Save payment method | SetupIntents |
| Inspect card before payment | Confirmation Tokens |

## Version

`245b3bbb` (content-addressable hash)
