import { describe, it, expect, beforeEach } from 'vitest';
import { login, logout } from '@/app/actions';
import { mockCookieStore } from './setup';

describe('Authentication Actions', () => {
  beforeEach(() => {
    mockCookieStore.clear();
  });

  describe('login', () => {
    it('authenticates successfully with valid admin credentials and sets session cookie', async () => {
      const formData = new FormData();
      formData.append('username', 'admin');
      formData.append('password', 'testpassword123');

      const result = await login(formData);

      expect(result.success).toBe(true);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'admin_session',
        'authenticated',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
      expect(mockCookieStore.store.get('admin_session')).toBe('authenticated');
    });

    it('rejects login with invalid username', async () => {
      const formData = new FormData();
      formData.append('username', 'wrong_user');
      formData.append('password', 'testpassword123');

      const result = await login(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(mockCookieStore.store.has('admin_session')).toBe(false);
    });

    it('rejects login with invalid password', async () => {
      const formData = new FormData();
      formData.append('username', 'admin');
      formData.append('password', 'wrong_password');

      const result = await login(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(mockCookieStore.store.has('admin_session')).toBe(false);
    });
  });

  describe('logout', () => {
    it('deletes the admin_session cookie', async () => {
      // Set existing session
      mockCookieStore.store.set('admin_session', 'authenticated');
      expect(mockCookieStore.store.get('admin_session')).toBe('authenticated');

      await logout();

      expect(mockCookieStore.delete).toHaveBeenCalledWith('admin_session');
      expect(mockCookieStore.store.has('admin_session')).toBe(false);
    });
  });
});
