import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().optional(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  UPLOAD_DIR: Joi.string().default('uploads'),
  APP_NAME: Joi.string().default('ARIA Community API'),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  STRIPE_SUCCESS_URL: Joi.string()
    .uri()
    .default('http://localhost:3000/billing/success'),
  STRIPE_CANCEL_URL: Joi.string()
    .uri()
    .default('http://localhost:3000/billing/cancel'),
  STRIPE_BILLING_PORTAL_RETURN_URL: Joi.string()
    .uri()
    .default('http://localhost:3000/settings/billing'),
});
