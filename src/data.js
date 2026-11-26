import React from 'react';
export const REPO = {
  owner: 'acme-labs',
  name: 'shopflow',
  description: 'A full-stack e-commerce platform with a React storefront, Node API and Stripe payments.',
  stars: '12.4k',
  forks: '2.1k',
  language: 'TypeScript',
  files: 342,
  lines: '48.2k',
  contributors: 64
};

export const NODES = [
  {
    id: 'main',
    label: 'main.tsx',
    path: 'client/src/main.tsx',
    type: 'entry',
    x: 40,
    y: 220,
    summary: 'The front door of the web app. It mounts React into the page and wraps everything in the providers the app needs.',
    details: ['Creates the React root', 'Wraps the app with Router and Query providers', 'Loads global styles'],
    lines: 38
  },
  {
    id: 'app',
    label: 'App.tsx',
    path: 'client/src/App.tsx',
    type: 'component',
    x: 260,
    y: 120,
    summary: 'Decides which page to show for each URL. Think of it as the map of every screen in the store.',
    details: ['Defines all routes', 'Protects checkout and account pages', 'Lazy loads heavy pages'],
    lines: 112
  },
  {
    id: 'store',
    label: 'cartStore.ts',
    path: 'client/src/state/cartStore.ts',
    type: 'state',
    x: 260,
    y: 320,
    summary: 'Remembers what the shopper put in their cart, even after a page refresh.',
    details: ['addItem, removeItem, clearCart', 'Persists to localStorage', 'Calculates totals and discounts'],
    lines: 164
  },
  {
    id: 'api-client',
    label: 'apiClient.ts',
    path: 'client/src/lib/apiClient.ts',
    type: 'util',
    x: 500,
    y: 220,
    summary: 'A single helper that every screen uses to talk to the backend, so errors and login tokens are handled in one place.',
    details: ['Adds the auth token to requests', 'Retries failed calls once', 'Turns server errors into friendly messages'],
    lines: 87
  },
  {
    id: 'server',
    label: 'server.ts',
    path: 'server/src/server.ts',
    type: 'entry',
    x: 740,
    y: 120,
    summary: 'Starts the backend. It connects to the database, registers every route and begins listening for requests.',
    details: ['Boots Express', 'Connects to PostgreSQL', 'Registers middleware and routes'],
    lines: 74
  },
  {
    id: 'routes',
    label: 'routes/orders.ts',
    path: 'server/src/routes/orders.ts',
    type: 'route',
    x: 740,
    y: 320,
    summary: 'Handles everything about orders: creating one, listing past ones and updating their status.',
    details: ['POST /orders creates an order', 'GET /orders lists a user\'s orders', 'Validates every input before saving'],
    lines: 203
  },
  {
    id: 'auth',
    label: 'auth.middleware.ts',
    path: 'server/src/middleware/auth.ts',
    type: 'middleware',
    x: 980,
    y: 60,
    summary: 'A security guard for the API. It checks that the person making a request is really logged in.',
    details: ['Reads the JWT from the header', 'Rejects expired or fake tokens', 'Attaches the user to the request'],
    lines: 52
  },
  {
    id: 'payments',
    label: 'paymentService.ts',
    path: 'server/src/services/paymentService.ts',
    type: 'service',
    x: 980,
    y: 220,
    summary: 'Charges the customer\'s card through Stripe and records whether the payment worked.',
    details: ['Creates Stripe payment intents', 'Handles refunds', 'Listens for Stripe webhooks'],
    lines: 148
  },
  {
    id: 'db',
    label: 'schema.prisma',
    path: 'server/prisma/schema.prisma',
    type: 'database',
    x: 980,
    y: 380,
    summary: 'The blueprint of the database: every table, column and how tables connect to each other.',
    details: ['User, Product, Order, OrderItem models', 'Relations and indexes', 'Migration history lives beside it'],
    lines: 126
  }
];

export const EDGES = [
  { from: 'main', to: 'app' },
  { from: 'main', to: 'store' },
  { from: 'app', to: 'api-client' },
  { from: 'store', to: 'api-client' },
  { from: 'api-client', to: 'server' },
  { from: 'api-client', to: 'routes' },
  { from: 'server', to: 'auth' },
  { from: 'routes', to: 'auth' },
  { from: 'routes', to: 'payments' },
  { from: 'routes', to: 'db' },
  { from: 'payments', to: 'db' }
];

