export default () => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || secret === 'replace_me' || secret.length < 32) {
    if (isProduction) {
      throw new Error(
        'FATAL: Insecure or missing JWT_SECRET in production! JWT_SECRET must be at least 32 characters long and not a default placeholder.',
      );
    }
  }

  return {
    jwt: {
      secret:
        secret && secret !== 'replace_me'
          ? secret
          : 'dev_secret_change_in_production_9f8e7d6c5b4a',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    },
  };
};
