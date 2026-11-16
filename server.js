require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const openApiDocument = require('./docs/contracts/openapi.json');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const publicVehicleRoutes = require('./routes/publicVehicles');
const providerVehicleRoutes = require('./routes/providerVehicles');
const providerBookingRoutes = require('./routes/providerBookings');
const providerRoutes = require('./routes/provider');
const adminProviderRoutes = require('./routes/adminProviders');
const providerLifecycleRoutes = require('./routes/providerLifecycle');

const app = express();
const PORT = process.env.PORT || 5003;

connectDB().catch(() => {
  console.error('MongoDB connection failed.');
  process.exit(1);
});

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.set('query parser', 'extended');
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Try again later.',
      });
    },
  }),
);

app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1', publicVehicleRoutes);
app.use('/api/v1/provider/vehicles', providerVehicleRoutes);
app.use('/api/v1/provider/bookings', providerBookingRoutes);
app.use('/api/v1/provider', providerRoutes);
app.use('/api/v1/admin', adminProviderRoutes);
app.use('/api/v1/admin/providers', providerLifecycleRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested resource was not found.',
  });
});

app.listen(PORT, () => {
  console.log(`Dobby API listening on port ${PORT}`);
});
