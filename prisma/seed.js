import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────────
// Idempotent seed script for exactly 20 fictional orders.
// Uses upsert by unique identifiers to prevent duplicates on repeated runs.
//
// DEMO DATA — All names, phones, addresses, and products are fictional.
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding demo data...\n');

  // ─── Customers ─────────────────────────────────────────────────────────────
  const customers = [
    { customerCode: 'CUST-1001', fullName: 'Aarav Sharma', phone: '+91-9000000001', preferredLanguage: 'HINDI' },
    { customerCode: 'CUST-1002', fullName: 'Priya Patel', phone: '+91-9000000002', preferredLanguage: 'ENGLISH' },
    { customerCode: 'CUST-1003', fullName: 'Rohan Gupta', phone: '+91-9000000003', preferredLanguage: 'HINGLISH' },
    { customerCode: 'CUST-1004', fullName: 'Ananya Reddy', phone: '+91-9000000004', preferredLanguage: 'ENGLISH' },
    { customerCode: 'CUST-1005', fullName: 'Vikram Singh', phone: '+91-9000000005', preferredLanguage: 'HINDI' },
    { customerCode: 'CUST-1006', fullName: 'Meera Iyer', phone: '+91-9000000006', preferredLanguage: 'ENGLISH' },
    { customerCode: 'CUST-1007', fullName: 'Arjun Nair', phone: '+91-9000000007', preferredLanguage: 'HINGLISH' },
    { customerCode: 'CUST-1008', fullName: 'Kavya Joshi', phone: '+91-9000000008', preferredLanguage: 'HINDI' },
    { customerCode: 'CUST-1009', fullName: 'Raj Malhotra', phone: '+91-9000000009', preferredLanguage: 'ENGLISH' },
    { customerCode: 'CUST-1010', fullName: 'Sneha Deshmukh', phone: '+91-9000000010', preferredLanguage: 'HINGLISH' },
  ];

  const seededCustomers = {};
  for (const c of customers) {
    const customer = await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: {},
      create: c,
    });
    seededCustomers[c.customerCode] = customer;
  }
  console.log(`✅ Customers: ${Object.keys(seededCustomers).length}`);

  // ─── Addresses ─────────────────────────────────────────────────────────────
  const addressData = [
    { customerId: seededCustomers['CUST-1001'].id, label: 'Home', line1: '42 MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' },
    { customerId: seededCustomers['CUST-1002'].id, label: 'Office', line1: '15 Brigade Road', city: 'Bangalore', state: 'Karnataka', postalCode: '560001' },
    { customerId: seededCustomers['CUST-1003'].id, label: 'Home', line1: '88 Connaught Place', city: 'New Delhi', state: 'Delhi', postalCode: '110001' },
    { customerId: seededCustomers['CUST-1004'].id, label: 'Home', line1: '23 Banjara Hills', city: 'Hyderabad', state: 'Telangana', postalCode: '500034' },
    { customerId: seededCustomers['CUST-1005'].id, label: 'Home', line1: '7 Civil Lines', city: 'Jaipur', state: 'Rajasthan', postalCode: '302001' },
    { customerId: seededCustomers['CUST-1006'].id, label: 'Home', line1: '55 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600002' },
    { customerId: seededCustomers['CUST-1007'].id, label: 'Home', line1: '12 MG Road', city: 'Kochi', state: 'Kerala', postalCode: '682011' },
    { customerId: seededCustomers['CUST-1008'].id, label: 'Home', line1: '34 FC Road', city: 'Pune', state: 'Maharashtra', postalCode: '411004' },
    { customerId: seededCustomers['CUST-1009'].id, label: 'Home', line1: '9 Park Street', city: 'Kolkata', state: 'West Bengal', postalCode: '700016' },
    { customerId: seededCustomers['CUST-1010'].id, label: 'Home', line1: '67 SG Highway', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380015' },
  ];

  const seededAddresses = [];
  for (const addr of addressData) {
    // Use a composite lookup to avoid duplicates
    const existing = await prisma.address.findFirst({
      where: { customerId: addr.customerId, label: addr.label, line1: addr.line1 },
    });
    if (existing) {
      seededAddresses.push(existing);
    } else {
      const created = await prisma.address.create({ data: addr });
      seededAddresses.push(created);
    }
  }
  console.log(`✅ Addresses: ${seededAddresses.length}`);

  // ─── Helper: get address for a customer code ──────────────────────────────
  function getAddr(custCode) {
    const custId = seededCustomers[custCode].id;
    return seededAddresses.find((a) => a.customerId === custId);
  }

  // ─── Orders (20 scenarios) ────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
  const daysFromNow = (n) => new Date(now.getTime() + n * 86400000);

  const orderDefs = [
    // 1. Confirmed, not shipped, prepaid
    {
      orderNumber: 'ORD-1001', customerId: seededCustomers['CUST-1001'].id, shippingAddressId: getAddr('CUST-1001').id,
      orderStatus: 'CONFIRMED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 1299.00, placedAt: daysAgo(2),
      items: [{ productName: 'Classic White Shirt', productCategory: 'Shirts', size: 'M', quantity: 1, unitPrice: 1299.00 }],
      shipments: [],
      events: [],
    },
    // 2. Processing, COD
    {
      orderNumber: 'ORD-1002', customerId: seededCustomers['CUST-1002'].id, shippingAddressId: getAddr('CUST-1002').id,
      orderStatus: 'PROCESSING', paymentMethod: 'COD', paymentStatus: 'NOT_APPLICABLE', totalAmount: 2499.00, placedAt: daysAgo(1),
      items: [
        { productName: 'Slim Fit Blue Jeans', productCategory: 'Jeans', size: '32', quantity: 1, unitPrice: 1499.00 },
        { productName: 'Leather Belt', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 1000.00 },
      ],
      shipments: [],
      events: [],
    },
    // 3. Shipped, in transit, prepaid
    {
      orderNumber: 'ORD-1003', customerId: seededCustomers['CUST-1003'].id, shippingAddressId: getAddr('CUST-1003').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 3999.00, placedAt: daysAgo(5),
      items: [{ productName: 'Designer Kurta Set', productCategory: 'Ethnic Wear', size: 'L', quantity: 1, unitPrice: 3999.00 }],
      shipments: [
        { shipmentNumber: 'SHP-3001', deliveryStatus: 'IN_TRANSIT', carrierName: 'Delhivery', trackingReference: 'DLV300100001', estimatedDeliveryDate: daysFromNow(2), attemptCount: 0 },
      ],
      events: [],
    },
    // 4. Shipped, delayed, prepaid
    {
      orderNumber: 'ORD-1004', customerId: seededCustomers['CUST-1004'].id, shippingAddressId: getAddr('CUST-1004').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 5499.00, placedAt: daysAgo(7),
      items: [{ productName: 'Running Shoes Nike Air', productCategory: 'Shoes', size: '10', quantity: 1, unitPrice: 5499.00 }],
      shipments: [
        { shipmentNumber: 'SHP-4001', deliveryStatus: 'DELAYED', carrierName: 'BlueDart', trackingReference: 'BD400100001', estimatedDeliveryDate: daysAgo(1), attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-4001', eventType: 'DELIVERY_DELAYED', eventStatus: 'OPEN', description: 'Shipment delayed due to weather conditions in transit hub.', priority: 'HIGH' },
      ],
    },
    // 5. Out for delivery
    {
      orderNumber: 'ORD-1005', customerId: seededCustomers['CUST-1005'].id, shippingAddressId: getAddr('CUST-1005').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 899.00, placedAt: daysAgo(4),
      items: [{ productName: 'Cotton Polo T-Shirt', productCategory: 'T-Shirts', size: 'XL', quantity: 1, unitPrice: 899.00 }],
      shipments: [
        { shipmentNumber: 'SHP-5001', deliveryStatus: 'OUT_FOR_DELIVERY', carrierName: 'Ecom Express', trackingReference: 'ECM500100001', estimatedDeliveryDate: now, attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-5001', eventType: 'DELIVERY_ATTEMPT', eventStatus: 'RECORDED', description: 'Out for delivery. Delivery partner en route.', attemptNumber: 1, priority: 'MEDIUM' },
      ],
    },
    // 6. One failed attempt — customer unavailable
    {
      orderNumber: 'ORD-1006', customerId: seededCustomers['CUST-1006'].id, shippingAddressId: getAddr('CUST-1006').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 1799.00, placedAt: daysAgo(6),
      items: [{ productName: 'Floral Maxi Dress', productCategory: 'Dresses', size: 'S', quantity: 1, unitPrice: 1799.00 }],
      shipments: [
        { shipmentNumber: 'SHP-6001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'Delhivery', trackingReference: 'DLV600100001', estimatedDeliveryDate: daysAgo(1), attemptCount: 1, lastFailureReason: 'Customer unavailable at delivery address' },
      ],
      events: [
        { eventNumber: 'EVT-6001', eventType: 'CUSTOMER_UNAVAILABLE', eventStatus: 'RECORDED', description: 'Delivery attempted but customer was not available at the address.', failureReason: 'Customer unavailable at delivery address', attemptNumber: 1, customerContacted: true, priority: 'MEDIUM' },
      ],
    },
    // 7. Failed attempt disputed by customer
    {
      orderNumber: 'ORD-1007', customerId: seededCustomers['CUST-1007'].id, shippingAddressId: getAddr('CUST-1007').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 2199.00, placedAt: daysAgo(5),
      items: [{ productName: 'Formal Blazer', productCategory: 'Blazers', size: 'L', quantity: 1, unitPrice: 2199.00 }],
      shipments: [
        { shipmentNumber: 'SHP-7001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'BlueDart', trackingReference: 'BD700100001', estimatedDeliveryDate: daysAgo(2), attemptCount: 1, lastFailureReason: 'Customer refused delivery' },
      ],
      events: [
        { eventNumber: 'EVT-7001', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Delivery partner marked as customer refused. Customer disputes this.', failureReason: 'Customer refused delivery', attemptNumber: 1, priority: 'HIGH' },
        { eventNumber: 'EVT-7002', eventType: 'CUSTOMER_DISPUTE', eventStatus: 'OPEN', description: 'Customer claims they were home and never refused delivery. Disputing the failed delivery record.', priority: 'HIGH' },
      ],
    },
    // 8. Multiple failed attempts
    {
      orderNumber: 'ORD-1008', customerId: seededCustomers['CUST-1008'].id, shippingAddressId: getAddr('CUST-1008').id,
      orderStatus: 'SHIPPED', paymentMethod: 'COD', paymentStatus: 'NOT_APPLICABLE', totalAmount: 3299.00, placedAt: daysAgo(10),
      items: [{ productName: 'Leather Handbag', productCategory: 'Bags', size: null, quantity: 1, unitPrice: 3299.00 }],
      shipments: [
        { shipmentNumber: 'SHP-8001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'Ecom Express', trackingReference: 'ECM800100001', estimatedDeliveryDate: daysAgo(3), attemptCount: 3, lastFailureReason: 'Gate locked, no response on calling' },
      ],
      events: [
        { eventNumber: 'EVT-8001', eventType: 'DELIVERY_ATTEMPT', eventStatus: 'RECORDED', description: 'First delivery attempt: customer not home.', failureReason: 'Customer not home', attemptNumber: 1, customerContacted: true, priority: 'MEDIUM' },
        { eventNumber: 'EVT-8002', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Second delivery attempt: address gate locked.', failureReason: 'Gate locked', attemptNumber: 2, customerContacted: true, priority: 'HIGH' },
        { eventNumber: 'EVT-8003', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Third delivery attempt: gate locked again, no response on phone.', failureReason: 'Gate locked, no response on calling', attemptNumber: 3, customerContacted: false, priority: 'URGENT' },
      ],
    },
    // 9. Marked delivered but customer reports non-receipt
    {
      orderNumber: 'ORD-1009', customerId: seededCustomers['CUST-1009'].id, shippingAddressId: getAddr('CUST-1009').id,
      orderStatus: 'DELIVERED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 4299.00, placedAt: daysAgo(8),
      items: [{ productName: 'Premium Wool Overcoat', productCategory: 'Coats', size: 'L', quantity: 1, unitPrice: 4299.00 }],
      shipments: [
        { shipmentNumber: 'SHP-9001', deliveryStatus: 'DELIVERED', carrierName: 'Delhivery', trackingReference: 'DLV900100001', estimatedDeliveryDate: daysAgo(3), actualDeliveryAt: daysAgo(3), attemptCount: 1 },
      ],
      events: [
        { eventNumber: 'EVT-9001', eventType: 'DELIVERY_SUCCESSFUL', eventStatus: 'RECORDED', description: 'Delivery completed. Signed by security guard.', attemptNumber: 1, priority: 'LOW' },
        { eventNumber: 'EVT-9002', eventType: 'MARKED_DELIVERED_NOT_RECEIVED', eventStatus: 'OPEN', description: 'Customer reports package was not received despite delivery confirmation. Security guard denies receiving it.', priority: 'URGENT' },
      ],
    },
    // 10. Delivered successfully
    {
      orderNumber: 'ORD-1010', customerId: seededCustomers['CUST-1010'].id, shippingAddressId: getAddr('CUST-1010').id,
      orderStatus: 'DELIVERED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 699.00, placedAt: daysAgo(12),
      items: [{ productName: 'Printed Silk Scarf', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 699.00 }],
      shipments: [
        { shipmentNumber: 'SHP-10001', deliveryStatus: 'DELIVERED', carrierName: 'BlueDart', trackingReference: 'BD1000100001', estimatedDeliveryDate: daysAgo(8), actualDeliveryAt: daysAgo(9), attemptCount: 1 },
      ],
      events: [
        { eventNumber: 'EVT-10001', eventType: 'DELIVERY_SUCCESSFUL', eventStatus: 'RESOLVED', description: 'Package delivered to customer successfully.', attemptNumber: 1, priority: 'LOW' },
      ],
    },
    // 11. Address issue
    {
      orderNumber: 'ORD-1011', customerId: seededCustomers['CUST-1001'].id, shippingAddressId: getAddr('CUST-1001').id,
      orderStatus: 'SHIPPED', paymentMethod: 'COD', paymentStatus: 'NOT_APPLICABLE', totalAmount: 1599.00, placedAt: daysAgo(4),
      items: [{ productName: 'Denim Jacket', productCategory: 'Jackets', size: 'M', quantity: 1, unitPrice: 1599.00 }],
      shipments: [
        { shipmentNumber: 'SHP-11001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'Delhivery', trackingReference: 'DLV1100100001', estimatedDeliveryDate: daysAgo(1), attemptCount: 1, lastFailureReason: 'Incomplete address — building number missing' },
      ],
      events: [
        { eventNumber: 'EVT-11001', eventType: 'ADDRESS_ISSUE', eventStatus: 'OPEN', description: 'Delivery partner could not locate building. Address appears incomplete.', failureReason: 'Incomplete address — building number missing', attemptNumber: 1, customerContacted: true, priority: 'HIGH' },
      ],
    },
    // 12. Customer requested a future delivery date
    {
      orderNumber: 'ORD-1012', customerId: seededCustomers['CUST-1002'].id, shippingAddressId: getAddr('CUST-1002').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 2799.00, placedAt: daysAgo(3),
      items: [{ productName: 'Embroidered Saree', productCategory: 'Sarees', size: null, quantity: 1, unitPrice: 2799.00 }],
      shipments: [
        { shipmentNumber: 'SHP-12001', deliveryStatus: 'IN_TRANSIT', carrierName: 'BlueDart', trackingReference: 'BD1200100001', estimatedDeliveryDate: daysFromNow(3), attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-12001', eventType: 'RESCHEDULE_REQUESTED', eventStatus: 'RECORDED', description: 'Customer requested delivery on a specific future date due to travel.', preferredDeliveryDate: daysFromNow(5), priority: 'MEDIUM' },
      ],
    },
    // 13. Cancellation request pending
    {
      orderNumber: 'ORD-1013', customerId: seededCustomers['CUST-1003'].id, shippingAddressId: getAddr('CUST-1003').id,
      orderStatus: 'CANCELLATION_PENDING', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 999.00, placedAt: daysAgo(1),
      items: [{ productName: 'Casual Sneakers', productCategory: 'Shoes', size: '9', quantity: 1, unitPrice: 999.00 }],
      shipments: [],
      events: [
        { eventNumber: 'EVT-13001', eventType: 'CANCELLATION_REQUESTED', eventStatus: 'RECORDED', description: 'Customer requested cancellation: found a better deal elsewhere.', priority: 'HIGH' },
      ],
    },
    // 14. Cancellation request rejected under demo rules
    {
      orderNumber: 'ORD-1014', customerId: seededCustomers['CUST-1004'].id, shippingAddressId: getAddr('CUST-1004').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 4999.00, placedAt: daysAgo(6),
      items: [{ productName: 'Smart Watch', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 4999.00 }],
      shipments: [
        { shipmentNumber: 'SHP-14001', deliveryStatus: 'IN_TRANSIT', carrierName: 'Ecom Express', trackingReference: 'ECM1400100001', estimatedDeliveryDate: daysFromNow(1), attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-14001', eventType: 'CANCELLATION_REQUESTED', eventStatus: 'REJECTED', description: 'Customer requested cancellation after shipment. Rejected: order already shipped.', resolutionNotes: 'Cancellation not permitted after shipment per demo policy.', priority: 'HIGH' },
      ],
    },
    // 15. COD order with delivery refusal event
    {
      orderNumber: 'ORD-1015', customerId: seededCustomers['CUST-1005'].id, shippingAddressId: getAddr('CUST-1005').id,
      orderStatus: 'SHIPPED', paymentMethod: 'COD', paymentStatus: 'NOT_APPLICABLE', totalAmount: 1899.00, placedAt: daysAgo(5),
      items: [{ productName: 'Formal Trousers', productCategory: 'Trousers', size: '34', quantity: 1, unitPrice: 1899.00 }],
      shipments: [
        { shipmentNumber: 'SHP-15001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'Delhivery', trackingReference: 'DLV1500100001', estimatedDeliveryDate: daysAgo(2), attemptCount: 1, lastFailureReason: 'Customer refused COD delivery' },
      ],
      events: [
        { eventNumber: 'EVT-15001', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Customer refused to accept COD delivery.', failureReason: 'Customer refused COD delivery', attemptNumber: 1, customerContacted: false, priority: 'HIGH' },
      ],
    },
    // 16. Prepaid order with payment status REFUND_PENDING
    {
      orderNumber: 'ORD-1016', customerId: seededCustomers['CUST-1006'].id, shippingAddressId: getAddr('CUST-1006').id,
      orderStatus: 'CANCELLED', paymentMethod: 'PREPAID', paymentStatus: 'REFUND_PENDING', totalAmount: 3499.00, placedAt: daysAgo(10),
      items: [{ productName: 'Leather Wallet', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 1499.00 },
              { productName: 'Aviator Sunglasses', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 2000.00 }],
      shipments: [],
      events: [
        { eventNumber: 'EVT-16001', eventType: 'CANCELLATION_REQUESTED', eventStatus: 'RESOLVED', description: 'Cancellation approved. Refund processing initiated.', resolutionNotes: 'Order cancelled before shipment. Refund of ₹3499 initiated.', priority: 'MEDIUM' },
      ],
    },
    // 17. Order with two shipments and distinct delivery statuses
    {
      orderNumber: 'ORD-1017', customerId: seededCustomers['CUST-1007'].id, shippingAddressId: getAddr('CUST-1007').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 6998.00, placedAt: daysAgo(6),
      items: [
        { productName: 'Winter Parka Jacket', productCategory: 'Jackets', size: 'L', quantity: 1, unitPrice: 4999.00 },
        { productName: 'Woolen Muffler', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 1999.00 },
      ],
      shipments: [
        { shipmentNumber: 'SHP-17001', deliveryStatus: 'DELIVERED', carrierName: 'BlueDart', trackingReference: 'BD1700100001', estimatedDeliveryDate: daysAgo(2), actualDeliveryAt: daysAgo(2), attemptCount: 1 },
        { shipmentNumber: 'SHP-17002', deliveryStatus: 'IN_TRANSIT', carrierName: 'Delhivery', trackingReference: 'DLV1700200001', estimatedDeliveryDate: daysFromNow(1), attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-17001', eventType: 'DELIVERY_SUCCESSFUL', eventStatus: 'RESOLVED', description: 'First shipment (Winter Parka) delivered.', shipmentIdx: 0, attemptNumber: 1, priority: 'LOW' },
      ],
    },
    // 18. Shipment with a damaged-parcel issue
    {
      orderNumber: 'ORD-1018', customerId: seededCustomers['CUST-1008'].id, shippingAddressId: getAddr('CUST-1008').id,
      orderStatus: 'DELIVERED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 7999.00, placedAt: daysAgo(9),
      items: [{ productName: 'Designer Bridal Lehenga', productCategory: 'Ethnic Wear', size: 'M', quantity: 1, unitPrice: 7999.00 }],
      shipments: [
        { shipmentNumber: 'SHP-18001', deliveryStatus: 'DELIVERED', carrierName: 'Ecom Express', trackingReference: 'ECM1800100001', estimatedDeliveryDate: daysAgo(4), actualDeliveryAt: daysAgo(4), attemptCount: 1 },
      ],
      events: [
        { eventNumber: 'EVT-18001', eventType: 'DELIVERY_SUCCESSFUL', eventStatus: 'RECORDED', description: 'Package delivered.', attemptNumber: 1, priority: 'LOW' },
        { eventNumber: 'EVT-18002', eventType: 'DAMAGED_PARCEL', eventStatus: 'OPEN', description: 'Customer reports lehenga arrived with torn packaging and stains on the fabric.', priority: 'URGENT' },
      ],
    },
    // 19. Order with an open support escalation
    {
      orderNumber: 'ORD-1019', customerId: seededCustomers['CUST-1009'].id, shippingAddressId: getAddr('CUST-1009').id,
      orderStatus: 'SHIPPED', paymentMethod: 'COD', paymentStatus: 'NOT_APPLICABLE', totalAmount: 2599.00, placedAt: daysAgo(7),
      items: [{ productName: 'Graphic Print Hoodie', productCategory: 'Hoodies', size: 'XL', quantity: 1, unitPrice: 2599.00 }],
      shipments: [
        { shipmentNumber: 'SHP-19001', deliveryStatus: 'DELAYED', carrierName: 'BlueDart', trackingReference: 'BD1900100001', estimatedDeliveryDate: daysAgo(2), attemptCount: 0 },
      ],
      events: [
        { eventNumber: 'EVT-19001', eventType: 'DELIVERY_DELAYED', eventStatus: 'ESCALATED', description: 'Shipment has been delayed by 4 days with no update from carrier.', priority: 'URGENT' },
      ],
      escalation: { escalationNumber: 'ESC-19001', reason: 'Shipment delayed beyond estimated date with no carrier updates. Customer frustrated.', priority: 'HIGH', status: 'OPEN' },
    },
    // 20. Multiple historical attempts and an unresolved issue
    {
      orderNumber: 'ORD-1020', customerId: seededCustomers['CUST-1010'].id, shippingAddressId: getAddr('CUST-1010').id,
      orderStatus: 'SHIPPED', paymentMethod: 'PREPAID', paymentStatus: 'PAID', totalAmount: 4599.00, placedAt: daysAgo(14),
      items: [
        { productName: 'Sports Track Suit', productCategory: 'Sportswear', size: 'L', quantity: 1, unitPrice: 2999.00 },
        { productName: 'Running Socks (3-pack)', productCategory: 'Accessories', size: null, quantity: 1, unitPrice: 1600.00 },
      ],
      shipments: [
        { shipmentNumber: 'SHP-20001', deliveryStatus: 'DELIVERY_FAILED', carrierName: 'Ecom Express', trackingReference: 'ECM2000100001', estimatedDeliveryDate: daysAgo(5), attemptCount: 3, lastFailureReason: 'Incorrect phone number on file' },
      ],
      events: [
        { eventNumber: 'EVT-20001', eventType: 'DELIVERY_ATTEMPT', eventStatus: 'RECORDED', description: 'First attempt: customer not reachable by phone.', failureReason: 'Phone unreachable', attemptNumber: 1, customerContacted: false, priority: 'MEDIUM' },
        { eventNumber: 'EVT-20002', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Second attempt: wrong address number on building.', failureReason: 'Address mismatch', attemptNumber: 2, customerContacted: true, priority: 'HIGH' },
        { eventNumber: 'EVT-20003', eventType: 'DELIVERY_FAILED', eventStatus: 'RECORDED', description: 'Third attempt: could not reach customer, incorrect phone number on file.', failureReason: 'Incorrect phone number on file', attemptNumber: 3, customerContacted: false, priority: 'URGENT' },
        { eventNumber: 'EVT-20004', eventType: 'OTHER', eventStatus: 'OPEN', description: 'Unresolved: three delivery attempts failed. Customer contact information may be incorrect. Awaiting resolution.', priority: 'URGENT' },
      ],
    },
  ];

  let totalShipments = 0;
  let totalEvents = 0;
  let totalEscalations = 0;

  for (const def of orderDefs) {
    // Upsert order
    const order = await prisma.order.upsert({
      where: { orderNumber: def.orderNumber },
      update: {},
      create: {
        orderNumber: def.orderNumber,
        customerId: def.customerId,
        shippingAddressId: def.shippingAddressId,
        orderStatus: def.orderStatus,
        paymentMethod: def.paymentMethod,
        paymentStatus: def.paymentStatus,
        totalAmount: def.totalAmount,
        placedAt: def.placedAt,
      },
    });

    // Upsert items
    for (const item of def.items) {
      const existing = await prisma.orderItem.findFirst({
        where: { orderId: order.id, productName: item.productName },
      });
      if (!existing) {
        await prisma.orderItem.create({
          data: { orderId: order.id, ...item },
        });
      }
    }

    // Upsert shipments
    const shipmentMap = {};
    for (const ship of def.shipments) {
      const s = await prisma.shipment.upsert({
        where: { shipmentNumber: ship.shipmentNumber },
        update: {},
        create: {
          shipmentNumber: ship.shipmentNumber,
          orderId: order.id,
          deliveryStatus: ship.deliveryStatus,
          carrierName: ship.carrierName,
          trackingReference: ship.trackingReference,
          estimatedDeliveryDate: ship.estimatedDeliveryDate || null,
          actualDeliveryAt: ship.actualDeliveryAt || null,
          attemptCount: ship.attemptCount || 0,
          lastFailureReason: ship.lastFailureReason || null,
        },
      });
      shipmentMap[ship.shipmentNumber] = s;
      totalShipments++;
    }

    // Upsert events
    for (let i = 0; i < def.events.length; i++) {
      const evt = def.events[i];
      // Determine shipment link
      let shipmentId = null;
      if (evt.shipmentIdx !== undefined && def.shipments[evt.shipmentIdx]) {
        shipmentId = shipmentMap[def.shipments[evt.shipmentIdx].shipmentNumber]?.id || null;
      } else if (def.shipments.length === 1) {
        const sNum = def.shipments[0].shipmentNumber;
        shipmentId = shipmentMap[sNum]?.id || null;
      }

      await prisma.deliveryEvent.upsert({
        where: { eventNumber: evt.eventNumber },
        update: {},
        create: {
          eventNumber: evt.eventNumber,
          orderId: order.id,
          shipmentId,
          eventType: evt.eventType,
          eventStatus: evt.eventStatus,
          description: evt.description,
          failureReason: evt.failureReason || null,
          attemptNumber: evt.attemptNumber || null,
          customerContacted: evt.customerContacted ?? null,
          priority: evt.priority || 'MEDIUM',
          preferredDeliveryDate: evt.preferredDeliveryDate || null,
          resolutionNotes: evt.resolutionNotes || null,
        },
      });
      totalEvents++;
    }

    // Upsert escalation if present
    if (def.escalation) {
      const esc = def.escalation;
      // Find the delivery event to link
      let deliveryEventId = null;
      if (def.events.length > 0) {
        const lastEvt = await prisma.deliveryEvent.findUnique({
          where: { eventNumber: def.events[def.events.length - 1].eventNumber },
        });
        if (lastEvt) deliveryEventId = lastEvt.id;
      }

      await prisma.escalation.upsert({
        where: { escalationNumber: esc.escalationNumber },
        update: {},
        create: {
          escalationNumber: esc.escalationNumber,
          orderId: order.id,
          deliveryEventId,
          reason: esc.reason,
          priority: esc.priority,
          status: esc.status,
        },
      });
      totalEscalations++;
    }
  }

  // ─── Verification ─────────────────────────────────────────────────────────
  const orderCount = await prisma.order.count();
  if (orderCount !== 20) {
    console.error(`❌ Expected exactly 20 orders, found ${orderCount}`);
    process.exit(1);
  }

  const customerCount = await prisma.customer.count();
  const shipmentCount = await prisma.shipment.count();
  const eventCount = await prisma.deliveryEvent.count();
  const escalationCount = await prisma.escalation.count();

  console.log('\n═══════════════════════════════════════');
  console.log('  🌱 SEED SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`  Customers:       ${customerCount}`);
  console.log(`  Addresses:       ${seededAddresses.length}`);
  console.log(`  Orders:          ${orderCount}`);
  console.log(`  Shipments:       ${shipmentCount}`);
  console.log(`  Delivery Events: ${eventCount}`);
  console.log(`  Escalations:     ${escalationCount}`);
  console.log('═══════════════════════════════════════');
  console.log('✅ Seeding complete — exactly 20 orders verified.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
