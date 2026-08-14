// Helpers para usar a Web Share API nativa do celular.
// Tanto o portal do cliente quanto o adestrador podem compartilhar fotos/links.

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && "share" in navigator;
}

export type ShareInput = {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
};

export async function nativeShare(input: ShareInput): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    const payload: ShareInput = { title: input.title, text: input.text, url: input.url };
    if (input.files && input.files.length > 0 && "canShare" in navigator) {
      const nav = navigator as unknown as { canShare: (data: { files: File[] }) => boolean };
      if (nav.canShare({ files: input.files })) {
        payload.files = input.files;
      }
    }
    await (navigator as unknown as { share: (data: ShareInput) => Promise<void> }).share(payload);
    return true;
  } catch {
    return false;
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
  }
  return Promise.resolve(false);
}
