import {
  ExtractJwt,
  Strategy as JwtStrategy,
  type StrategyOptionsWithRequest,
} from "passport-jwt";
import { UnauthorizedException } from "../utils/catch-error.js";
import { ErrorCode } from "../enums/error-code.enum.js";
import { config } from "../../config/app.config.js";
import type { PassportStatic } from "passport";
import passport from "passport";
import { userService } from "../../modules/user/user.modue.js";

interface JwtPayload {
  userId: string;
  sessionId: string;
}

const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      const accessToken = req.cookies.accessToken;
      if (!accessToken) {
        throw new UnauthorizedException(
          "Unauthorized access token",
          ErrorCode.AUTH_TOKEN_NOT_FOUND,
        );
      }
      return accessToken;
    },
  ]),
  secretOrKey: config.JWT.SECRET,
  audience: ["user"],
  algorithms: ["HS256"],
  passReqToCallback: true,
};

export const setUpJwtStrategy = (password: PassportStatic) => {
  passport.use(
    new JwtStrategy(options, async (req, payload: JwtPayload, done) => {
      try {
        const user = await userService.findUserById(payload.userId);
        if (!user) {
          return done(null, false);
        }
        req.sessionId = payload.sessionId;
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }),
  );
};

export const authenticateJWT = passport.authenticate("jwt", { session: false });
