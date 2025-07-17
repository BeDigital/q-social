import development from './development';
import staging from './staging';
import production from './production';

const configs = {
  development,
  staging,
  production,
};

type Environment = keyof typeof configs;

const getConfig = () => {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  const config = configs[env];

  if (!config) {
    throw new Error(`Invalid environment: ${env}`);
  }

  return config;
};

export default getConfig();
