import jwt from "jsonwebtoken";
import type { SignOptions, VerifyOptions } from "jsonwebtoken";
import type { SessionDocument } from "../../database/models/session.model.js";
import type { UserDocument } from "../../database/models/user.model.js";
import { config } from "../../config/app.config.js";

export type AccessTPayload = {
  userId: UserDocument["_id"];
  sessionId: SessionDocument["_id"];
};
export type RefreshTPayload = {
  sessionId: SessionDocument["_id"];
};

type SignOptsAndSecret = SignOptions & {
  secret: string;
};

const signDefaults: SignOptions = {
  audience: ["user"],
};

const verifyDefaults: VerifyOptions = {
  audience: ["user"],
};

export const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: config.JWT.EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
  secret: config.JWT.SECRET,
};

export const refreshTokenSignOptions: SignOptsAndSecret = {
  expiresIn: config.JWT.REFRESH_EXPIRES_IN as NonNullable<
    SignOptions["expiresIn"]
  >,
  secret: config.JWT.REFRESH_SECRET,
};

export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options?: SignOptsAndSecret,
): string => {
  const { secret, ...signOptions } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret || config.JWT.SECRET, {
    ...signDefaults,
    ...signOptions,
  });
};

export const verifyJwtToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options?: VerifyOptions & { secret: string },
): { payload: TPayload } | { error: string } => {
  try {
    const { secret = config.JWT.SECRET, ...opts } = options || {};
    const payload = jwt.verify(token, secret, {
      ...verifyDefaults,
      ...opts,
    }) as unknown as TPayload;
    return { payload };
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};
