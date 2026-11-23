import { useTranslations } from "next-intl";

import {
  type Copy,
  copyCardParts,
  copyDetailParts,
  type CopyDetailExtra,
  type CopyKind,
  type LostReason,
} from "@/model/copy/copy";

const SEPARATOR = " · ";

/** Pone en palabras lo que el modelo decide de una copia; la tienda y el detalle se muestran tal cual. */
export function useCopyText() {
  const t = useTranslations("copy");

  function kind(value: CopyKind): string {
    return t(`kinds.${value}`);
  }

  function extra(value: CopyDetailExtra): string {
    switch (value.type) {
      case "familyOwner":
        return t("familyOwner", { owner: value.owner });
      case "detail":
        return value.detail;
      case "lost":
        return t("noLonger");
    }
  }

  return {
    kind,
    lostReason: (value: LostReason): string => t(`lostReasons.${value}`),
    cardLabel(copy: Pick<Copy, "kind" | "storeName" | "kindDetail">): string {
      const parts = copyCardParts(copy);
      const second = parts.detail ?? (parts.kind ? kind(parts.kind) : null);
      return second ? `${parts.store}${SEPARATOR}${second}` : parts.store;
    },
    detailLabel(copy: Pick<Copy, "kind" | "familyOwner" | "kindDetail" | "lostAt">): string {
      const parts = copyDetailParts(copy);
      return parts.extra ? `${kind(parts.kind)}${SEPARATOR}${extra(parts.extra)}` : kind(parts.kind);
    },
  };
}
