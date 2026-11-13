const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const openApiDocument = require('./docs/contracts/openapi.json');
const ApiError = require('./utils/ApiError');
const errorMiddleware = require('./middleware/error');
const { apiRateLimiter } = require('./middleware/rateLimit');
const systemRoutes = require('./routes/system');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '16kb' }));
app.use('/api/v1', apiRateLimiter);

app.use('/api/v1', systemRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.'));
});

app.use(errorMiddleware);

module.exports = app;
