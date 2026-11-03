import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { TokenPair } from '../types/auth.types';

import User from '../models/user.model';

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

interface AuthRegisterInput {
  username?: string;
  password?: string;
  role?: string;
  email?: string;
}

interface AuthLoginInput {
  username?: string;
  password?: string;
}

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId: string, role: string): TokenPair => {
  const payload1 = { id: userId, role };
  const options1 = { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions;
  const accessToken = jwt.sign(
    payload1 as jwt.JwtPayload,
    JWT_SECRET as jwt.Secret,
    options1
  ) as string;

  const payload2 = { id: userId, type: 'refresh' };
  const options2 = { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions;
  const refreshToken = jwt.sign(
    payload2 as jwt.JwtPayload,
    JWT_SECRET as jwt.Secret,
    options2
  ) as string;

  // Convert JWT_EXPIRES_IN to seconds (15m = 900s)
  const expiresInSeconds = JWT_EXPIRES_IN === '15m' ? 900 : parseInt(JWT_EXPIRES_IN, 10) || 900;

  return { accessToken, refreshToken, expiresIn: expiresInSeconds };
};

const register = async ({
  username,
  password,
  role,
  email,
}: AuthRegisterInput): Promise<Record<string, unknown>> => {
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw new Error('Username y password son requeridos');
  }

  const existing = await User.findOne({ username });
  if (existing) {
    throw new Error('El usuario ya existe');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    password: hashedPassword,
    role: role || 'user',
    email,
  });

  const userData = user.toJSON() as Record<string, unknown>;
  delete userData.password;
  return userData;
};

const login = async ({
  username,
  password,
}: AuthLoginInput): Promise<
  Record<string, unknown> & { accessToken: string; refreshToken: string }
> => {
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw new Error('Username y password son requeridos');
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new Error('No autorizado');
  }

  const valid = await bcrypt.compare(password, String(user.password));
  if (!valid) {
    throw new Error('No autorizado');
  }

  const userId = String(user._id);
  const { accessToken, refreshToken } = generateTokens(userId, String(user.role));

  // Store refresh token in database
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          token: refreshToken,
          createdAt: new Date(),
        },
      },
    }
  );

  const userData = user.toJSON() as Record<string, unknown>;
  delete userData.password;
  return { ...userData, accessToken, refreshToken };
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (
  refreshToken: string
): Promise<Record<string, unknown> & { accessToken: string; refreshToken: string }> => {
  if (!refreshToken) {
    throw new Error('Refresh token es requerido');
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET) as Record<string, unknown>;
  } catch (error) {
    throw new Error('Refresh token inválido o expirado');
  }

  if ((decoded.type as string) !== 'refresh') {
    throw new Error('Token inválido');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Get refresh tokens array
  const refreshTokens = (user.toJSON() as Record<string, unknown>).refreshTokens as Array<{
    token: string;
  }>;

  // Verify refresh token is in database (prevent token reuse)
  const storedToken = refreshTokens?.find((rt: { token: string }) => rt.token === refreshToken);

  if (!storedToken) {
    throw new Error('Refresh token no válido');
  }

  // Revoke old refresh token and generate new pair
  await User.updateOne(
    { _id: user._id },
    {
      $pull: {
        refreshTokens: { token: refreshToken },
      },
    }
  );

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    String(user._id),
    String(user.role)
  );

  // Store new refresh token
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          token: newRefreshToken,
          createdAt: new Date(),
        },
      },
    }
  );

  const userData = user.toJSON() as Record<string, unknown>;
  delete userData.password;
  return { ...userData, accessToken, refreshToken: newRefreshToken };
};

/**
 * Logout by revoking refresh token
 */
const logout = async (userId: string, refreshToken: string): Promise<void> => {
  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        refreshTokens: { token: refreshToken },
      },
    }
  );
};

export default { register, login, refreshAccessToken, logout, generateTokens };
