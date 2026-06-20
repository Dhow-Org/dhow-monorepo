import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { generateNonce, SiweMessage } from "siwe";
import { PrismaService } from "../prisma/prisma.service";
import { AppConfigService } from "../config/config.service";

const NONCE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  /** Issue a single-use nonce for the client to embed in the SIWE message. */
  async createNonce(): Promise<{ nonce: string }> {
    const value = generateNonce();
    await this.prisma.nonce.create({ data: { value, expiresAt: new Date(Date.now() + NONCE_TTL_MS) } });
    return { nonce: value };
  }

  /** Verify a signed SIWE message against a live nonce and mint a JWT. */
  async verify(message: string, signature: string): Promise<{ token: string; address: string }> {
    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch {
      throw new UnauthorizedException("malformed SIWE message");
    }

    const nonce = await this.prisma.nonce.findUnique({ where: { value: siwe.nonce } });
    if (!nonce || nonce.consumedAt || nonce.expiresAt < new Date()) {
      throw new UnauthorizedException("invalid or expired nonce");
    }

    const result = await siwe.verify({ signature, nonce: siwe.nonce });
    if (!result.success) throw new UnauthorizedException("signature verification failed");

    await this.prisma.nonce.update({ where: { value: siwe.nonce }, data: { consumedAt: new Date() } });

    const address = siwe.address.toLowerCase();
    await this.prisma.sme.upsert({ where: { wallet: address }, update: {}, create: { wallet: address } });

    const token = await this.jwt.signAsync(
      { sub: address },
      { secret: this.config.get("JWT_SECRET"), expiresIn: this.config.get("JWT_EXPIRES_IN") },
    );
    return { token, address };
  }
}
