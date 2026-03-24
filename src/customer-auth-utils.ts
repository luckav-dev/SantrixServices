import type {
  CustomerAuthProviderConfig,
  CustomerAuthProviderId,
  CustomerLoginConfig,
} from './site-config';

export function getEnabledCustomerAuthProviders(customerLogin: CustomerLoginConfig) {
  return customerLogin.providers.filter((provider) => provider.enabled);
}

export function getPrimaryCustomerAuthProvider(customerLogin: CustomerLoginConfig) {
  const enabledProviders = getEnabledCustomerAuthProviders(customerLogin);

  return (
    enabledProviders.find((provider) => provider.id === customerLogin.primaryProviderId) ??
    enabledProviders[0] ??
    customerLogin.providers.find((provider) => provider.id === customerLogin.primaryProviderId) ??
    customerLogin.providers[0] ??
    null
  );
}

export function buildCustomerProviderFallback(
  providerId: CustomerAuthProviderId,
): CustomerAuthProviderConfig {
  if (providerId === 'google') {
    return {
      id: 'google',
      enabled: true,
      label: 'Google',
      buttonLabel: 'Login via Google',
      iconClass: 'fa-brands fa-google',
    };
  }

  if (providerId === 'discord') {
    return {
      id: 'discord',
      enabled: true,
      label: 'Discord',
      buttonLabel: 'Login via Discord',
      iconClass: 'fa-brands fa-discord',
    };
  }

  return {
    id: 'fivem',
    enabled: true,
    label: 'Cfx.re',
    buttonLabel: 'Login via FiveM',
    logoSrc: '/media/6870ab2b-1626-4134-8069-9ae703b3219f.svg',
    logoAlt: 'FiveM Logo',
  };
}
