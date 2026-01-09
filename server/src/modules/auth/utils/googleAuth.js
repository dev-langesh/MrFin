const { OAuth2Client } = require("google-auth-library");
const { env } = require("../../../config/env");
const { AuthErrors } = require("../../../errors/authErrors");
const { AppError } = require("../../../utils/error");

const client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

async function getGoogleUser(code, codeVerifier) {
  try {
    const { tokens } = await client.getToken({ code, codeVerifier });
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      throw new AppError(AuthErrors.GOOGLE_EMAIL_NOT_VERIFIED);
    }

    return { googleId, email, name, picture };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(error);
    throw new AppError(AuthErrors.GOOGLE_AUTH_FAILED);
  }
}

module.exports = { getGoogleUser };
