import { AuthService } from '../src/auth/auth.service.js';

jest.mock('../src/common/random-name.js', () => ({
  generateDisplayName: () => 'HappyOtter'
}));

describe('AuthService', () => {
  it('creates a new anonymous user when none exists', async () => {
    const prisma = {
      appUser: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-1', displayName: 'HappyOtter' })
      }
    } as any;

    const service = new AuthService(prisma);
    const user = await service.getOrCreateUser();

    expect(prisma.appUser.create).toHaveBeenCalled();
    expect(user).toEqual({ id: 'user-1', displayName: 'HappyOtter' });
  });

  it('returns existing user when cookie valid', async () => {
    const prisma = {
      appUser: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', displayName: 'HappyOtter' }),
        create: jest.fn()
      }
    } as any;

    const service = new AuthService(prisma);
    const user = await service.getOrCreateUser('user-1');

    expect(prisma.appUser.create).not.toHaveBeenCalled();
    expect(user).toEqual({ id: 'user-1', displayName: 'HappyOtter' });
  });
});
