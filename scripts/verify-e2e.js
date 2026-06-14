#!/usr/bin/env node
/**
 * QuickMate ERP — one-shot verification script
 * Run: node scripts/verify-e2e.js
 */
const API = process.env.API_URL || 'http://127.0.0.1:4000/api/v1';

const results = [];
const pass = (name, detail = '') => results.push({ status: 'PASS', name, detail });
const fail = (name, detail = '') => results.push({ status: 'FAIL', name, detail });

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { res, data };
}

async function login() {
  const { res, data } = await req('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@shivfurniture.com', password: 'password123' }),
  });
  if (!res.ok || !data.data?.token) throw new Error('Login failed');
  return data.data.token;
}

async function checkEndpoints(h) {
  const endpoints = [
    ['GET', '/dashboard'],
    ['GET', '/intelligence/overview'],
    ['GET', '/sales-orders?limit=5'],
    ['GET', '/purchase-orders?limit=5'],
    ['GET', '/manufacturing-orders?limit=5'],
    ['GET', '/products?limit=5'],
    ['GET', '/vendors?limit=5'],
    ['GET', '/boms?limit=5'],
    ['GET', '/work-centers'],
    ['GET', '/notifications?limit=5'],
    ['GET', '/audit-logs?limit=5'],
    ['GET', '/users'],
  ];
  for (const [method, path] of endpoints) {
    const { res, data } = await req(path, { method, headers: h });
    if (res.ok && data.success !== false) pass(`API ${path}`, `HTTP ${res.status}`);
    else fail(`API ${path}`, data.message || `HTTP ${res.status}`);
  }
}

async function scenario1(h) {
  const products = (await req('/products?limit=50', { headers: h })).data.data.products;
  const p = [...products].sort((a, b) => Number(b.onHandQty) - Number(a.onHandQty))[0];
  const so = (await req('/sales-orders', {
    method: 'POST', headers: h,
    body: JSON.stringify({ customerName: 'Verify S1 In-Stock', lines: [{ productId: p.id, quantity: 1, unitPrice: 1000 }] }),
  })).data.data;

  await req(`/sales-orders/${so.id}/confirm`, { method: 'POST', headers: h });
  const flow = (await req(`/sales-orders/${so.id}/flow`, { headers: h })).data.data;
  if (!flow.summary.allInStock) return fail('Scenario 1: In-stock delivery', 'allInStock=false');
  if (!flow.summary.readyForDelivery) return fail('Scenario 1: In-stock delivery', 'readyForDelivery=false');
  const del = await req(`/sales-orders/${so.id}/deliver`, { method: 'POST', headers: h });
  if (!del.res.ok) return fail('Scenario 1: In-stock delivery', del.data.message);
  pass('Scenario 1: In-stock delivery', `${so.orderNumber} → FULLY_DELIVERED`);
}

async function scenario2(h) {
  const boms = (await req('/boms?limit=20', { headers: h })).data.data.boms;
  if (!boms?.length) return fail('Scenario 2: MO path', 'No BOMs in database');
  const p = boms[0].product;
  const so = (await req('/sales-orders', {
    method: 'POST', headers: h,
    body: JSON.stringify({ customerName: 'Verify S2 MO', lines: [{ productId: p.id, quantity: 5, unitPrice: 2000 }] }),
  })).data.data;

  await req(`/sales-orders/${so.id}/confirm`, { method: 'POST', headers: h });
  await req(`/sales-orders/${so.id}/fulfill`, { method: 'POST', headers: h, body: JSON.stringify({ method: 'MANUFACTURE' }) });
  const flow = (await req(`/sales-orders/${so.id}/flow`, { headers: h })).data.data;
  const mo = flow.linkedManufacturingOrders[0];
  if (!mo) return fail('Scenario 2: MO path', 'No MO created');

  const moDetail = (await req(`/manufacturing-orders/${mo.id}`, { headers: h })).data.data;
  for (const wo of moDetail.workOrders) {
    await req(`/manufacturing-orders/${mo.id}/work-orders/${wo.id}/complete`, {
      method: 'POST', headers: h, body: JSON.stringify({ actualDuration: wo.plannedDuration || 60 }),
    });
  }
  const flow2 = (await req(`/sales-orders/${so.id}/flow`, { headers: h })).data.data;
  if (!flow2.summary.moDone || !flow2.summary.readyForDelivery) {
    return fail('Scenario 2: MO path', `moDone=${flow2.summary.moDone} ready=${flow2.summary.readyForDelivery}`);
  }
  await req(`/sales-orders/${so.id}/deliver`, { method: 'POST', headers: h });
  pass('Scenario 2: MO path', `${so.orderNumber} → MO ${mo.orderNumber} → delivered`);
}

