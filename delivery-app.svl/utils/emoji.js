import React, { useState, useEffect } from 'react';
import { Image, Platform, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * emojiToCodePoint(emoji)
 * Converts an emoji character to its Twemoji CDN URL.
 * Works with compound emoji (e.g. flags, skin-tones via ZWJ).
 *
 * @param {string} emoji — the raw emoji character(s)
 * @returns {string} — hex representation for CDN URL
 */
function emojiToCodePoint(emoji) {
  const codePoints = [];
  let i = 0;
  while (i < emoji.length) {
    const code = emoji.codePointAt(i);
    if (code !== 0xfe0f) {
      codePoints.push(code.toString(16).toLowerCase());
    }
    i += code > 0xffff ? 2 : 1;
  }
  return codePoints.join('-');
}

function twemojiUrl(emoji) {
  const cp = emojiToCodePoint(emoji.trim());
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${cp}.png`;
}

/**
 * useCachedEmoji(emoji)
 * Custom hook that caches the Twemoji CDN image locally using expo-file-system.
 * Returns local image path once cached, otherwise falls back to remote CDN URL.
 */
export function useCachedEmoji(emoji) {
  const remoteUrl = twemojiUrl(emoji);
  const [uri, setUri] = useState(remoteUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let isMounted = true;
    const cp = emojiToCodePoint(emoji.trim());
    const filename = `twemoji_${cp}.png`;
    const targetPath = `${FileSystem.cacheDirectory}${filename}`;

    async function checkAndDownload() {
      try {
        const info = await FileSystem.getInfoAsync(targetPath);
        if (info.exists) {
          if (isMounted) setUri(targetPath);
          return;
        }

        // Download to local cache
        const result = await FileSystem.downloadAsync(remoteUrl, targetPath);
        if (result.status === 200) {
          if (isMounted) setUri(targetPath);
        }
      } catch (err) {
        // Silently catch and rely on CDN URL
      }
    }

    checkAndDownload();

    return () => {
      isMounted = false;
    };
  }, [emoji]);

  return { uri, hasError, setHasError };
}

/**
 * <Emoji>
 * Renders an emoji using Twemoji PNG image (Android only) with local caching.
 * If downloading or loading fails, falls back to native text representation.
 * On iOS, always renders the native system emoji text.
 */
export function Emoji({ children, size = 20, style }) {
  const emojiStr = typeof children === 'string' ? children : String(children);
  const { uri, hasError, setHasError } = useCachedEmoji(emojiStr);

  if (Platform.OS !== 'android' || hasError) {
    return (
      <Text style={[{ fontSize: size, lineHeight: size + 4 }, style]}>
        {emojiStr}
      </Text>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={() => setHasError(true)}
    />
  );
}

export default Emoji;
