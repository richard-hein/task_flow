import type { RefreshTPayload } from "../../common/utils/jwt.js";
import jwt from "jsonwebtoken";
import { ErrorCode } from "../../common/enums/error-code.enum.js";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "../../common/interface/auth.interface.js";
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-error.js";
import {
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  threeMinutesAgo,
} from "../../common/utils/date-time.js";
import SessionModel from "../../database/models/session.model.js";
import UserModel from "../../database/models/user.model.js";
import VerificationCodeModel from "../../database/models/verification.model.js";
import { config } from "../../config/app.config.js";
import {
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} from "../../common/utils/jwt.js";
import { sendEmail } from "../../mailers/mailer.js";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "../../mailers/templates/template.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { hashValue } from "../../common/utils/bcrypt.js";

export class AuthService {
  // Register
  public async register(registerData: RegisterDto) {
    const { name, email, password } = registerData;
    const existingUser = await UserModel.exists({ email });

    if (existingUser) {
      throw new BadRequestException(
        "User already exists with this email",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }
    const newUser = await UserModel.create({
      name,
      email,
      password,
    });

    const userId = newUser._id;
    const verification = await VerificationCodeModel.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });

    // Sending verification email link
    const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verification.code}`;
    await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    return {
      user: newUser,
    };
  }

  // Login
  public async login(loginData: LoginDto) {
    const { email, password, userAgent } = loginData;
    const user = await UserModel.findOne({
      email,
    });
    if (!user) {
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND,
      );
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new BadRequestException(
        "Invalid email or password provide",
        ErrorCode.AUTH_USER_NOT_FOUND,
      );
    }
    // Check if the user enable 2fa return user =null
    if (user.userPreferences.enable2FA) {
      return {
        user: null,
        mfaRequired: true,
        accessToken: "",
        refreshToken: "",
      };
    }

    const session = await SessionModel.create({
      userId: user._id,
      userAgent,
    });
    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken({
      sessionId: session._id,
    });

    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  // Refresh
  public async refreshToken(refreshToken: string) {
    const { payload } = verifyJwtToken<RefreshTPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });
    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();
    if (session?.expiredAt.getTime() <= now) {
      throw new UnauthorizedException("Session expired");
    }
    const sessionRefresh = session?.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

    if (sessionRefresh) {
      session.expiredAt = calculateExpirationDate(
        config.JWT.REFRESH_EXPIRES_IN,
      );
    }
    await session.save();

    const newRefreshToken = sessionRefresh
      ? signJwtToken(
          {
            sessionId: session._id,
          },
          refreshTokenSignOptions,
        )
      : undefined;
    const accessToken = signJwtToken(
      {
        sessionId: session?._id,
      },
      refreshTokenSignOptions,
    );
    return {
      accessToken,
      newRefreshToken,
    };
  }

  // Verify Email
  public async verifyEmail(code: string) {
    const validCode = await VerificationCodeModel.findOne({
      code: code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new BadRequestException("Invalid or expired verification code");
    }
    const updateUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      { isEmailVerified: true },
      { new: true },
    );
    if (!updateUser) {
      throw new BadRequestException(
        "Unable to verify email address",
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await validCode.deleteOne();
    return {
      user: updateUser,
    };
  }
  // Forgot Password
  public async forgotPassword(email: string) {
    const user = await UserModel.findOne({
      email: email,
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // check mail rate limit is 2 emails per 3 or 10 mins
    const timeAgo = threeMinutesAgo();
    const maxAttempts = 2;
    const count = await VerificationCodeModel.countDocuments({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      createdAt: { $gt: timeAgo },
    });

    if (count >= maxAttempts) {
      throw new HttpException(
        "Too many reqquest, try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS,
      );
    }

    const expiresAt = anHourFromNow();
    const validCode = await VerificationCodeModel.create({
      userId: user._id,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt,
    });

    const resetLink = `${config.APP_ORIGIN}/reset-password?code=${validCode.code}&exp=${expiresAt.getTime()}`;

    const { data, error } = await sendEmail({
      to: user.email,
      ...passwordResetTemplate(resetLink),
    });
    if (!data?.id) {
      throw new InternalServerException(`${error?.name} ${error?.message}`);
    }

    return {
      url: resetLink,
      emailId: data.id,
    };
  }

  // Reset password
  public async resetPassword({ password, verificationCode }: ResetPasswordDto) {
    const validCode = await VerificationCodeModel.findOne({
      code: verificationCode,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt: { $gt: new Date() },
    });
    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code.");
    }
    const hashedPassword = await hashValue(password);
    const updateUser = await UserModel.findByIdAndUpdate(validCode.userId, {
      password: hashedPassword,
    });
    if (!updateUser) {
      throw new BadRequestException("Failed to reset password!");
    }
    await validCode.deleteOne();
    await SessionModel.deleteMany({
      userId: updateUser._id,
    });

    return {
      user: updateUser,
    };
  }

  // Logout
  public async logout(sessionId: string) {
    return await SessionModel.findByIdAndDelete(sessionId);
  }
}
