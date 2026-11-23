import { getRequestConfig } from "next-intl/server";

import { APP_TIME_ZONE } from "@/shared/clock";

import { getRequestLocale } from "./locale";
import { MESSAGES } from "./messages";

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();

  return { locale, messages: MESSAGES[locale], timeZone: APP_TIME_ZONE };
});
