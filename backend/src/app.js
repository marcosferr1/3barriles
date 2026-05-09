const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const categoriesRoutes = require('./routes/categories.routes');
const suppliersRoutes = require('./routes/suppliers.routes');
const productsRoutes = require('./routes/products.routes');
const purchaseOrdersRoutes = require('./routes/purchaseOrders.routes');
const salesRoutes = require('./routes/sales.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const { requireAuth } = require('./middleware/auth');

require('dotenv').config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);

app.use(requireAuth);
app.use('/categories', categoriesRoutes);
app.use('/suppliers', suppliersRoutes);
app.use('/products', productsRoutes);
app.use('/purchase-orders', purchaseOrdersRoutes);
app.use('/sales', salesRoutes);
app.use('/dashboard', dashboardRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal error' });
});

module.exports = app;
