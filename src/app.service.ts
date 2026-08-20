import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: process.env.APP_NAME ?? 'ARIA Community API',
      status: 'ok',
      docs: '/docs',
      apiPrefix: process.env.API_PREFIX ?? 'api/v1',
      timestamp: new Date().toISOString(),
    };
  }
}