async function scenario3(h) {
  const products = (await req('/products?limit=50', { headers: h })).data.data.products;
  const p = [...products].sort((a, b) => Number(a.onHandQty) - Number(b.onHandQty))[0];
  const qty = Number(p.onHandQty) + 25;
  const so = (await req('/sales-orders', {
    method: 'POST', headers: h,
    body: JSON.stringify({ customerName: 'Verify S3 PO', lines: [{ productId: p.id, quantity: qty, unitPrice: 500 }] }),
  })).data.data;

  await req(`/sales-orders/${so.id}/confirm`, { method: 'POST', headers: h });
  await req(`/sales-orders/${so.id}/fulfill`, { method: 'POST', headers: h, body: JSON.stringify({ method: 'PURCHASE' }) });
  const flow = (await req(`/sales-orders/${so.id}/flow`, { headers: h })).data.data;
  const po = flow.linkedPurchaseOrders[0];
  if (!po) return fail('Scenario 3: PO path', 'No PO created');

  await req(`/purchase-orders/${po.id}/confirm`, { method: 'POST', headers: h });
  const poDetail = (await req(`/purchase-orders/${po.id}`, { headers: h })).data.data;
  const receipts = poDetail.lines
    .map(l => ({ lineId: l.id, receivedQty: l.quantity - l.receivedQty }))
    .filter(r => r.receivedQty > 0);
  await req(`/purchase-orders/${po.id}/receive`, { method: 'POST', headers: h, body: JSON.stringify({ receipts }) });

  const flow2 = (await req(`/sales-orders/${so.id}/flow`, { headers: h })).data.data;
  if (!flow2.summary.readyForDelivery) return fail('Scenario 3: PO path', 'Not ready after receive');
  await req(`/sales-orders/${so.id}/deliver`, { method: 'POST', headers: h });
  pass('Scenario 3: PO path', `${so.orderNumber} → PO ${po.orderNumber} → delivered`);
}

async function scenarioPoCancel(h) {
  const products = (await req('/products?limit=50', { headers: h })).data.data.products;
  const p = products[0];
  const vendorRes = (await req('/vendors?limit=5', { headers: h })).data.data;
  const vendors = vendorRes.vendors || vendorRes || [];
  if (!vendors.length) return fail('PO Cancel', 'No vendors in database');
  const po = (await req('/purchase-orders', {
    method: 'POST', headers: h,
    body: JSON.stringify({
      vendorId: vendors[0].id,
      lines: [{ productId: p.id, quantity: 2, unitPrice: 100 }],
    }),
  })).data.data;
  const cancel = await req(`/purchase-orders/${po.id}/cancel`, { method: 'POST', headers: h });
  if (!cancel.res.ok) return fail('PO Cancel', cancel.data.message);
  if (cancel.data.data.status !== 'CANCELLED') return fail('PO Cancel', `status=${cancel.data.data.status}`);
  pass('PO Cancel', po.orderNumber);
}

async function main() {
  console.log('QuickMate ERP Verification');
  console.log('API:', API);
  console.log('---');

  try {
    const token = await login();
    pass('Auth login', 'admin@shivfurniture.com');
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    await checkEndpoints(h);
    await scenario1(h);
    await scenario2(h);
    await scenario3(h);
    await scenarioPoCancel(h);
  } catch (e) {
    fail('Fatal', e.message);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('');
  for (const r of results) {
    console.log(`${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log('---');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
