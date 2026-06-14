# QuickMate — Testing Guide

## Automated verification

```bash
npm run verify
```

Runs 17 checks: login, 12 API endpoints, 3 E2E order scenarios, PO cancel.

## Manual demo flow

1. **Operations Intelligence** — risks load
2. **Flow Tracker** — confirm → fulfill → deliver
3. **Production Floor** — complete work orders
4. **Simulation** — Dining Table × 50

## Credentials

`admin@shivfurniture.com` / `password123`

## Servers

```bash
npm run dev          # backend :4000
cd frontend && npm run dev   # frontend :3001
```
