import { render, renderHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import { MESSAGES } from "@/i18n/messages";
import type { Locale } from "@/model/account/locale";
import { APP_TIME_ZONE } from "@/shared/clock";

type IntlOptions = Readonly<{ locale?: Locale }>;

/** El mismo proveedor que arma el layout raíz, con el catálogo real del idioma pedido. */
function intlWrapper(locale: Locale) {
  return function IntlWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={APP_TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    );
  };
}

export function renderWithIntl(ui: ReactElement, { locale = "es", ...options }: IntlOptions & RenderOptions = {}) {
  return render(ui, { wrapper: intlWrapper(locale), ...options });
}

export function renderHookWithIntl<Result, Props>(
  hook: (props: Props) => Result,
  { locale = "es", ...options }: IntlOptions & RenderHookOptions<Props> = {},
) {
  return renderHook(hook, { wrapper: intlWrapper(locale), ...options });
}