export const TYPE_META = {
  entry: { label: 'Entry point', color: '#22D3EE' },
  component: { label: 'Component', color: '#3B82F6' },
  state: { label: 'State', color: '#A78BFA' },
  util: { label: 'Utility', color: '#F59E0B' },
  route: { label: 'Route', color: '#10B981' },
  middleware: { label: 'Middleware', color: '#F43F5E' },
  service: { label: 'Service', color: '#EC4899' },
  database: { label: 'Database', color: '#94A3B8' }
};

export const TREE = [
  {
    name: 'client',
    type: 'folder',
    note: 'The React storefront customers see',
    children: [
      {
        name: 'src',
        type: 'folder',
        note: 'All the front-end source code',
        children: [
          { name: 'main.tsx', type: 'file', nodeId: 'main' },
          { name: 'App.tsx', type: 'file', nodeId: 'app' },
          { name: 'state', type: 'folder', note: 'Shared app memory', children: [{ name: 'cartStore.ts', type: 'file', nodeId: 'store' }] },
          { name: 'lib', type: 'folder', note: 'Helper code', children: [{ name: 'apiClient.ts', type: 'file', nodeId: 'api-client' }] },
          { name: 'pages', type: 'folder', note: 'One file per screen', children: [] }
        ]
      }
    ]
  },
  {
    name: 'server',
    type: 'folder',
    note: 'The Node API that powers the store',
    children: [
      {
        name: 'src',
        type: 'folder',
        note: 'All the back-end source code',
        children: [
          { name: 'server.ts', type: 'file', nodeId: 'server' },
          { name: 'routes', type: 'folder', note: 'API endpoints', children: [{ name: 'orders.ts', type: 'file', nodeId: 'routes' }] },
          { name: 'middleware', type: 'folder', note: 'Request checks', children: [{ name: 'auth.ts', type: 'file', nodeId: 'auth' }] },
          { name: 'services', type: 'folder', note: 'Business logic', children: [{ name: 'paymentService.ts', type: 'file', nodeId: 'payments' }] }
        ]
      },
      { name: 'prisma', type: 'folder', note: 'Database definition', children: [{ name: 'schema.prisma', type: 'file', nodeId: 'db' }] }
    ]
  },
  { name: 'docker-compose.yml', type: 'file', nodeId: null },
  { name: 'package.json', type: 'file', nodeId: null },
  { name: 'README.md', type: 'file', nodeId: null }
];

export const CODE_SNIPPETS = {
  main: `ReactDOM.createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);`,
  app: `<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/cart" element={<Cart />} />
  <Route element={<RequireAuth />}>
    <Route path="/checkout" element={<Checkout />} />
  </Route>
</Routes>`,
  store: `addItem: (product) =>
  set((state) => ({
    items: mergeItem(state.items, product),
    total: calcTotal(state.items),
  })),`,
  'api-client': `export async function request(path, options) {
  const res = await fetch(BASE + path, withAuth(options));
  if (!res.ok) throw await toFriendlyError(res);
  return res.json();
}`,
  server: `const app = express();
app.use(json());
app.use('/orders', ordersRouter);
await prisma.$connect();
app.listen(PORT);`,
  routes: `router.post('/', requireAuth, async (req, res) => {
  const order = await createOrder(req.user.id, req.body);
  await paymentService.charge(order);
  res.status(201).json(order);
});`,
  auth: `const token = req.headers.authorization?.split(' ')[1];
const user = verifyJwt(token);
if (!user) return res.status(401).end();
req.user = user;
next();`,
  payments: `const intent = await stripe.paymentIntents.create({
  amount: order.totalCents,
  currency: 'usd',
  metadata: { orderId: order.id },
});`,
  db: `model Order {
  id     String      @id @default(cuid())
  user   User        @relation(fields: [userId], references: [id])
  userId String
  items  OrderItem[]
}`
};

export const INSIGHTS = [
  { title: 'Clean separation', text: 'The client and server folders are fully independent, which makes each easy to understand on its own.' },
  { title: 'Orders are the hub', text: 'routes/orders.ts touches auth, payments and the database, so changes there carry the most risk.' },
  { title: 'Start reading here', text: 'Open main.tsx for the front end and server.ts for the back end. Everything else branches from those two files.' }
];
