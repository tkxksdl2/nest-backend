import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { JwtService } from './jwt.service';
import * as jwt from 'jsonwebtoken';

const TEST_KEY = 'test-key';
const TOKEN = 'token';
const DECODED = 'decoded-payload';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => TOKEN),
  verify: jest.fn(() => DECODED),
}));

describe('JwtService', () => {
  let service: JwtService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            privateKey: TEST_KEY,
          },
        },
      ],
    }).compile();
    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('sign', () => {
    it('should return a signed token', () => {
      const token = service.sign({ id: 1 });
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith({ id: 1 }, TEST_KEY);
      expect(token).toEqual(TOKEN);
    });
  });
  describe('verify', () => {
    it('should return the decoded token', () => {
      const payload = service.verify(TOKEN);
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledWith(TOKEN, TEST_KEY);
      expect(payload).toEqual(DECODED);
    });
  });
});
