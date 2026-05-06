// Apps can run on different environments: 'development', 'staging', 'production'

export const isProduction = import.meta.env.NEXT_PUBLIC_APP_ENV === 'production';
export const isStaging = import.meta.env.NEXT_PUBLIC_APP_ENV === 'staging';
export const isDemo = import.meta.env.NEXT_PUBLIC_APP_ENV === 'demo';
export const isDevelopment = import.meta.env.DEV;

export const environment = import.meta.env.NEXT_PUBLIC_APP_ENV || (import.meta.env.DEV ? 'development' : 'production');
