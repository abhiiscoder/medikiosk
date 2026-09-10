/**
 * MEDiKIOSK Backend — Phase R3: Authentication & Session Service
 * Provides secure JWT session signing, verification, and user management with MongoDB.
 */

import crypto from 'node:crypto';
import { User, IUser, hashPassword } from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'medikiosk-auth-secret-key-sih-2026-secure';

export interface UserSessionData {
  token: string;
  userId: string;
  userName: string;
  medikioskId: string;
  mobileNumber?: string;
  role: string;
  expiresAt: string;
}

export interface TokenPayload {
  userId: string;
  medikioskId: string;
  name: string;
  role: string;
  exp: number;
}

export class AuthService {
  /**
   * Generates a base64url encoded standard HMAC-SHA256 JWT
   */
  public signToken(payload: Omit<TokenPayload, 'exp'>, expiresInDays: number = 7): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInDays * 86400;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies and decodes a JWT token. Returns null if invalid or expired.
   */
  public verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;

      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate user with MEDiKIOSK ID (and optional PIN / password)
   */
  public async login(
    medikioskId: string,
    passwordOrPin?: string
  ): Promise<UserSessionData> {
    const normalizedId = medikioskId.trim().toUpperCase();
    const user = await User.findOne({ medikioskId: normalizedId })
      .select('+passwordHash +salt');

    if (!user) {
      throw new AppError(`No account found with MEDiKIOSK ID '${normalizedId}'.`, 404, 'ACCOUNT_NOT_FOUND');
    }

    if (user.status !== 'active') {
      throw new AppError('This account is suspended.', 403, 'ACCOUNT_SUSPENDED');
    }

    // If account has a password/pin and one was provided, verify it
    if (user.passwordHash && passwordOrPin) {
      const valid = user.verifyPassword(passwordOrPin);
      if (!valid) {
        throw new AppError('Invalid PIN or password.', 401, 'INVALID_CREDENTIALS');
      }
    }

    const token = this.signToken({
      userId: user.userId,
      medikioskId: user.medikioskId,
      name: user.name,
      role: user.role
    });

    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    logger.info('User authenticated successfully', {
      userId: user.userId,
      medikioskId: user.medikioskId,
      role: user.role
    });

    return {
      token,
      userId: user.userId,
      userName: user.name,
      medikioskId: user.medikioskId,
      mobileNumber: user.mobileNumber,
      role: user.role,
      expiresAt
    };
  }

  /**
   * Register a new user account and persist in MongoDB
   */
  public async register(
    name: string,
    mobileNumber: string,
    passwordOrPin?: string,
    role: IUser['role'] = 'clinician'
  ): Promise<{ medikioskId: string; account: any; session: UserSessionData }> {
    const cleanName = name.trim();
    const cleanMobile = this.normalizeMobile(mobileNumber);

    if (!cleanName) {
      throw new AppError('Full name is required.', 400, 'INVALID_NAME');
    }
    if (cleanMobile.length < 10) {
      throw new AppError('A valid 10-digit mobile number is required.', 400, 'INVALID_MOBILE');
    }

    const existingUser = await User.findOne({ mobileNumber: cleanMobile });
    if (existingUser) {
      throw new AppError('An account with this mobile number already exists.', 409, 'MOBILE_ALREADY_REGISTERED');
    }

    // Generate unique MEDiKIOSK ID (e.g. MK-729184)
    let medikioskId = '';
    let exists = true;
    while (exists) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      medikioskId = `MK-${randomNum}`;
      const existing = await User.findOne({ medikioskId });
      if (!existing) exists = false;
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Hash password if provided
    let passwordHash: string | undefined;
    let salt: string | undefined;
    if (passwordOrPin) {
      const hashed = hashPassword(passwordOrPin);
      passwordHash = hashed.hash;
      salt = hashed.salt;
    }

    const newUser = await User.create({
      userId,
      medikioskId,
      name: cleanName,
      mobileNumber: cleanMobile,
      passwordHash,
      salt,
      role,
      status: 'active'
    });

    const token = this.signToken({
      userId: newUser.userId,
      medikioskId: newUser.medikioskId,
      name: newUser.name,
      role: newUser.role
    });

    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    const account = {
      medikioskId: newUser.medikioskId,
      name: newUser.name,
      mobileNumber: newUser.mobileNumber,
      role: newUser.role,
      createdAt: newUser.createdAt.toISOString()
    };

    const session: UserSessionData = {
      token,
      userId: newUser.userId,
      userName: newUser.name,
      medikioskId: newUser.medikioskId,
      mobileNumber: newUser.mobileNumber,
      role: newUser.role,
      expiresAt
    };

    logger.info('Registered new user account in MongoDB', {
      userId: newUser.userId,
      medikioskId: newUser.medikioskId
    });

    return {
      medikioskId: newUser.medikioskId,
      account,
      session
    };
  }

  /**
   * Find MEDiKIOSK ID by mobile number for ID recovery
   */
  public async findByMobile(
    mobileNumber: string
  ): Promise<{ medikioskId: string; name: string }> {
    const cleanMobile = this.normalizeMobile(mobileNumber);
    const user = await User.findOne({
      mobileNumber: { $regex: new RegExp(cleanMobile + '$') }
    });

    if (!user) {
      throw new AppError('No account found associated with this mobile number.', 404, 'ACCOUNT_NOT_FOUND');
    }

    return {
      medikioskId: user.medikioskId,
      name: user.name
    };
  }

  /**
   * Retrieve active session data for an authenticated user ID
   */
  public async getSession(userId: string): Promise<UserSessionData | null> {
    const user = await User.findOne({ userId, status: 'active' });
    if (!user) return null;

    const token = this.signToken({
      userId: user.userId,
      medikioskId: user.medikioskId,
      name: user.name,
      role: user.role
    });

    return {
      token,
      userId: user.userId,
      userName: user.name,
      medikioskId: user.medikioskId,
      mobileNumber: user.mobileNumber,
      role: user.role,
      expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString()
    };
  }

  /**
   * Seeds the default physician account in MongoDB if none exists
   */
  public async seedDefaultAccounts(): Promise<void> {
    try {
      const count = await User.countDocuments();
      if (count === 0) {
        const { hash, salt } = hashPassword('1234');
        await User.create({
          userId: 'user-clinician-001',
          medikioskId: 'MK-884102',
          name: 'Dr. Ananya Verma',
          mobileNumber: '9876543210',
          role: 'physician',
          passwordHash: hash,
          salt,
          status: 'active'
        });
        logger.info('Seeded default physician account in MongoDB (MK-884102 / Dr. Ananya Verma)');
      }
    } catch (err) {
      logger.warn('Error during default account check/seeding', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  private normalizeMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    return digits;
  }
}

export const authService = new AuthService();
