import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return service health metadata', () => {
      const response = appController.getHealth();

      expect(response.status).toBe('ok');
      expect(response.docs).toBe('/docs');
      expect(response.apiPrefix).toBe('api/v1');
      expect(typeof response.timestamp).toBe('string');
    });
  });
});
