import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Share a rendered card as an image (share cards, starter-kit graphics). The
 * view is captured at its export size and handed to the system share sheet,
 * so it can go straight to WhatsApp Status. Status drops captions on image
 * shares, so the caption (with the link) is copied for pasting. Falls back to
 * sharing the caption alone where image sharing isn't available (web).
 */
export async function shareImage(view: RefObject<View | null>, size: { width: number; height: number }, caption: string, dialogTitle: string): Promise<'image' | 'text' | 'cancelled'> {
  await Clipboard.setStringAsync(caption).catch(() => undefined);
  if (Platform.OS !== 'web' && view.current && (await Sharing.isAvailableAsync())) {
    try {
      const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', width: size.width, height: size.height });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
      return 'image';
    } catch {
      /* fall through to text */
    }
  }
  const r = await Share.share({ message: caption });
  return r.action === Share.dismissedAction ? 'cancelled' : 'text';
}
